"""Disease ranker: given HPO query terms, returns top-k ranked diseases.

Usage:
    index = ScoringIndex.load()          # loads DB into memory once
    results = index.rank(query_terms)    # fast in-memory scoring

query_terms: list of (hpo_id, confidence) — e.g. [("HP:0001250", 0.95), ...]
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ingest.db import get_engine
from ingest.models import Disease, DiseasePhenotype, HPOAncestor, HPOTerm
from pydantic import BaseModel
from sqlmodel import Session, select

from scoring.similarity import jaccard, lin

try:
    from scoring.ml_ranker import XGBoostRanker
except ImportError:
    XGBoostRanker = None  # type: ignore[assignment,misc]


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
    # {orpha_code: [(hpo_id, freq_weight)]}
    disease_phenotypes: dict[int, list[tuple[str, float]]]
    disease_names: dict[int, str]
    xgb: XGBoostRanker | None = field(default=None, repr=False)

    @classmethod
    def load(cls, db_path=None) -> ScoringIndex:
        engine = get_engine(db_path) if db_path else get_engine()

        with Session(engine) as session:
            # IC table
            ic: dict[str, float] = {}
            for term in session.exec(select(HPOTerm)):
                if term.ic is not None and term.ic > 0:
                    ic[term.hpo_id] = term.ic

            # Ancestor sets — include the term itself so sim(a,a) = IC(a)
            raw_ancestors: dict[str, list[str]] = {}
            for row in session.exec(select(HPOAncestor)):
                raw_ancestors.setdefault(row.hpo_id, []).append(row.ancestor_id)
            ancestors: dict[str, frozenset] = {
                hpo_id: frozenset(ancs + [hpo_id])
                for hpo_id, ancs in raw_ancestors.items()
            }
            # Terms with no recorded ancestors still need an entry
            for hpo_id in ic:
                if hpo_id not in ancestors:
                    ancestors[hpo_id] = frozenset([hpo_id])

            # Disease phenotypes
            disease_phenotypes: dict[int, list[tuple[str, float]]] = {}
            for dp in session.exec(select(DiseasePhenotype)):
                if dp.frequency_weight == 0.0:  # skip "Excluded"
                    continue
                disease_phenotypes.setdefault(dp.orpha_code, []).append(
                    (dp.hpo_id, dp.frequency_weight)
                )

            # Disease names
            disease_names: dict[int, str] = {
                d.orpha_code: d.name for d in session.exec(select(Disease))
            }

        # Attempt to load the XGBoost model; silently skip if not yet trained
        xgb_ranker = None
        if XGBoostRanker is not None:
            try:
                xgb_ranker = XGBoostRanker.load()
            except FileNotFoundError:
                pass  # model not trained yet — ensemble disabled

        return cls(
            ic=ic,
            ancestors=ancestors,
            disease_phenotypes=disease_phenotypes,
            disease_names=disease_names,
            xgb=xgb_ranker,
        )

    def _term_score(self, query_id: str, disease_terms: list[tuple[str, float]]) -> tuple[float, str]:
        """Best similarity between one query term and all disease phenotype terms.

        Returns (score, best_matching_hpo_id).
        Falls back to Jaccard when neither query nor disease term has an IC value.
        """
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
        query: list[tuple[str, float]],  # [(hpo_id, confidence)]
        top_k: int = 5,
    ) -> list[RankResult]:
        """Score all diseases against the query terms and return top_k results."""
        if not query:
            return []

        # Filter out unknown HPO IDs silently
        valid_query = [(hpo_id, conf) for hpo_id, conf in query if hpo_id in self.ancestors]
        if not valid_query:
            return []

        scores: list[tuple[int, float, list[str]]] = []

        # Pre-compute XGBoost scores once for all diseases (if model loaded)
        xgb_scores: dict[int, float] = {}
        if self.xgb is not None:
            xgb_scores = self.xgb.predict(valid_query)

        for orpha_code, disease_terms in self.disease_phenotypes.items():
            term_scores: list[tuple[float, float, str]] = []  # (weighted_sim, confidence, best_match)
            for query_id, confidence in valid_query:
                sim, best_match = self._term_score(query_id, disease_terms)
                term_scores.append((sim * confidence, confidence, best_match))

            if not term_scores:
                continue

            resnik_score = sum(s for s, _, _ in term_scores) / len(term_scores)

            if xgb_scores:
                raw_score = 0.6 * resnik_score + 0.4 * xgb_scores.get(orpha_code, 0.0)
            else:
                raw_score = resnik_score

            # contributing_terms: HPO IDs from the disease that matched best, deduped, top-5
            contributing = list(dict.fromkeys(m for _, _, m in sorted(term_scores, reverse=True) if m))[:5]
            scores.append((orpha_code, raw_score, contributing))

        scores.sort(key=lambda x: x[1], reverse=True)
        top = scores[:top_k]

        # Calibrate: map raw score to 0–100 using the top-1 score as reference
        max_score = top[0][1] if top else 1.0

        results = []
        for orpha_code, raw_score, contributing in top:
            confidence = _calibrate(raw_score, max_score)
            results.append(
                RankResult(
                    orpha_code=orpha_code,
                    name=self.disease_names.get(orpha_code, "Unknown"),
                    score=round(raw_score, 4),
                    confidence=round(confidence, 1),
                    contributing_terms=contributing,
                )
            )
        return results


def _calibrate(raw: float, max_raw: float) -> float:
    """Map raw similarity score to 0–80. Top score anchors at 75%, others scale relatively."""
    if max_raw == 0:
        return 0.0
    return min(75.0, (raw / max_raw) * 75.0)
