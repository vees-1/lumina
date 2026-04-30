import json
import os

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from scoring.ranker import RankResult

router = APIRouter(prefix="/agent", tags=["agent"])

_MODEL_NEXT = "llama-3.3-70b-versatile"
_MODEL_LETTER = "llama-3.3-70b-versatile"

_LANG_NAMES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "zh": "Chinese (Simplified)",
    "ja": "Japanese",
}

_NEXT_SYSTEM = """You are a clinical reasoning assistant for rare disease diagnosis.
Given a ranked disease list and the modalities already used, suggest which modality to try next.

Return JSON only:
{{"modality": "notes|photo|lab|vcf", "reasoning": "one sentence", "cycles_remaining": 0-2}}

Modalities: notes (clinical text), photo (clinical photo), lab (lab reports), vcf (genetics VCF)
If confidence is high enough (top-1 > 85 AND gap to top-2 > 15), return cycles_remaining: 0.
Write the "reasoning" value in {lang_name}. Keep all JSON keys in English."""

_LETTER_SYSTEM = """You are a specialist physician writing a formal clinical referral letter.

Write in formal medical prose in {lang_name}. Structure exactly as follows — use these exact section headers as plain text (no markdown symbols):

CLINICAL REFERRAL LETTER

Date: [today's date]
Re: [Patient name if known, otherwise "The patient"]

Dear Colleague,

[Opening paragraph: reason for referral, 2-3 sentences. Be direct and clinical.]

PRESENTING HISTORY
[2-3 sentences on the key presenting complaint and timeline.]

CLINICAL FINDINGS
[Bullet list of the most relevant findings, written as plain clinical prose. No markdown bullets — use a dash and space: "- Finding"]

DIAGNOSTIC IMPRESSION
[The top 1-2 differential diagnoses with brief reasoning. Mention the phenotypic overlap score as supporting evidence. 3-4 sentences.]

RECOMMENDED INVESTIGATIONS
[Specific actionable next steps: genetic panels, specialist consultations, imaging. Use "- " for each.]

I would be grateful for your assessment and any further management recommendations.

Yours sincerely,
[Referring Clinician]

---
Rules:
- Use ONLY plain text. No #, ##, ###, **, *, or backticks.
- Disease names stay in English even if letter is in {lang_name}.
- Use the supplied referral metadata when present: patient date of birth, referring physician and clinic, recipient specialist and hospital, and urgency level.
- If urgency is urgent or emergency, reflect that in the recommendation tone and prioritization.
- Be concise — under 350 words total.
- Sound like a real clinician wrote this, not an AI."""


class AgentNextRequest(BaseModel):
    top5: list[RankResult]
    modalities_used: list[str]
    cycle: int = 0
    lang: str = "en"


class AgentSuggestion(BaseModel):
    modality: str
    reasoning: str
    cycles_remaining: int


class LetterRequest(BaseModel):
    top5: list[RankResult]
    evidence: dict
    patient_context: dict
    lang: str = "en"


def _first_present(context: dict, *keys: str) -> str:
    for key in keys:
        value = context.get(key)
        if value not in (None, ""):
            return str(value).strip()
    return ""


def _format_referral_metadata(context: dict) -> str:
    fields = [
        ("Patient name", _first_present(context, "patientName", "patient_name")),
        ("Patient DOB", _first_present(context, "dateOfBirth", "patientDob", "patient_dob", "dob")),
        (
            "Referring physician",
            _first_present(context, "referringPhysicianName", "referring_physician_name"),
        ),
        ("Referring clinic", _first_present(context, "referringClinic", "referring_clinic")),
        (
            "Recipient specialist",
            _first_present(context, "recipientSpecialist", "recipient_specialist"),
        ),
        ("Recipient hospital", _first_present(context, "recipientHospital", "recipient_hospital")),
        ("Urgency", _first_present(context, "urgency")),
    ]
    lines = [f"- {label}: {value}" for label, value in fields if value]
    return "\n".join(lines) if lines else "- None provided"


@router.post("/next", response_model=AgentSuggestion)
async def agent_next(body: AgentNextRequest) -> AgentSuggestion:
    from groq import AsyncGroq

    client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])

    lang_name = _LANG_NAMES.get(body.lang, "English")
    top5_text = "\n".join(
        f"#{i + 1} ORPHA:{r.orpha_code} {r.name} — confidence {r.confidence:.1f}"
        for i, r in enumerate(body.top5)
    )
    user_msg = (
        f"Top-5 diagnoses:\n{top5_text}\n\n"
        f"Modalities already used: {', '.join(body.modalities_used) or 'none'}\n"
        f"Cycle: {body.cycle}/3"
    )

    try:
        response = await client.chat.completions.create(
            model=_MODEL_NEXT,
            max_tokens=256,
            temperature=0.0,
            messages=[
                {"role": "system", "content": _NEXT_SYSTEM.format(lang_name=lang_name)},
                {"role": "user", "content": user_msg},
            ],
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())
        return AgentSuggestion(
            modality=data.get("modality", ""),
            reasoning=data.get("reasoning", ""),
            cycles_remaining=max(0, min(3, int(data.get("cycles_remaining", 0)))),
        )
    except Exception:
        return AgentSuggestion(
            modality="", reasoning="Unable to suggest next step.", cycles_remaining=0
        )


@router.post("/letter")
async def generate_letter(body: LetterRequest) -> StreamingResponse:
    from groq import AsyncGroq

    client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])

    top5_text = "\n".join(
        f"- ORPHA:{r.orpha_code} {r.name} (confidence {r.confidence:.1f}%, contributing: {', '.join(r.contributing_terms[:3])})"
        for r in body.top5
    )
    metadata_text = _format_referral_metadata(body.patient_context)
    user_msg = (
        f"Referral metadata:\n{metadata_text}\n\n"
        f"Patient context JSON:\n{json.dumps(body.patient_context, indent=2)}\n\n"
        f"Top diagnoses:\n{top5_text}\n\n"
        f"Evidence summary:\n{json.dumps(body.evidence, indent=2)}"
    )

    lang_name = _LANG_NAMES.get(body.lang, "English")

    async def stream_letter():
        try:
            stream = await client.chat.completions.create(
                model=_MODEL_LETTER,
                max_tokens=1024,
                temperature=0.3,
                stream=True,
                messages=[
                    {"role": "system", "content": _LETTER_SYSTEM.format(lang_name=lang_name)},
                    {"role": "user", "content": user_msg},
                ],
            )
            async for chunk in stream:
                text = chunk.choices[0].delta.content or ""
                if text:
                    yield f"data: {json.dumps({'text': text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'text': f'Error: {e}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_letter(), media_type="text/event-stream")
