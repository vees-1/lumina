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

_LETTER_TEMPLATES: dict[str, dict[str, str]] = {
    "en": {
        "title": "CLINICAL REFERRAL LETTER",
        "date": "Date",
        "re": "Re",
        "dear": "Dear Colleague,",
        "history": "PRESENTING HISTORY",
        "findings": "CLINICAL FINDINGS",
        "impression": "DIAGNOSTIC IMPRESSION",
        "investigations": "RECOMMENDED INVESTIGATIONS",
        "closing": "I would be grateful for your assessment and any further management recommendations.",
        "signoff": "Yours sincerely,",
        "clinician": "Referring Clinician",
        "unknown_patient": "The patient",
    },
    "de": {
        "title": "KLINISCHES ÜBERWEISUNGSSCHREIBEN",
        "date": "Datum",
        "re": "Betreff",
        "dear": "Sehr geehrte Kollegin, sehr geehrter Kollege,",
        "history": "VORSTELLUNGSANAMNESE",
        "findings": "KLINISCHE BEFUNDE",
        "impression": "DIAGNOSTISCHE EINSCHÄTZUNG",
        "investigations": "EMPFOHLENE UNTERSUCHUNGEN",
        "closing": "Ich wäre Ihnen für Ihre Beurteilung und weitere Therapieempfehlungen dankbar.",
        "signoff": "Mit freundlichen Grüßen",
        "clinician": "Überweisende Ärztin / überweisender Arzt",
        "unknown_patient": "Die Patientin / der Patient",
    },
    "es": {
        "title": "CARTA CLÍNICA DE DERIVACIÓN",
        "date": "Fecha",
        "re": "Asunto",
        "dear": "Estimado/a colega:",
        "history": "HISTORIA CLÍNICA",
        "findings": "HALLAZGOS CLÍNICOS",
        "impression": "IMPRESIÓN DIAGNÓSTICA",
        "investigations": "INVESTIGACIONES RECOMENDADAS",
        "closing": "Agradecería su valoración y cualquier recomendación adicional de manejo.",
        "signoff": "Atentamente,",
        "clinician": "Médico remitente",
        "unknown_patient": "El/la paciente",
    },
    "fr": {
        "title": "LETTRE CLINIQUE D'ADRESSAGE",
        "date": "Date",
        "re": "Objet",
        "dear": "Chère consœur, cher confrère,",
        "history": "HISTOIRE CLINIQUE",
        "findings": "SIGNES CLINIQUES",
        "impression": "IMPRESSION DIAGNOSTIQUE",
        "investigations": "EXAMENS RECOMMANDÉS",
        "closing": "Je vous remercie par avance pour votre évaluation et vos recommandations de prise en charge.",
        "signoff": "Bien cordialement,",
        "clinician": "Médecin adresseur",
        "unknown_patient": "Le/la patient(e)",
    },
    "hi": {
        "title": "नैदानिक रेफरल पत्र",
        "date": "तारीख",
        "re": "विषय",
        "dear": "आदरणीय सहकर्मी,",
        "history": "प्रस्तुत बीमारी का इतिहास",
        "findings": "नैदानिक निष्कर्ष",
        "impression": "नैदानिक आकलन",
        "investigations": "अनुशंसित जांचें",
        "closing": "कृपया अपना मूल्यांकन और आगे के प्रबंधन संबंधी सुझाव प्रदान करें।",
        "signoff": "सादर,",
        "clinician": "रेफर करने वाले चिकित्सक",
        "unknown_patient": "रोगी",
    },
    "ja": {
        "title": "臨床紹介状",
        "date": "日付",
        "re": "件名",
        "dear": "ご担当先生",
        "history": "現病歴",
        "findings": "臨床所見",
        "impression": "診断的印象",
        "investigations": "推奨される検査",
        "closing": "ご評価および今後の管理についてご助言いただけますと幸いです。",
        "signoff": "敬具",
        "clinician": "紹介元医師",
        "unknown_patient": "患者",
    },
    "zh": {
        "title": "临床转诊信",
        "date": "日期",
        "re": "事由",
        "dear": "尊敬的同事：",
        "history": "现病史",
        "findings": "临床表现",
        "impression": "诊断印象",
        "investigations": "建议检查",
        "closing": "恳请您评估并提供进一步诊疗建议。",
        "signoff": "此致",
        "clinician": "转诊医生",
        "unknown_patient": "患者",
    },
}

_NEXT_SYSTEM = """You are a clinical reasoning assistant for rare disease diagnosis.
Given a ranked disease list and the modalities already used, suggest which modality to try next.

Return JSON only:
{{"modality": "notes|photo|lab|vcf", "reasoning": "one sentence", "cycles_remaining": 0-2}}

Modalities: notes (clinical text), photo (clinical photo), lab (lab reports), vcf (genetics VCF)
If confidence is high enough (top-1 > 85 AND gap to top-2 > 15), return cycles_remaining: 0.
Write the "reasoning" value in {lang_name}. Keep all JSON keys in English."""

_LETTER_SYSTEM = """You are a specialist physician writing a formal clinical referral letter.

Write the entire letter in {lang_name}. Do not mix English into the prose, headings, salutation, closing, field labels, or recommendations.
Use the following localized fixed text exactly. Structure exactly as follows — use these exact section headers as plain text (no markdown symbols):

{title}

{date}: [today's date]
{re}: [Patient name if known, otherwise "{unknown_patient}"]

{dear}

[Opening paragraph: reason for referral, 2-3 sentences. Be direct and clinical.]

{history}
[2-3 sentences on the key presenting complaint and timeline.]

{findings}
[Bullet list of the most relevant findings, written as plain clinical prose. No markdown bullets — use a dash and space: "- Finding"]

{impression}
[The top 1-2 differential diagnoses with brief reasoning. Mention the phenotypic overlap score as supporting evidence. 3-4 sentences.]

{investigations}
[Specific actionable next steps: genetic panels, specialist consultations, imaging. Use "- " for each.]

{closing}

{signoff}
[{clinician}]

---
Rules:
- Use ONLY plain text. No #, ##, ###, **, *, or backticks.
- Disease names, gene symbols, HPO IDs, ORPHA IDs, and test/panel names may remain in their standard medical form. Everything else must be in {lang_name}.
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


def _letter_system(lang: str) -> str:
    lang_name = _LANG_NAMES.get(lang, "English")
    template = _LETTER_TEMPLATES.get(lang, _LETTER_TEMPLATES["en"])
    return _LETTER_SYSTEM.format(lang_name=lang_name, **template)


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

    async def stream_letter():
        try:
            stream = await client.chat.completions.create(
                model=_MODEL_LETTER,
                max_tokens=1024,
                temperature=0.3,
                stream=True,
                messages=[
                    {"role": "system", "content": _letter_system(body.lang)},
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
