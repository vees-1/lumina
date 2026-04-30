"""Disease ranker: given HPO query terms, returns top-k ranked diseases.

Usage:
    index = ScoringIndex.load()          # loads DB into memory once
    results = index.rank(query_terms)    # fast in-memory scoring

query_terms may be either:
- list of (hpo_id, confidence)
- list of objects exposing hpo_id/confidence and optional source/assertion
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

from ingest.db import get_engine
from ingest.models import Disease, DiseasePhenotype, HPOAncestor, HPOTerm
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from scoring.similarity import jaccard, lin


class RankTermContext(BaseModel):
    hpo_id: str
    label: str = ""
    frequency: float | None = None
    patient_confidence: float | None = None
    source: str | None = None
    assertion: Literal["present", "absent"] | None = None
    matched_hpo_id: str | None = None
    matched_label: str | None = None


class RankResult(BaseModel):
    orpha_code: int
    name: str
    score: float
    confidence: float  # calibrated 0–100
    contributing_terms: list[str]  # HPO IDs that drove the score most
    missing_terms: list[str] = Field(default_factory=list)
    distinguishing_terms: list[str] = Field(default_factory=list)
    contributing_term_details: list[RankTermContext] = Field(default_factory=list)
    missing_term_details: list[RankTermContext] = Field(default_factory=list)
    distinguishing_term_details: list[RankTermContext] = Field(default_factory=list)


@dataclass(frozen=True)
class QueryTermContext:
    hpo_id: str
    confidence: float
    source: str = ""
    assertion: Literal["present", "absent"] = "present"


@dataclass
class ScoringIndex:
    ic: dict[str, float]
    ancestors: dict[str, frozenset[str]]
    disease_phenotypes: dict[int, list[tuple[str, float]]]
    disease_names: dict[int, str]
    hpo_names: dict[str, str]

    @classmethod
    def load(cls, db_path=None) -> ScoringIndex:
        engine = get_engine(db_path) if db_path else get_engine()

        with Session(engine) as session:
            ic: dict[str, float] = {}
            hpo_names: dict[str, str] = {}
            for term in session.exec(select(HPOTerm)):
                hpo_names[term.hpo_id] = term.name
                if term.ic is not None and term.ic > 0:
                    ic[term.hpo_id] = term.ic

            raw_ancestors: dict[str, list[str]] = {}
            for row in session.exec(select(HPOAncestor)):
                raw_ancestors.setdefault(row.hpo_id, []).append(row.ancestor_id)
            ancestors: dict[str, frozenset[str]] = {
                hpo_id: frozenset(ancs + [hpo_id])
                for hpo_id, ancs in raw_ancestors.items()
            }
            for hpo_id in hpo_names:
                ancestors.setdefault(hpo_id, frozenset([hpo_id]))

            disease_phenotypes: dict[int, list[tuple[str, float]]] = {}
            for dp in session.exec(select(DiseasePhenotype)):
                if dp.frequency_weight == 0.0:
                    continue
                disease_phenotypes.setdefault(dp.orpha_code, []).append(
                    (dp.hpo_id, dp.frequency_weight)
                )

            disease_names: dict[int, str] = {
                d.orpha_code: d.name for d in session.exec(select(Disease))
            }

        return cls(
            ic=ic,
            ancestors=ancestors,
            disease_phenotypes=disease_phenotypes,
            disease_names=disease_names,
            hpo_names=hpo_names,
        )

    def _term_score(
        self,
        query_id: str,
        disease_terms: list[tuple[str, float]],
    ) -> tuple[float, str]:
        best_score = 0.0
        best_match = ""
        for pheno_id, freq_weight in disease_terms:
            q_has_ic = query_id in self.ic and self.ic[query_id] > 0
            p_has_ic = pheno_id in self.ic and self.ic[pheno_id] > 0
            if q_has_ic or p_has_ic:
                sim = lin(query_id, pheno_id, self.ic, self.ancestors)
            else:
                sim = jaccard(query_id, pheno_id, self.ancestors)
            weighted = sim * freq_weight
            if weighted > best_score:
                best_score = weighted
                best_match = pheno_id
        return best_score, best_match

    def _query_term_contexts(
        self,
        query: Sequence[tuple[str, float] | object],
    ) -> list[QueryTermContext]:
        contexts: list[QueryTermContext] = []
        for item in query:
            if isinstance(item, tuple):
                hpo_id, confidence = item
                source = ""
                assertion: Literal["present", "absent"] = (
                    "absent" if confidence < 0 else "present"
                )
            else:
                hpo_id = getattr(item, "hpo_id", "")
                confidence = float(getattr(item, "confidence", 0.0))
                source = str(getattr(item, "source", "") or "")
                assertion = getattr(item, "assertion", None) or (
                    "absent" if confidence < 0 else "present"
                )
            if hpo_id:
                contexts.append(
                    QueryTermContext(
                        hpo_id=hpo_id,
                        confidence=confidence,
                        source=source,
                        assertion=assertion,
                    )
                )
        return contexts

    def _best_query_match(
        self,
        disease_hpo_id: str,
        query_terms: Sequence[QueryTermContext],
        *,
        assertions: set[Literal["present", "absent"]] | None = None,
    ) -> tuple[float, QueryTermContext | None]:
        best_score = 0.0
        best_term: QueryTermContext | None = None
        for term in query_terms:
            if assertions is not None and term.assertion not in assertions:
                continue
            q_has_ic = term.hpo_id in self.ic and self.ic[term.hpo_id] > 0
            p_has_ic = disease_hpo_id in self.ic and self.ic[disease_hpo_id] > 0
            if q_has_ic or p_has_ic:
                sim = lin(term.hpo_id, disease_hpo_id, self.ic, self.ancestors)
            else:
                sim = jaccard(term.hpo_id, disease_hpo_id, self.ancestors)
            weighted = sim * abs(term.confidence)
            if weighted > best_score:
                best_score = weighted
                best_term = term
        return best_score, best_term

    def _context_term(
        self,
        hpo_id: str,
        *,
        frequency: float | None = None,
        query_term: QueryTermContext | None = None,
        matched_hpo_id: str | None = None,
    ) -> RankTermContext:
        return RankTermContext(
            hpo_id=hpo_id,
            label=self.hpo_names.get(hpo_id, ""),
            frequency=round(frequency, 3) if frequency is not None else None,
            patient_confidence=query_term.confidence if query_term is not None else None,
            source=query_term.source if query_term is not None else None,
            assertion=query_term.assertion if query_term is not None else None,
            matched_hpo_id=matched_hpo_id,
            matched_label=self.hpo_names.get(matched_hpo_id, "") if matched_hpo_id else None,
        )

    def rank(
        self,
        query: Sequence[tuple[str, float] | object],
        top_k: int = 5,
    ) -> list[RankResult]:
        if not query:
            return []

        query_terms = [
            term for term in self._query_term_contexts(query)
            if term.hpo_id in self.ancestors
        ]
        if not query_terms:
            return []

        positive_query = [term for term in query_terms if term.confidence > 0]
        if not positive_query:
            return []

        positive_ids = {term.hpo_id for term in positive_query}
        scores: list[tuple[int, float, list[str], list[RankTermContext]]] = []

        for orpha_code, disease_terms in self.disease_phenotypes.items():
            term_scores: list[tuple[float, str]] = []
            contributing_details: dict[str, RankTermContext] = {}

            for query_term in positive_query:
                sim, best_match = self._term_score(query_term.hpo_id, disease_terms)
                term_scores.append((sim * query_term.confidence, best_match))
                if best_match and best_match not in contributing_details:
                    contributing_details[best_match] = self._context_term(
                        best_match,
                        query_term=query_term,
                        matched_hpo_id=query_term.hpo_id,
                    )

            if not term_scores:
                continue

            raw_score = sum(score for score, _ in term_scores) / len(positive_query)

            if any(term.confidence < 0 for term in query_terms):
                penalty = 0.0
                for pheno_id, freq_weight in disease_terms:
                    sim, neg_term = self._best_query_match(
                        pheno_id,
                        query_terms,
                        assertions={"absent"},
                    )
                    if sim > 0 and neg_term is not None:
                        penalty += freq_weight * sim * 0.45
                raw_score = max(0.0, raw_score - penalty / len(positive_query))

            contributing = list(dict.fromkeys(match for _, match in sorted(term_scores, reverse=True) if match))[:5]
            scores.append(
                (
                    orpha_code,
                    raw_score,
                    contributing,
                    [contributing_details[hpo_id] for hpo_id in contributing if hpo_id in contributing_details],
                )
            )

        scores.sort(key=lambda item: item[1], reverse=True)
        top = scores[:top_k]
        max_score = top[0][1] if top else 1.0

        all_top_phenos: dict[int, set[str]] = {}
        for orpha_code, _, _, _ in top:
            all_top_phenos[orpha_code] = {
                pid for pid, fw in self.disease_phenotypes.get(orpha_code, []) if fw > 0.3
            }

        results = []
        for orpha_code, raw_score, contributing, contributing_details in top:
            disease_terms = self.disease_phenotypes.get(orpha_code, [])
            disease_sorted = sorted(disease_terms, key=lambda item: item[1], reverse=True)

            missing_details: list[RankTermContext] = []
            for pid, fw in disease_sorted:
                if fw <= 0.5 or pid in contributing:
                    continue
                pos_sim, _ = self._best_query_match(pid, query_terms, assertions={"present"})
                if pos_sim >= 0.35 or pid in positive_ids:
                    continue
                neg_sim, neg_term = self._best_query_match(pid, query_terms, assertions={"absent"})
                missing_details.append(
                    self._context_term(
                        pid,
                        frequency=fw,
                        query_term=neg_term if neg_sim > 0 else None,
                    )
                )
                if len(missing_details) >= 5:
                    break
            missing_terms = [detail.hpo_id for detail in missing_details]

            other_phenos: set[str] = set()
            for other_orpha, other_set in all_top_phenos.items():
                if other_orpha != orpha_code:
                    other_phenos |= other_set
            distinguishing_details = [
                self._context_term(pid, frequency=fw)
                for pid, fw in disease_sorted
                if fw > 0.4 and pid not in other_phenos
            ][:3]
            distinguishing_terms = [detail.hpo_id for detail in distinguishing_details]

            results.append(
                RankResult(
                    orpha_code=orpha_code,
                    name=self.disease_names.get(orpha_code, "Unknown"),
                    score=round(raw_score, 4),
                    confidence=round(_calibrate(raw_score, max_score), 1),
                    contributing_terms=contributing,
                    missing_terms=missing_terms,
                    distinguishing_terms=distinguishing_terms,
                    contributing_term_details=contributing_details,
                    missing_term_details=missing_details,
                    distinguishing_term_details=distinguishing_details,
                )
            )
        return results


def _calibrate(raw: float, max_raw: float) -> float:
    if max_raw == 0:
        return 0.0
    return min(100.0, (raw / max_raw) * 100.0)
