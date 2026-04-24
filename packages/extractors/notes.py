"""Clinical notes → HPO terms via scispacy (primary) + Claude NER (fallback).

Extraction strategy:
- scispacy + HPO entity linker: runs locally, <200ms, no API cost
- Claude API fallback: ~2-4s, used when scispacy returns <3 high-confidence terms
"""

from __future__ import annotations

import json
import os

import anthropic

from extractors.models import HPOTerm

_MODEL = "claude-sonnet-4-6"

_SYSTEM = """You are a clinical NLP assistant for rare disease diagnosis.

Extract all observable clinical findings from the given notes and map each to an HPO term.
Only use HPO IDs from the provided vocabulary. Return a JSON array — nothing else.

Each item:
  {"hpo_id": "HP:XXXXXXX", "confidence": 0.0-1.0, "source": "exact span from text"}

Rules:
- confidence 0.9–0.95 for explicitly stated findings
- confidence 0.6–0.8 for inferred or ambiguous findings
- skip normal/absent findings unless negation is clinically significant
- return [] if no findings map to HPO terms"""

# Confidence threshold: scispacy results at or above this are considered high-quality
_SCISPACY_THRESHOLD = 0.85
# Minimum number of high-confidence scispacy hits to skip Claude fallback
_SCISPACY_MIN_TERMS = 3


class ScispacyExtractor:
    """Local HPO extractor using scispacy + HPO entity linker.

    Lazy-loads the spacy model on first use so startup is not blocked.
    If scispacy is not installed, extract() returns [] and the caller
    falls through to the Claude API path.
    """

    def __init__(self) -> None:
        self._nlp = None
        self._available: bool | None = None  # None = untested yet

    def _load(self) -> bool:
        """Load the spacy pipeline. Returns True on success, False if unavailable."""
        try:
            import spacy  # noqa: PLC0415
            from scispacy.linking import EntityLinker  # noqa: PLC0415, F401

            nlp = spacy.load("en_core_sci_md")
            nlp.add_pipe(
                "scispacy_linker",
                config={"resolve_abbreviations": True, "linker_name": "hpo"},
            )
            self._nlp = nlp
            self._available = True
            return True
        except Exception:
            # spacy/scispacy not installed, or model not downloaded — silently degrade
            self._available = False
            return False

    def extract(self, text: str) -> list[HPOTerm]:
        """Return HPO terms extracted by scispacy, or [] if unavailable."""
        if self._available is False:
            return []
        if self._nlp is None:
            if not self._load():
                return []

        doc = self._nlp(text)
        results: list[HPOTerm] = []
        for ent in doc.ents:
            if ent._.kb_ents:
                hpo_id, score = ent._.kb_ents[0]  # top candidate
                if score >= _SCISPACY_THRESHOLD:
                    results.append(
                        HPOTerm(
                            hpo_id=hpo_id,
                            confidence=float(score),
                            source=ent.text,
                        )
                    )
        return results


# Module-level singleton — lazy-loaded on first extract call
_scispacy_extractor = ScispacyExtractor()


async def extract_notes(
    text: str,
    hpo_vocab: list[tuple[str, str]],  # [(hpo_id, term_name)]
) -> list[HPOTerm]:
    """Extract HPO terms from clinical notes.

    Primary path: scispacy + HPO entity linker (local, <200ms).
    Fallback path: Claude API (~2-4s) when scispacy returns fewer than
    _SCISPACY_MIN_TERMS high-confidence terms.  Results are merged and
    deduplicated by hpo_id, keeping the highest confidence score.
    """
    # --- Primary: scispacy ---
    scispacy_results = _scispacy_extractor.extract(text)
    high_confidence = [t for t in scispacy_results if t.confidence >= _SCISPACY_THRESHOLD]

    if len(high_confidence) >= _SCISPACY_MIN_TERMS:
        return high_confidence

    # --- Fallback: Claude API ---
    claude_results = await _extract_via_claude(text, hpo_vocab)

    # Merge: deduplicate by hpo_id, keep highest confidence
    merged: dict[str, HPOTerm] = {}
    for term in (*scispacy_results, *claude_results):
        existing = merged.get(term.hpo_id)
        if existing is None or term.confidence > existing.confidence:
            merged[term.hpo_id] = term

    return list(merged.values())


async def _extract_via_claude(
    text: str,
    hpo_vocab: list[tuple[str, str]],
) -> list[HPOTerm]:
    """Extract HPO terms using the Claude API (original implementation)."""
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    vocab_block = "\n".join(f"{hid}: {name}" for hid, name in hpo_vocab[:2000])
    system = f"{_SYSTEM}\n\nHPO vocabulary (top terms by clinical relevance):\n{vocab_block}"

    response = await client.messages.create(
        model=_MODEL,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": text}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        return []

    results: list[HPOTerm] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        hpo_id = item.get("hpo_id", "")
        if not hpo_id.startswith("HP:"):
            continue
        results.append(
            HPOTerm(
                hpo_id=hpo_id,
                confidence=max(0.0, min(1.0, float(item.get("confidence", 0.7)))),
                source=str(item.get("source", "")),
            )
        )
    return results
