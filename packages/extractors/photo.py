"""Clinical photo → HPO terms via Groq Vision."""

from __future__ import annotations

import base64
import json
import os

from extractors.models import HPOTerm

_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

_SYSTEM_BASE = """You are a clinical image analyst specialising in rare disease phenotyping.

Examine the clinical photograph and identify all observable clinical findings.
Map each finding to an HPO term. Return a JSON array — nothing else.

Each item:
  {"hpo_id": "HP:XXXXXXX", "confidence": 0.0-1.0, "source": "brief description of what you observed"}

Rules:
- Only report findings clearly visible in the image
- confidence 0.85–0.95 for unambiguous findings
- confidence 0.5–0.8 for subtle or uncertain findings
- Do not infer systemic findings from a single photo
- return [] if no clinically significant HPO-mappable findings are visible"""

_VOCAB_ADDENDUM = """
You MUST only use HPO IDs from the provided vocabulary list. Do not invent HP: IDs.

HPO vocabulary:
{vocab}"""

_FACIAL_ADDENDUM = """
This is a facial photograph. In addition to general findings, pay close attention to:
dysmorphic facial features including but not limited to the following vocabulary:
{vocab}

Map each observable feature to its HPO term with high precision."""


async def extract_photo(
    image_bytes: bytes,
    media_type: str = "image/jpeg",
    facial: bool = False,
    facial_vocab: list[str] | None = None,
    hpo_vocab: list[tuple[str, str]] | None = None,
) -> list[HPOTerm]:
    """Extract HPO terms from a clinical photograph using Groq Vision."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return []

    try:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=api_key)

        system = _SYSTEM_BASE
        if hpo_vocab:
            vocab_block = "\n".join(
                f"{i + 1}. {hid} — {name}" for i, (hid, name) in enumerate(hpo_vocab[:400])
            )
            system = system + _VOCAB_ADDENDUM.format(vocab=vocab_block)
        if facial and facial_vocab:
            vocab_str = "\n".join(f"- {v}" for v in facial_vocab[:200])
            system = system + _FACIAL_ADDENDUM.format(vocab=vocab_str)

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        response = await client.chat.completions.create(
            model=_MODEL,
            max_tokens=1024,
            temperature=0.0,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_b64}"
                            },
                        },
                        {
                            "type": "text",
                            "text": system + "\n\nIdentify all observable clinical findings and return the JSON array.",
                        },
                    ],
                }
            ],
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        # Find JSON array in response
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            raw = raw[start:end]

        try:
            items = json.loads(raw)
        except json.JSONDecodeError:
            return []

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
                )
            )
        return results
    except Exception:
        return []
