"""Lab report (image/PDF) → HPO terms via OCR + Groq/Llama 3.3 70B."""

from __future__ import annotations

import io
import json
import os
import re

from PIL import Image

from extractors.models import HPOTerm

_GROQ_MODEL = "llama-3.3-70b-versatile"
_PROMPT_VOCAB_LIMIT = 5000

_SYSTEM = """You are a clinical laboratory analyst for rare disease diagnosis.

Given OCR-extracted text from a lab report, identify all abnormal values and map each to an HPO term.
Only use HPO IDs from the provided vocabulary. Return a JSON array — nothing else.

Each item:
  {"hpo_id": "HP:XXXXXXX", "confidence": 0.0-1.0, "source": "test name and value, e.g. WBC 2.1 (low)"}

Rules:
- Only report abnormal values (below or above reference range)
- confidence 0.85–0.95 for clearly abnormal values with reference ranges provided
- confidence 0.6–0.8 for values where reference range is unclear
- Map lab abnormalities to their HPO phenotype (e.g. low WBC → HP:0001882 Leukopenia)
- return [] if all values are within normal limits or no mappable findings"""

_LAB_FINDING_ALIASES: tuple[tuple[str, str, str], ...] = (
    (
        r"\b(?:low|decreased)\s+(?:wbc|white blood cells?|leukocytes?)\b|\b(?:wbc|white blood cells?|leukocytes?)\s*(?:low|decreased|↓)",
        "HP:0001882",
        "Leukopenia",
    ),
    (
        r"\b(?:high|elevated)\s+(?:wbc|white blood cells?|leukocytes?)\b|\b(?:wbc|white blood cells?|leukocytes?)\s*(?:high|elevated|↑)",
        "HP:0001974",
        "Leukocytosis",
    ),
    (
        r"\b(?:low|decreased)\s+(?:neutrophils?|anc)\b|\b(?:neutrophils?|anc)\s*(?:low|decreased|↓)",
        "HP:0001875",
        "Neutropenia",
    ),
    (
        r"\b(?:low|decreased)\s+(?:platelets?|plt)\b|\b(?:platelets?|plt)\s*(?:low|decreased|↓)",
        "HP:0001873",
        "Thrombocytopenia",
    ),
    (
        r"\b(?:high|elevated)\s+(?:platelets?|plt)\b|\b(?:platelets?|plt)\s*(?:high|elevated|↑)",
        "HP:0001894",
        "Thrombocytosis",
    ),
    (
        r"\b(?:low|decreased)\s+(?:hemoglobin|haemoglobin|hb)\b|\b(?:hemoglobin|haemoglobin|hb)\s*(?:low|decreased|↓)",
        "HP:0001903",
        "Anemia",
    ),
    (
        r"\b(?:high|elevated)\s+(?:glucose|blood sugar)\b|\b(?:glucose|blood sugar)\s*(?:high|elevated|↑)",
        "HP:0003074",
        "Hyperglycemia",
    ),
    (
        r"\b(?:low|decreased)\s+(?:glucose|blood sugar)\b|\b(?:glucose|blood sugar)\s*(?:low|decreased|↓)",
        "HP:0001943",
        "Hypoglycemia",
    ),
    (
        r"\b(?:high|elevated)\s+(?:ammonia|ammonium)\b|\b(?:ammonia|ammonium)\s*(?:high|elevated|↑)",
        "HP:0001987",
        "Hyperammonemia",
    ),
    (
        r"\b(?:high|elevated)\s+lactate\b|\blactate\s*(?:high|elevated|↑)",
        "HP:0002151",
        "Increased circulating lactate concentration",
    ),
    (r"\blactic acidosis\b", "HP:0003128", "Lactic acidosis"),
    (r"\bmetabolic acidosis\b", "HP:0001942", "Metabolic acidosis"),
    (
        r"\b(?:high|elevated)\s+(?:creatinine|urea|bun)\b|\b(?:creatinine|urea|bun)\s*(?:high|elevated|↑)",
        "HP:0003259",
        "Elevated serum creatinine",
    ),
    (
        r"\bproteinuria\b|\burine protein\s*(?:positive|high|elevated|↑)",
        "HP:0000093",
        "Proteinuria",
    ),
    (r"\bhematuria\b|\bblood in urine\b", "HP:0000790", "Hematuria"),
    (
        r"\b(?:high|elevated)\s+(?:alt|alanine aminotransferase|ast|aspartate aminotransferase|transaminases?)\b|\b(?:alt|ast|transaminases?)\s*(?:high|elevated|↑)",
        "HP:0002910",
        "Elevated hepatic transaminase",
    ),
    (
        r"\b(?:high|elevated)\s+bilirubin\b|\bbilirubin\s*(?:high|elevated|↑)",
        "HP:0002904",
        "Hyperbilirubinemia",
    ),
    (
        r"\b(?:low|decreased)\s+calcium\b|\bcalcium\s*(?:low|decreased|↓)",
        "HP:0002901",
        "Hypocalcemia",
    ),
    (
        r"\b(?:high|elevated)\s+calcium\b|\bcalcium\s*(?:high|elevated|↑)",
        "HP:0003072",
        "Hypercalcemia",
    ),
    (
        r"\b(?:low|decreased)\s+sodium\b|\bsodium\s*(?:low|decreased|↓)",
        "HP:0002902",
        "Hyponatremia",
    ),
    (
        r"\b(?:high|elevated)\s+sodium\b|\bsodium\s*(?:high|elevated|↑)",
        "HP:0003228",
        "Hypernatremia",
    ),
    (
        r"\b(?:low|decreased)\s+potassium\b|\bpotassium\s*(?:low|decreased|↓)",
        "HP:0002900",
        "Hypokalemia",
    ),
    (
        r"\b(?:high|elevated)\s+potassium\b|\bpotassium\s*(?:high|elevated|↑)",
        "HP:0002153",
        "Hyperkalemia",
    ),
)


def _ocr(image_bytes: bytes) -> str:
    if image_bytes.lstrip().startswith(b"%PDF"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(image_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""

    try:
        import pytesseract

        img = Image.open(io.BytesIO(image_bytes))
        return pytesseract.image_to_string(img)
    except ImportError:
        return ""
    except Exception:
        return ""


def _keyword_match_lab(text: str) -> list[HPOTerm]:
    results: dict[str, HPOTerm] = {}
    for pattern, hpo_id, label in _LAB_FINDING_ALIASES:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        line_start = max(text.rfind("\n", 0, match.start()), 0)
        line_end = text.find("\n", match.end())
        if line_end == -1:
            line_end = len(text)
        source = text[line_start:line_end].strip() or label
        results[hpo_id] = HPOTerm(
            hpo_id=hpo_id,
            confidence=0.78,
            source=source,
            assertion="present",
            source_type="lab",
        )
    return list(results.values())


async def extract_lab(
    image_bytes: bytes, hpo_vocab: list[tuple[str, str]] | None = None
) -> list[HPOTerm]:
    ocr_text = _ocr(image_bytes)
    if not ocr_text.strip():
        return []

    fallback_results = _keyword_match_lab(ocr_text)
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return fallback_results

    try:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=api_key)
        vocab_block = ""
        if hpo_vocab:
            vocab_block = "\n\nHPO vocabulary:\n" + "\n".join(
                f"{hid}: {name}" for hid, name in hpo_vocab[:_PROMPT_VOCAB_LIMIT]
            )
        response = await client.chat.completions.create(
            model=_GROQ_MODEL,
            max_tokens=1024,
            temperature=0.0,
            messages=[
                {"role": "system", "content": _SYSTEM + vocab_block},
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
            results.append(
                HPOTerm(
                    hpo_id=hpo_id,
                    confidence=max(0.0, min(1.0, float(item.get("confidence", 0.7)))),
                    source=str(item.get("source", "")),
                    assertion="present",
                    source_type="lab",
                )
            )
        merged = {term.hpo_id: term for term in fallback_results}
        for term in results:
            existing = merged.get(term.hpo_id)
            if existing is None or term.confidence > existing.confidence:
                merged[term.hpo_id] = term
        return list(merged.values())
    except Exception:
        return fallback_results
