from extractors.models import HPOTerm
from fastapi import APIRouter, Request
from pydantic import BaseModel
from scoring.ranker import RankResult

router = APIRouter(prefix="/score", tags=["score"])


class ScoreRequest(BaseModel):
    terms: list[HPOTerm]
    top_k: int = 5


@router.post("", response_model=list[RankResult])
async def score_case(body: ScoreRequest, request: Request) -> list[RankResult]:
    index = request.app.state.scoring_index
    query = [(t.hpo_id, t.confidence) for t in body.terms]
    return index.rank(query, top_k=body.top_k)
