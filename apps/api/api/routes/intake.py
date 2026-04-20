from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

router = APIRouter(prefix="/intake", tags=["intake"])


class NotesRequest(BaseModel):
    notes: str


class HPOTerm(BaseModel):
    hpo_id: str
    confidence: float
    source: str


@router.post("/text", response_model=list[HPOTerm])
async def intake_text(body: NotesRequest) -> list[HPOTerm]:
    # TODO: phase 3 — notes extractor
    return []


@router.post("/photo", response_model=list[HPOTerm])
async def intake_photo(
    file: UploadFile = File(...),
    facial: bool = False,
) -> list[HPOTerm]:
    # TODO: phase 3 — claude vision extractor
    return []


@router.post("/lab", response_model=list[HPOTerm])
async def intake_lab(file: UploadFile = File(...)) -> list[HPOTerm]:
    # TODO: phase 3 — OCR + claude lab extractor
    return []


@router.post("/vcf", response_model=list[HPOTerm])
async def intake_vcf(file: UploadFile = File(...)) -> list[HPOTerm]:
    # TODO: phase 3 — cyvcf2 + clinvar extractor
    return []
