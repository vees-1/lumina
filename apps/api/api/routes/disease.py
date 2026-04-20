from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/disease", tags=["disease"])


class DiseaseDetail(BaseModel):
    orpha_code: str
    name: str
    definition: str | None
    icd10: list[str]
    omim: list[str]
    phenotypes: list[dict]
    genes: list[dict]
    prevalence: list[dict]


@router.get("/{orpha_code}", response_model=DiseaseDetail)
async def get_disease(orpha_code: str) -> DiseaseDetail:
    # TODO: phase 1 — query orpha.sqlite
    raise HTTPException(status_code=501, detail="Not implemented yet")
