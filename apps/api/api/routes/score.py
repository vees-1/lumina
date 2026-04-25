from extractors.models import HPOTerm
from fastapi import APIRouter, Request
from pydantic import BaseModel
from scoring.ranker import RankResult

router = APIRouter(prefix="/score", tags=["score"])

_MODALITY_CAP = {1: 40.0, 2: 55.0, 3: 65.0, 4: 80.0}


class ScoreRequest(BaseModel):
    terms: list[HPOTerm]
    top_k: int = 5
    modalities: int = 1


@router.post("", response_model=list[RankResult])
async def score_case(body: ScoreRequest, request: Request) -> list[RankResult]:
    index = request.app.state.scoring_index
    query = [(t.hpo_id, t.confidence) for t in body.terms]
    results = index.rank(query, top_k=body.top_k)
    cap = _MODALITY_CAP.get(max(1, min(4, body.modalities)), 40.0)
    for r in results:
        r.confidence = round(min(cap, r.confidence * cap / 100.0), 1)
    return results
