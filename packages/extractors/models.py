from pydantic import BaseModel


class HPOTerm(BaseModel):
    hpo_id: str        # "HP:0001250"
    confidence: float  # 0.0–1.0
    source: str        # original span, finding, or gene name
