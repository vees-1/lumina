"""Lab report (image/PDF) → HPO terms via OCR + Groq/Llama 3.3 70B."""

from __future__ import annotations

import io
import json
import os

from PIL import Image

from extractors.models import HPOTerm

_GROQ_MODEL = "llama-3.3-70b-versatile"

_SYSTEM = """You are a clinical laboratory analyst for rare disease diagnosis.

Given OCR-extracted text from a lab report, identify all abnormal values and map each to an HPO term.
Return a JSON array — nothing else.

Each item:
  {"hpo_id": "HP:XXXXXXX", "confidence": 0.0-1.0, "source": "test name and value, e.g. WBC 2.1 (low)"}

Rules:
- Only report abnormal values (below or above reference range)
- confidence 0.85–0.95 for clearly abnormal values with reference ranges provided
- confidence 0.6–0.8 for values where reference range is unclear
- Map lab abnormalities to their HPO phenotype (e.g. low WBC → HP:0001882 Leukopenia)
- return [] if all values are within normal limits or no mappable findings"""


def _ocr(image_bytes: bytes) -> str:
    try:
        import pytesseract
        img = Image.open(io.BytesIO(image_bytes))
        return pytesseract.image_to_string(img)
    except ImportError:
        return ""
    except Exception:
        return ""


async def extract_lab(image_bytes: bytes) -> list[HPOTerm]:
    ocr_text = _ocr(image_bytes)
    if not ocr_text.strip():
        return []

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return []

    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=api_key)
        response = await client.chat.completions.create(
            model=_GROQ_MODEL,
            max_tokens=1024,
            temperature=0.0,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": f"Lab report text:\n\n{ocr_text}"},
            ],
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        items = json.loads(raw)
        results = []
        for item in items:
            if not isinstance(item, dict):
                continue
            hpo_id = item.get("hpo_id", "")
            if not hpo_id.startswith("HP:"):
                continue
            results.append(HPOTerm(
                hpo_id=hpo_id,
                confidence=max(0.0, min(1.0, float(item.get("confidence", 0.7)))),
                source=str(item.get("source", "")),
            ))
        return results
    except Exception:
        return []
