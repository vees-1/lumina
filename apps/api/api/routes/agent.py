from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentNextRequest(BaseModel):
    top5: list[dict]
    modalities_used: list[str]
    cycle: int = 0


class AgentSuggestion(BaseModel):
    modality: str
    reasoning: str
    cycles_remaining: int


@router.post("/next", response_model=AgentSuggestion)
async def agent_next(body: AgentNextRequest) -> AgentSuggestion:
    # TODO: phase 4 — claude agent loop
    return AgentSuggestion(modality="", reasoning="", cycles_remaining=0)


class LetterRequest(BaseModel):
    top5: list[dict]
    evidence: dict
    patient_context: dict


@router.post("/letter")
async def generate_letter(body: LetterRequest) -> StreamingResponse:
    # TODO: phase 4 — claude streaming letter generator
    async def stream():
        yield "data: placeholder letter\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
