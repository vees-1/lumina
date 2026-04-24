"""Clinical photo → HPO terms via Claude Vision."""

from __future__ import annotations

import base64
import json
import os

import anthropic

from extractors.models import HPOTerm

_MODEL = "claude-sonnet-4-6"

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
) -> list[HPOTerm]:
    """Extract HPO terms from a clinical photograph using Claude Vision."""
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    system = _SYSTEM_BASE
    if facial and facial_vocab:
        vocab_str = "\n".join(f"- {v}" for v in facial_vocab[:200])
        system = _SYSTEM_BASE + _FACIAL_ADDENDUM.format(vocab=vocab_str)

    b64 = base64.standard_b64encode(image_bytes).decode()

    response = await client.messages.create(
        model=_MODEL,
        max_tokens=2048,
        system=system,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": b64},
                    },
                    {"type": "text", "text": "Identify all observable clinical findings and return the JSON array."},
                ],
            }
        ],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

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
