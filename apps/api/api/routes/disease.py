import re

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


class ClinicalSummary(BaseModel):
    inheritance: str | None
    confirmatory_workup: str | None
    typical_age_of_onset: str | None
    prevalence_summary: str | None


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
    clinical_summary: ClinicalSummary


_INHERITANCE_PATTERNS: list[tuple[str, str]] = [
    ("x-linked dominant", "X-linked dominant"),
    ("x-linked recessive", "X-linked recessive"),
    ("x-linked", "X-linked"),
    ("autosomal dominant", "Autosomal dominant"),
    ("autosomal recessive", "Autosomal recessive"),
    ("mitochondrial", "Mitochondrial"),
    ("maternal inheritance", "Mitochondrial"),
]

_ONSET_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bprenatal\b|\bfetal\b"), "Prenatal"),
    (re.compile(r"\bcongenital\b"), "Congenital"),
    (re.compile(r"\bneonatal\b"), "Neonatal"),
    (re.compile(r"\binfantile\b|\binfancy\b"), "Infancy"),
    (re.compile(r"\bchildhood\b"), "Childhood"),
    (re.compile(r"\bjuvenile\b"), "Juvenile"),
    (re.compile(r"\badolescent\b"), "Adolescence"),
    (re.compile(r"\badult\b"), "Adult"),
    (re.compile(r"\blate[- ]onset\b"), "Late onset"),
    (re.compile(r"\bearly[- ]onset\b"), "Early onset"),
]


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def _derive_inheritance(disease: Disease, phenotypes: list[PhenotypeItem]) -> str | None:
    haystacks = [
        disease.name,
        disease.disorder_type,
        disease.disorder_group,
        *[p.hpo_term for p in phenotypes[:25]],
    ]
    for text in haystacks:
        lowered = text.lower()
        for needle, label in _INHERITANCE_PATTERNS:
            if needle in lowered:
                return label
    return None


def _derive_age_of_onset(phenotypes: list[PhenotypeItem]) -> str | None:
    for phenotype in phenotypes:
        lowered = phenotype.hpo_term.lower()
        for pattern, label in _ONSET_PATTERNS:
            if pattern.search(lowered):
                return label
    return None


def _join_gene_symbols(symbols: list[str]) -> str:
    if len(symbols) == 1:
        return symbols[0]
    if len(symbols) == 2:
        return f"{symbols[0]} and {symbols[1]}"
    return f"{', '.join(symbols[:-1])}, and {symbols[-1]}"


def _derive_confirmatory_workup(genes: list[GeneItem], omim: list[str]) -> str | None:
    gene_symbols = _dedupe_preserve_order([gene.gene_symbol for gene in genes if gene.gene_symbol])
    if gene_symbols:
        if len(gene_symbols) == 1:
            return f"Targeted molecular confirmation of {gene_symbols[0]}"
        focus = gene_symbols[:3]
        if len(gene_symbols) > 3:
            return f"Phenotype-directed molecular panel including {_join_gene_symbols(focus)}"
        return f"Targeted molecular panel including {_join_gene_symbols(focus)}"
    if omim:
        return "Clinical genetics workup with phenotype-directed molecular confirmation"
    return None


def _prevalence_sort_key(item: PrevalenceItem) -> tuple[int, int, int, float]:
    geographic_rank = {
        "worldwide": 0,
        "united states": 1,
        "europe": 2,
    }
    type_rank = {
        "point prevalence": 0,
        "prevalence at birth": 1,
        "annual incidence": 2,
    }
    geographic = item.geographic.strip().lower()
    prevalence_type = item.prevalence_type.strip().lower()
    has_numeric_value = 0 if item.val_moy and item.val_moy > 0 else 1
    return (
        has_numeric_value,
        geographic_rank.get(geographic, 3),
        type_rank.get(prevalence_type, 3),
        -(item.val_moy or 0),
    )


def _derive_prevalence_summary(prevalence: list[PrevalenceItem]) -> str | None:
    if not prevalence:
        return None

    best = sorted(prevalence, key=_prevalence_sort_key)[0]
    suffix = f" ({best.geographic})" if best.geographic else ""
    if best.val_moy is not None and best.val_moy > 0:
        return f"{best.prevalence_type}: {best.val_moy:g}{suffix}"
    if best.prevalence_class:
        return f"{best.prevalence_type}: {best.prevalence_class}{suffix}"
    return f"{best.prevalence_type}{suffix}" if best.prevalence_type else None


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

        clinical_summary = ClinicalSummary(
            inheritance=_derive_inheritance(disease, phenotypes),
            confirmatory_workup=_derive_confirmatory_workup(genes, omim),
            typical_age_of_onset=_derive_age_of_onset(phenotypes),
            prevalence_summary=_derive_prevalence_summary(prevalence),
        )

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
        clinical_summary=clinical_summary,
    )
