"""XGBoost disease classifier — second ranking signal alongside Resnik/Lin.

Usage:
    # Training (run once via scripts/train_xgb.py):
    ranker = XGBoostRanker()
    ranker.train(engine)

    # Inference:
    ranker = XGBoostRanker.load()
    scores = ranker.predict([("HP:0001250", 0.95), ("HP:0000520", 0.80)])
    # → {orpha_code: probability, ...}
"""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
from ingest.models import DiseasePhenotype, HPOTerm
from sqlmodel import Session, select

def _resolve_model_path() -> Path:
    # Prefer data/ directory (same as orpha.sqlite) — works on HF Space
    from ingest.db import DATA_DIR
    candidate = DATA_DIR / "xgb_model.pkl"
    if candidate.exists():
        return candidate
    # Fallback: alongside the package (local dev)
    return Path(__file__).parent / "xgb_model.pkl"

MODEL_PATH = _resolve_model_path()


class XGBoostRanker:
    """XGBoost multi-class classifier over IC-weighted HPO feature vectors."""

    def __init__(self) -> None:
        self._clf = None  # xgboost.XGBClassifier
        self._hpo_index: dict[str, int] = {}   # hpo_id → column index
        self._label_to_orpha: dict[int, int] = {}  # integer class → orpha_code
        self._orpha_to_label: dict[int, int] = {}  # orpha_code → integer class
        self._ic: dict[str, float] = {}

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(self, engine) -> None:  # noqa: ANN001
        """Load DiseasePhenotype rows from SQLite, build feature matrix, train, save.

        Feature vector for disease d:
            v[j] = frequency_weight * IC(hpo_j)   if hpo_j annotated for d
                 = 0                               otherwise
        """
        import xgboost as xgb
        from scipy.sparse import lil_matrix

        with Session(engine) as session:
            # 1. Collect IC values
            ic: dict[str, float] = {}
            for term in session.exec(select(HPOTerm)):
                if term.ic is not None and term.ic > 0:
                    ic[term.hpo_id] = term.ic
            self._ic = ic

            # 2. Collect disease→phenotype rows (skip Excluded, freq_weight==0)
            rows: list[DiseasePhenotype] = [
                dp
                for dp in session.exec(select(DiseasePhenotype))
                if dp.frequency_weight > 0.0
            ]

        # 3. Build HPO vocabulary (only HPOs that appear in annotations)
        all_hpos = sorted({dp.hpo_id for dp in rows})
        self._hpo_index = {hpo: idx for idx, hpo in enumerate(all_hpos)}
        n_features = len(all_hpos)

        # 4. Group by disease
        disease_map: dict[int, list[tuple[str, float]]] = {}
        for dp in rows:
            disease_map.setdefault(dp.orpha_code, []).append(
                (dp.hpo_id, dp.frequency_weight)
            )

        orpha_codes = sorted(disease_map.keys())
        self._orpha_to_label = {code: i for i, code in enumerate(orpha_codes)}
        self._label_to_orpha = {i: code for code, i in self._orpha_to_label.items()}
        n_diseases = len(orpha_codes)

        # 5. Build sparse feature matrix
        X = lil_matrix((n_diseases, n_features), dtype=np.float32)
        y = np.arange(n_diseases, dtype=np.int32)

        for label, orpha_code in self._label_to_orpha.items():
            for hpo_id, freq_weight in disease_map[orpha_code]:
                col = self._hpo_index.get(hpo_id)
                if col is None:
                    continue
                ic_val = ic.get(hpo_id, 1.0)
                X[label, col] = freq_weight * ic_val

        X_csr = X.tocsr()

        # 6. Train XGBoost
        self._clf = xgb.XGBClassifier(
            objective="multi:softprob",
            num_class=n_diseases,
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            use_label_encoder=False,
            eval_metric="mlogloss",
            n_jobs=-1,
            tree_method="hist",
        )
        self._clf.fit(X_csr, y)

        # 7. Persist
        payload = {
            "clf": self._clf,
            "hpo_index": self._hpo_index,
            "label_to_orpha": self._label_to_orpha,
            "orpha_to_label": self._orpha_to_label,
            "ic": self._ic,
        }
        MODEL_PATH.write_bytes(pickle.dumps(payload))

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    @classmethod
    def load(cls) -> XGBoostRanker:
        """Load a previously trained model from xgb_model.pkl."""
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"XGBoost model not found at {MODEL_PATH}. Run scripts/train_xgb.py first.")

        payload = pickle.loads(MODEL_PATH.read_bytes())  # noqa: S301
        instance = cls()
        instance._clf = payload["clf"]
        instance._hpo_index = payload["hpo_index"]
        instance._label_to_orpha = payload["label_to_orpha"]
        instance._orpha_to_label = payload["orpha_to_label"]
        instance._ic = payload["ic"]
        return instance

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(self, hpo_terms: list[tuple[str, float]]) -> dict[int, float]:
        """Return {orpha_code: probability} for all diseases.

        Args:
            hpo_terms: list of (hpo_id, confidence) from the extractor pipeline.

        Returns:
            Dict mapping orpha_code → softmax probability (0–1).
        """
        if self._clf is None:
            raise RuntimeError("Model not loaded. Call XGBoostRanker.load() first.")

        n_features = len(self._hpo_index)
        vec = np.zeros(n_features, dtype=np.float32)

        for hpo_id, confidence in hpo_terms:
            col = self._hpo_index.get(hpo_id)
            if col is None:
                continue
            ic_val = self._ic.get(hpo_id, 1.0)
            vec[col] = confidence * ic_val

        # XGBoost expects 2-D input
        proba = self._clf.predict_proba(vec.reshape(1, -1))[0]  # shape: (n_diseases,)

        return {
            self._label_to_orpha[i]: float(proba[i])
            for i in range(len(proba))
        }
