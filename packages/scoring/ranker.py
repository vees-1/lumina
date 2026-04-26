"""Disease ranker: given HPO query terms, returns top-k ranked diseases.

Usage:
    index = ScoringIndex.load()          # loads DB into memory once
    results = index.rank(query_terms)    # fast in-memory scoring

query_terms: list of (hpo_id, confidence) — e.g. [("HP:0001250", 0.95), ...]
"""

from __future__ import annotations

from dataclasses import dataclass

from ingest.db import get_engine
from ingest.models import Disease, DiseasePhenotype, HPOAncestor, HPOTerm
from pydantic import BaseModel
from sqlmodel import Session, select

from scoring.similarity import jaccard, lin


class RankResult(BaseModel):
    orpha_code: int
    name: str
    score: float
    confidence: float  # calibrated 0–100
    contributing_terms: list[str]  # HPO IDs that drove the score most


@dataclass
class ScoringIndex:
    ic: dict[str, float]
    ancestors: dict[str, frozenset]
    disease_phenotypes: dict[int, list[tuple[str, float]]]
    disease_names: dict[int, str]

    @classmethod
    def load(cls, db_path=None) -> ScoringIndex:
        engine = get_engine(db_path) if db_path else get_engine()

        with Session(engine) as session:
            ic: dict[str, float] = {}
            for term in session.exec(select(HPOTerm)):
                if term.ic is not None and term.ic > 0:
                    ic[term.hpo_id] = term.ic

            raw_ancestors: dict[str, list[str]] = {}
            for row in session.exec(select(HPOAncestor)):
                raw_ancestors.setdefault(row.hpo_id, []).append(row.ancestor_id)
            ancestors: dict[str, frozenset] = {
                hpo_id: frozenset(ancs + [hpo_id])
                for hpo_id, ancs in raw_ancestors.items()
            }
            for hpo_id in ic:
                if hpo_id not in ancestors:
                    ancestors[hpo_id] = frozenset([hpo_id])

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
        )

    def _term_score(self, query_id: str, disease_terms: list[tuple[str, float]]) -> tuple[float, str]:
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

    def rank(
        self,
        query: list[tuple[str, float]],
        top_k: int = 5,
    ) -> list[RankResult]:
        if not query:
            return []

        valid_query = [(hpo_id, conf) for hpo_id, conf in query if hpo_id in self.ancestors]
        if not valid_query:
            return []

        scores: list[tuple[int, float, list[str]]] = []

        for orpha_code, disease_terms in self.disease_phenotypes.items():
            term_scores: list[tuple[float, str]] = []
            for query_id, confidence in valid_query:
                sim, best_match = self._term_score(query_id, disease_terms)
                term_scores.append((sim * confidence, best_match))

            if not term_scores:
                continue

            raw_score = sum(s for s, _ in term_scores) / len(term_scores)
            contributing = list(dict.fromkeys(m for _, m in sorted(term_scores, reverse=True) if m))[:5]
            scores.append((orpha_code, raw_score, contributing))

        scores.sort(key=lambda x: x[1], reverse=True)
        top = scores[:top_k]

        max_score = top[0][1] if top else 1.0

        results = []
        for orpha_code, raw_score, contributing in top:
            results.append(
                RankResult(
                    orpha_code=orpha_code,
                    name=self.disease_names.get(orpha_code, "Unknown"),
                    score=round(raw_score, 4),
                    confidence=round(_calibrate(raw_score, max_score), 1),
                    contributing_terms=contributing,
                )
            )
        return results


def _calibrate(raw: float, max_raw: float) -> float:
    if max_raw == 0:
        return 0.0
    return min(100.0, (raw / max_raw) * 100.0)
