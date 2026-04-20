from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/score", tags=["score"])


class HPOTerm(BaseModel):
    hpo_id: str
    confidence: float
    source: str


class ScoreRequest(BaseModel):
    terms: list[HPOTerm]
    age_range: str | None = None
    sex: str | None = None
    inheritance: str | None = None


class RankedDisease(BaseModel):
    orpha_code: str
    name: str
    confidence: float
    icd10: str | None
    contributing_terms: list[HPOTerm]


@router.post("", response_model=list[RankedDisease])
async def score_case(body: ScoreRequest) -> list[RankedDisease]:
    # TODO: phase 2 — scoring engine
    return []
