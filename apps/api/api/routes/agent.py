import json
import os

import anthropic
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from scoring.ranker import RankResult

router = APIRouter(prefix="/agent", tags=["agent"])

_MODEL_FAST = "claude-haiku-4-5-20251001"
_MODEL_FULL = "claude-sonnet-4-6"

_NEXT_SYSTEM = """You are a clinical reasoning assistant for rare disease diagnosis.
Given a ranked disease list and the modalities already used, suggest which modality to try next.

Return JSON only:
{"modality": "notes|photo|lab|vcf", "reasoning": "one sentence", "cycles_remaining": 0-2}

Modalities: notes (clinical text), photo (clinical photo), lab (lab reports), vcf (genetics VCF)
If confidence is high enough (top-1 > 85 AND gap to top-2 > 15), return cycles_remaining: 0."""

_LETTER_SYSTEM = """You are a clinical specialist writing a concise referral letter for a rare disease patient.
Write in professional medical style. Keep it under 300 words. Structure: patient summary (1-2 sentences),
key clinical findings (bullet list), suspected diagnosis with brief reasoning (2-3 sentences),
recommended next steps (bullet list), closing. Use markdown headers."""


class AgentNextRequest(BaseModel):
    top5: list[RankResult]
    modalities_used: list[str]
    cycle: int = 0


class AgentSuggestion(BaseModel):
    modality: str
    reasoning: str
    cycles_remaining: int


class LetterRequest(BaseModel):
    top5: list[RankResult]
    evidence: dict
    patient_context: dict


@router.post("/next", response_model=AgentSuggestion)
async def agent_next(body: AgentNextRequest) -> AgentSuggestion:
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    top5_text = "\n".join(
        f"#{i + 1} ORPHA:{r.orpha_code} {r.name} — confidence {r.confidence:.1f}"
        for i, r in enumerate(body.top5)
    )
    user_msg = (
        f"Top-5 diagnoses:\n{top5_text}\n\n"
        f"Modalities already used: {', '.join(body.modalities_used) or 'none'}\n"
        f"Cycle: {body.cycle}/3"
    )

    response = await client.messages.create(
        model=_MODEL_FAST,
        max_tokens=256,
        system=_NEXT_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        data = json.loads(raw.strip())
        return AgentSuggestion(
            modality=data.get("modality", ""),
            reasoning=data.get("reasoning", ""),
            cycles_remaining=max(0, min(3, int(data.get("cycles_remaining", 0)))),
        )
    except (json.JSONDecodeError, ValueError):
        return AgentSuggestion(
            modality="", reasoning="Unable to suggest next step.", cycles_remaining=0
        )


@router.post("/letter")
async def generate_letter(body: LetterRequest) -> StreamingResponse:
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    top5_text = "\n".join(
        f"- ORPHA:{r.orpha_code} {r.name} (confidence {r.confidence:.1f}%, contributing: {', '.join(r.contributing_terms[:3])})"
        for r in body.top5
    )
    user_msg = (
        f"Patient context:\n{json.dumps(body.patient_context, indent=2)}\n\n"
        f"Top diagnoses:\n{top5_text}\n\n"
        f"Evidence summary:\n{json.dumps(body.evidence, indent=2)}"
    )

    async def stream_letter():
        async with client.messages.stream(
            model=_MODEL_FULL,
            max_tokens=2048,
            system=_LETTER_SYSTEM,
            messages=[{"role": "user", "content": user_msg}],
        ) as stream:
            async for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_letter(), media_type="text/event-stream")
