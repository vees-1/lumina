"""Clinical notes -> HPO terms via Groq/Llama 3.3 70B."""

from __future__ import annotations

import json
import os
import re

from extractors.models import HPOTerm

_GROQ_MODEL = "llama-3.3-70b-versatile"

_SYSTEM = """You are a clinical NLP assistant for rare disease diagnosis.
Extract all observable clinical findings from the given notes and map each to an HPO term.
Only use HPO IDs from the provided vocabulary. Return a JSON array — nothing else.

Each item: {"hpo_id": "HP:XXXXXXX", "confidence": 0.0-1.0, "source": "exact span from text"}

Rules:
- confidence 0.9–0.95 for explicitly stated findings
- confidence 0.6–0.8 for inferred or ambiguous findings
- return [] if no findings map to HPO terms

Also identify explicitly NEGATED findings — symptoms the patient does NOT have.
Return them with a NEGATIVE confidence value (e.g. -0.8):
  {"hpo_id": "HP:0001250", "confidence": -0.8, "assertion": "absent", "source": "no seizures noted"}
Negation phrases to detect: "no", "without", "denies", "absent", "negative for", "not present", "rules out", "never had".
Only report negations that are clinically significant (not trivial negations like "no known allergies")."""

_NEGATION_PATTERNS = (
    r"\bno\b",
    r"\bwithout\b",
    r"\bdenies\b",
    r"\bdenied\b",
    r"\babsent\b",
    r"\bnegative for\b",
    r"\bnot present\b",
    r"\brules? out\b",
    r"\bnever had\b",
    r"\bfree of\b",
)

_POST_NEGATION_PATTERNS = (
    r"\bnot present\b",
    r"\babsent\b",
    r"\bnot seen\b",
    r"\bwas excluded\b",
)


def _source_snippet(text: str, start: int, end: int) -> str:
    left = max(text.rfind(".", 0, start), text.rfind("\n", 0, start), text.rfind(";", 0, start))
    right_candidates = [
        idx
        for idx in (text.find(".", end), text.find("\n", end), text.find(";", end))
        if idx != -1
    ]
    right = min(right_candidates) if right_candidates else len(text)
    snippet = text[left + 1:right].strip()
    return snippet or text[start:end].strip()


def _match_assertion(text_lower: str, start: int, end: int) -> str:
    prefix = text_lower[max(0, start - 80):start]
    suffix = text_lower[end:min(len(text_lower), end + 40)]
    for pattern in _NEGATION_PATTERNS:
        if re.search(pattern + r"(?:[\s,:-]+\w+){0,6}\s*$", prefix):
            return "absent"
    for pattern in _POST_NEGATION_PATTERNS:
        if re.search(r"^\s*(?:[\w,-]+\s+){0,4}" + pattern, suffix):
            return "absent"
    return "present"


def _keyword_match(text: str, hpo_vocab: list[tuple[str, str]]) -> list[HPOTerm]:
    text_lower = text.lower()
    results: dict[str, HPOTerm] = {}
    for hpo_id, name in hpo_vocab:
        if len(name) < 4:
            continue
        for match in re.finditer(r"\b" + re.escape(name.lower()) + r"\b", text_lower):
            assertion = _match_assertion(text_lower, match.start(), match.end())
            candidate = HPOTerm(
                hpo_id=hpo_id,
                confidence=-0.75 if assertion == "absent" else 0.7,
                source=_source_snippet(text, match.start(), match.end()),
                assertion=assertion,
                source_type="notes",
            )
            existing = results.get(hpo_id)
            if existing is None or abs(candidate.confidence) > abs(existing.confidence):
                results[hpo_id] = candidate
    return list(results.values())


async def _extract_via_groq(text: str, hpo_vocab: list[tuple[str, str]]) -> list[HPOTerm]:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return []
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=api_key)
        vocab_block = "\n".join(f"{hid}: {name}" for hid, name in hpo_vocab[:2000])
        system = f"{_SYSTEM}\n\nHPO vocabulary:\n{vocab_block}"
        response = await client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": text},
            ],
            max_tokens=1024,
            temperature=0.0,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        items = json.loads(raw)
        results = []
        for item in items:
            if not isinstance(item, dict):
                continue
            hpo_id = item.get("hpo_id", "")
            if not hpo_id.startswith("HP:"):
                continue
            results.append(HPOTerm(
                hpo_id=hpo_id,
                confidence=max(-1.0, min(1.0, float(item.get("confidence", 0.7)))),
                source=str(item.get("source", "")),
                assertion=item.get("assertion"),
                source_type="notes",
            ))
        return results
    except Exception:
        return []


async def extract_notes(
    text: str,
    hpo_vocab: list[tuple[str, str]],
) -> list[HPOTerm]:
    # Primary: Groq + Llama 3.3 70B
    groq_results = await _extract_via_groq(text, hpo_vocab)

    if groq_results:
        return groq_results

    # Fallback: keyword matching against HPO vocab
    return _keyword_match(text, hpo_vocab)
