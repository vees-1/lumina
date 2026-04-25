"""Clinical notes → HPO terms via scispaCy (primary) + Groq/Llama (fallback)."""

from __future__ import annotations

import json
import os
import re

from extractors.models import HPOTerm

_SCISPACY_THRESHOLD = 0.85
_SCISPACY_MIN_TERMS = 3

_GROQ_MODEL = "llama-3.3-70b-versatile"

_SYSTEM = """You are a clinical NLP assistant for rare disease diagnosis.
Extract all observable clinical findings from the given notes and map each to an HPO term.
Only use HPO IDs from the provided vocabulary. Return a JSON array — nothing else.

Each item: {"hpo_id": "HP:XXXXXXX", "confidence": 0.0-1.0, "source": "exact span from text"}

Rules:
- confidence 0.9–0.95 for explicitly stated findings
- confidence 0.6–0.8 for inferred or ambiguous findings
- skip normal/absent findings
- return [] if no findings map to HPO terms"""


class ScispacyExtractor:
    def __init__(self) -> None:
        self._nlp = None
        self._available: bool | None = None

    def _load(self) -> bool:
        try:
            import spacy
            from scispacy.linking import EntityLinker  # noqa: F401

            nlp = spacy.load("en_core_sci_lg")
            nlp.add_pipe(
                "scispacy_linker",
                config={"resolve_abbreviations": True, "linker_name": "hpo"},
            )
            self._nlp = nlp
            self._available = True
            return True
        except Exception:
            self._available = False
            return False

    def extract(self, text: str) -> list[HPOTerm]:
        if self._available is False:
            return []
        if self._nlp is None:
            if not self._load():
                return []
        doc = self._nlp(text)
        results: list[HPOTerm] = []
        for ent in doc.ents:
            if ent._.kb_ents:
                hpo_id, score = ent._.kb_ents[0]
                if score >= _SCISPACY_THRESHOLD:
                    results.append(HPOTerm(hpo_id=hpo_id, confidence=float(score), source=ent.text))
        return results


_scispacy_extractor = ScispacyExtractor()


def _keyword_match(text: str, hpo_vocab: list[tuple[str, str]]) -> list[HPOTerm]:
    text_lower = text.lower()
    results: dict[str, HPOTerm] = {}
    for hpo_id, name in hpo_vocab:
        if len(name) < 4:
            continue
        if re.search(r'\b' + re.escape(name.lower()) + r'\b', text_lower):
            if hpo_id not in results:
                results[hpo_id] = HPOTerm(hpo_id=hpo_id, confidence=0.7, source=name)
    return list(results.values())


async def _extract_via_groq(text: str, hpo_vocab: list[tuple[str, str]]) -> list[HPOTerm]:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return []
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=api_key)
        vocab_block = "\n".join(f"{hid}: {name}" for hid, name in hpo_vocab[:300])
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
                confidence=max(0.0, min(1.0, float(item.get("confidence", 0.7)))),
                source=str(item.get("source", "")),
            ))
        return results
    except Exception:
        return []


async def extract_notes(
    text: str,
    hpo_vocab: list[tuple[str, str]],
) -> list[HPOTerm]:
    # Primary: scispaCy + HPO entity linker
    scispacy_results = _scispacy_extractor.extract(text)
    high_confidence = [t for t in scispacy_results if t.confidence >= _SCISPACY_THRESHOLD]

    if len(high_confidence) >= _SCISPACY_MIN_TERMS:
        return high_confidence

    # Fallback: Groq + Llama 3.3 70B
    groq_results = await _extract_via_groq(text, hpo_vocab)

    if not groq_results:
        # Last resort: keyword matching
        groq_results = _keyword_match(text, hpo_vocab)

    # Merge scispaCy + fallback, keep highest confidence per HPO ID
    merged: dict[str, HPOTerm] = {}
    for term in (*scispacy_results, *groq_results):
        existing = merged.get(term.hpo_id)
        if existing is None or term.confidence > existing.confidence:
            merged[term.hpo_id] = term

    return list(merged.values())
