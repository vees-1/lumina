from fastapi import APIRouter, HTTPException, Query, Request
from ingest.models import CrossRef, Disease, DiseaseGene, DiseasePhenotype, Prevalence
from pydantic import BaseModel
from sqlmodel import Session, col, select

router = APIRouter(prefix="/disease", tags=["disease"])


class DiseaseSummary(BaseModel):
    orpha_code: int
    name: str
    disorder_type: str
    disorder_group: str


class DiseaseSearchResult(BaseModel):
    total: int
    page: int
    page_size: int
    results: list[DiseaseSummary]


@router.get("/search", response_model=DiseaseSearchResult)
async def search_diseases(
    request: Request,
    q: str = Query(default="", description="Search by name or ORPHA code"),
    disorder_type: str = Query(default="", description="Filter by disorder type"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> DiseaseSearchResult:
    engine = request.app.state.db_engine
    with Session(engine) as s:
        stmt = select(Disease)
        if q.strip():
            term = q.strip()
            if term.isdigit():
                stmt = stmt.where(Disease.orpha_code == int(term))
            else:
                stmt = stmt.where(col(Disease.name).ilike(f"%{term}%"))
        if disorder_type.strip():
            stmt = stmt.where(Disease.disorder_type == disorder_type.strip())

        all_rows = s.exec(stmt.order_by(col(Disease.name))).all()
        total = len(all_rows)
        offset = (page - 1) * page_size
        page_rows = all_rows[offset : offset + page_size]

        return DiseaseSearchResult(
            total=total,
            page=page,
            page_size=page_size,
            results=[
                DiseaseSummary(
                    orpha_code=d.orpha_code,
                    name=d.name,
                    disorder_type=d.disorder_type,
                    disorder_group=d.disorder_group,
                )
                for d in page_rows
            ],
        )


class PhenotypeItem(BaseModel):
    hpo_id: str
    hpo_term: str
    frequency_label: str
    frequency_weight: float


class GeneItem(BaseModel):
    gene_symbol: str
    gene_name: str
    ensembl_id: str | None


class PrevalenceItem(BaseModel):
    prevalence_type: str
    prevalence_class: str | None
    val_moy: float | None
    geographic: str


class DiseaseDetail(BaseModel):
    orpha_code: int
    name: str
    disorder_type: str
    disorder_group: str
    icd10: list[str]
    omim: list[str]
    phenotypes: list[PhenotypeItem]
    genes: list[GeneItem]
    prevalence: list[PrevalenceItem]


@router.get("/{orpha_code}", response_model=DiseaseDetail)
async def get_disease(orpha_code: int, request: Request) -> DiseaseDetail:
    engine = request.app.state.db_engine
    with Session(engine) as s:
        disease = s.get(Disease, orpha_code)
        if disease is None:
            raise HTTPException(status_code=404, detail=f"ORPHA:{orpha_code} not found")

        cross_refs = s.exec(select(CrossRef).where(CrossRef.orpha_code == orpha_code)).all()
        icd10 = [r.reference for r in cross_refs if r.source in ("ICD-10", "ICD-11")]
        omim = [r.reference for r in cross_refs if r.source == "OMIM"]

        phenotypes = [
            PhenotypeItem(
                hpo_id=p.hpo_id,
                hpo_term=p.hpo_term,
                frequency_label=p.frequency_label,
                frequency_weight=p.frequency_weight,
            )
            for p in s.exec(
                select(DiseasePhenotype)
                .where(DiseasePhenotype.orpha_code == orpha_code)
                .order_by(DiseasePhenotype.frequency_weight.desc())
            ).all()
        ]

        genes = [
            GeneItem(gene_symbol=g.gene_symbol, gene_name=g.gene_name, ensembl_id=g.ensembl_id)
            for g in s.exec(select(DiseaseGene).where(DiseaseGene.orpha_code == orpha_code)).all()
        ]

        prevalence = [
            PrevalenceItem(
                prevalence_type=p.prevalence_type,
                prevalence_class=p.prevalence_class,
                val_moy=p.val_moy,
                geographic=p.geographic,
            )
            for p in s.exec(select(Prevalence).where(Prevalence.orpha_code == orpha_code)).all()
        ]

    return DiseaseDetail(
        orpha_code=disease.orpha_code,
        name=disease.name,
        disorder_type=disease.disorder_type,
        disorder_group=disease.disorder_group,
        icd10=icd10,
        omim=omim,
        phenotypes=phenotypes,
        genes=genes,
        prevalence=prevalence,
    )
