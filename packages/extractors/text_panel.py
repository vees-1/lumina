"""Shortcut multi-modality text intake — single Claude call for mixed input."""

from __future__ import annotations

import json
import os

import anthropic

from extractors.models import HPOTerm

_MODEL = "claude-sonnet-4-6"

_SYSTEM = """You are a clinical decision support assistant for rare disease diagnosis.

The clinician has provided a free-text description that may include patient demographics,
clinical observations, lab results, and genetic findings.

Extract all clinical findings and map each to an HPO term.
Return a JSON array — nothing else.

Each item:
  {"hpo_id": "HP:XXXXXXX", "confidence": 0.0-1.0, "source": "relevant fragment from input", "modality": "notes|lab|genetics"}

Modality field:
- "notes" — clinical observations, symptoms, signs
- "lab" — laboratory values
- "genetics" — variant or gene mentions

Rules:
- confidence 0.9 for genetics-derived phenotypes
- confidence 0.85–0.95 for explicit clinical findings
- confidence 0.6–0.8 for inferred findings
- return [] if nothing maps to HPO terms"""


async def extract_text_panel(text: str) -> list[HPOTerm]:
    """Extract HPO terms from a free-text multi-modality clinical description."""
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    response = await client.messages.create(
        model=_MODEL,
        max_tokens=2048,
        system=_SYSTEM,
        messages=[{"role": "user", "content": text}],
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
