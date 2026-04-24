import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/fhir", tags=["fhir"])


class DiagnosisItem(BaseModel):
    orpha_code: int
    name: str
    confidence: float
    contributing_terms: list[str]


class HPOTermItem(BaseModel):
    hpo_id: str
    label: str = ""
    confidence: float


class FHIRExportRequest(BaseModel):
    diagnoses: list[DiagnosisItem]
    hpo_terms: list[HPOTermItem]
    case_id: str


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


@router.post("/export")
async def export_fhir(body: FHIRExportRequest) -> JSONResponse:
    now = _now()
    bundle_id = _uuid()
    composition_id = _uuid()

    # Build Condition resources
    condition_entries = []
    condition_refs = []
    for dx in body.diagnoses:
        cond_id = _uuid()
        condition_refs.append({"reference": f"urn:uuid:{cond_id}"})

        evidence = []
        for hpo_id in dx.contributing_terms:
            evidence.append(
                {
                    "code": [
                        {
                            "coding": [
                                {
                                    "system": "http://purl.obolibrary.org/obo/hp.owl",
                                    "code": hpo_id,
                                }
                            ]
                        }
                    ]
                }
            )

        condition_entries.append(
            {
                "fullUrl": f"urn:uuid:{cond_id}",
                "resource": {
                    "resourceType": "Condition",
                    "id": cond_id,
                    "verificationStatus": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                                "code": "unconfirmed",
                                "display": "Unconfirmed",
                            }
                        ]
                    },
                    "code": {
                        "coding": [
                            {
                                "system": "http://www.orpha.net",
                                "code": f"ORPHA:{dx.orpha_code}",
                                "display": dx.name,
                            }
                        ],
                        "text": dx.name,
                    },
                    "evidence": evidence if evidence else [],
                    "extension": [
                        {
                            "url": "http://lumina.ai/fhir/StructureDefinition/diagnosis-confidence",
                            "valueDecimal": round(dx.confidence, 2),
                        }
                    ],
                },
            }
        )

    # Build Observation resources for HPO terms
    observation_entries = []
    observation_refs = []
    for term in body.hpo_terms:
        obs_id = _uuid()
        observation_refs.append({"reference": f"urn:uuid:{obs_id}"})
        observation_entries.append(
            {
                "fullUrl": f"urn:uuid:{obs_id}",
                "resource": {
                    "resourceType": "Observation",
                    "id": obs_id,
                    "status": "final",
                    "code": {
                        "coding": [
                            {
                                "system": "http://purl.obolibrary.org/obo/hp.owl",
                                "code": term.hpo_id,
                                "display": term.label if term.label else term.hpo_id,
                            }
                        ]
                    },
                    "valueBoolean": True,
                },
            }
        )

    # Composition resource
    composition = {
        "fullUrl": f"urn:uuid:{composition_id}",
        "resource": {
            "resourceType": "Composition",
            "id": composition_id,
            "status": "preliminary",
            "type": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "11502-2",
                        "display": "Laboratory report",
                    }
                ]
            },
            "date": now,
            "title": "Lumina Rare Disease Differential Diagnosis Report",
            "identifier": {
                "system": "http://lumina.ai/cases",
                "value": body.case_id,
            },
            "author": [
                {
                    "display": "Lumina Clinical AI",
                }
            ],
            "section": [
                {
                    "title": "Differential Diagnoses",
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "29548-5",
                                "display": "Diagnosis",
                            }
                        ]
                    },
                    "entry": condition_refs,
                },
                {
                    "title": "Observed Phenotypes (HPO)",
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "8716-3",
                                "display": "Vital signs",
                            }
                        ]
                    },
                    "entry": observation_refs,
                },
            ],
        },
    }

    bundle = {
        "resourceType": "Bundle",
        "id": bundle_id,
        "type": "document",
        "timestamp": now,
        "entry": [composition] + condition_entries + observation_entries,
    }

    return JSONResponse(content=bundle)
