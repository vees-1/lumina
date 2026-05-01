import traceback

from extractors.lab import extract_lab
from extractors.models import HPOTerm
from extractors.notes import extract_notes
from extractors.photo import extract_photo
from extractors.validate import validate_terms
from extractors.vcf import extract_vcf
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

router = APIRouter(prefix="/intake", tags=["intake"])


class NotesRequest(BaseModel):
    notes: str


@router.post("/text", response_model=list[HPOTerm])
async def intake_text(body: NotesRequest, request: Request) -> list[HPOTerm]:
    try:
        terms = await extract_notes(body.notes, request.app.state.hpo_vocab)
        return validate_terms(terms, {}, request.app.state.hpo_names)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        )


@router.post("/photo", response_model=list[HPOTerm])
async def intake_photo(
    request: Request,
    file: UploadFile = File(...),
    facial: bool = False,
) -> list[HPOTerm]:
    try:
        image_bytes = await file.read()
        facial_vocab = request.app.state.facial_vocab if facial else None
        terms = await extract_photo(
            image_bytes,
            media_type=file.content_type or "image/jpeg",
            facial=facial,
            facial_vocab=facial_vocab,
            hpo_vocab=request.app.state.hpo_vocab,
        )
        return validate_terms(terms, {}, request.app.state.hpo_names)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        )


@router.post("/lab", response_model=list[HPOTerm])
async def intake_lab(request: Request, file: UploadFile = File(...)) -> list[HPOTerm]:
    try:
        terms = await extract_lab(await file.read(), request.app.state.hpo_vocab)
        return validate_terms(terms, {}, request.app.state.hpo_names)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        )


@router.post("/vcf", response_model=list[HPOTerm])
async def intake_vcf(request: Request, file: UploadFile = File(...)) -> list[HPOTerm]:
    try:
        terms = extract_vcf(await file.read(), request.app.state.db_engine)
        return validate_terms(terms, {}, request.app.state.hpo_names)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        )
