"""Clinical notes → HPO terms via scispacy (primary) + keyword matching (fallback).

Extraction strategy:
- scispacy + HPO entity linker: runs locally, <200ms, no API cost
- Keyword matching fallback: checks HPO term names against text, no API needed
"""

from __future__ import annotations

import re

from extractors.models import HPOTerm

_SCISPACY_THRESHOLD = 0.85
_SCISPACY_MIN_TERMS = 3


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
    """Match HPO term names against the clinical text using simple keyword search."""
    text_lower = text.lower()
    results: dict[str, HPOTerm] = {}
    for hpo_id, name in hpo_vocab:
        name_lower = name.lower()
        if len(name_lower) < 4:
            continue
        if re.search(r'\b' + re.escape(name_lower) + r'\b', text_lower):
            if hpo_id not in results:
                results[hpo_id] = HPOTerm(hpo_id=hpo_id, confidence=0.75, source=name)
    return list(results.values())


async def extract_notes(
    text: str,
    hpo_vocab: list[tuple[str, str]],
) -> list[HPOTerm]:
    scispacy_results = _scispacy_extractor.extract(text)
    high_confidence = [t for t in scispacy_results if t.confidence >= _SCISPACY_THRESHOLD]

    if len(high_confidence) >= _SCISPACY_MIN_TERMS:
        return high_confidence

    keyword_results = _keyword_match(text, hpo_vocab)

    merged: dict[str, HPOTerm] = {}
    for term in (*scispacy_results, *keyword_results):
        existing = merged.get(term.hpo_id)
        if existing is None or term.confidence > existing.confidence:
            merged[term.hpo_id] = term

    return list(merged.values())
