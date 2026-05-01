"""VCF → HPO terms via ClinVar significance + gene→disease→HPO lookup."""

from __future__ import annotations

import os
import re
import tempfile

from ingest.models import ClinVarGeneDisease, DiseasePhenotype
from sqlmodel import Session, select

from extractors.models import HPOTerm

_PATHOGENIC = {"pathogenic", "likely_pathogenic", "pathogenic/likely_pathogenic"}
_HIGH_CONFIDENCE = 0.9


def _parse_clnsig(info: dict) -> set[str]:
    raw = info.get("CLNSIG", "")
    if isinstance(raw, (list, tuple)):
        raw = raw[0] if raw else ""
    return {s.strip().lower().replace(" ", "_") for s in re.split(r"[,|;&]", str(raw)) if s.strip()}


def _parse_gene_symbols(info: dict) -> list[str]:
    """Extract gene symbols from GENEINFO field: 'GENE1:1234|GENE2:5678'."""
    raw = info.get("GENEINFO", "")
    if isinstance(raw, (list, tuple)):
        raw = raw[0] if raw else ""
    symbols = []
    for part in str(raw).split("|"):
        gene = part.split(":")[0].strip()
        if gene:
            symbols.append(gene)
    return symbols


def extract_vcf(vcf_bytes: bytes, db_engine) -> list[HPOTerm]:
    """Extract high-confidence HPO terms from a VCF file.

    Pipeline: pathogenic variants → gene symbols → ClinVar disease lookup →
    disease-phenotype table → HPO terms (confidence 0.9).
    """
    try:
        import cyvcf2
    except ImportError:
        return []

    genes_found: set[str] = set()

    with tempfile.NamedTemporaryFile(suffix=".vcf", delete=False) as tmp:
        tmp.write(vcf_bytes)
        tmp_path = tmp.name

    try:
        vcf = cyvcf2.VCF(tmp_path)
        for variant in vcf:
            clnsig = _parse_clnsig(dict(variant.INFO))
            if _PATHOGENIC & clnsig:
                genes_found.update(_parse_gene_symbols(dict(variant.INFO)))
    finally:
        os.unlink(tmp_path)

    if not genes_found:
        return []

    with Session(db_engine) as session:
        # gene → diseases from ClinVar
        orpha_codes: set[int] = set()
        gene_to_disease: dict[str, list[str]] = {}
        for gene in genes_found:
            rows = session.exec(
                select(ClinVarGeneDisease).where(ClinVarGeneDisease.gene_symbol == gene)
            ).all()
            if rows:
                gene_to_disease[gene] = [r.disease_name for r in rows]

        # Map ClinVar disease names to orpha codes via disease table
        # (ClinVar doesn't have orpha codes directly — use gene→disease_gene→orpha)
        from ingest.models import DiseaseGene

        for gene in genes_found:
            dg_rows = session.exec(select(DiseaseGene).where(DiseaseGene.gene_symbol == gene)).all()
            for dg in dg_rows:
                orpha_codes.add(dg.orpha_code)

        if not orpha_codes:
            return []

        # Get HPO phenotypes for all matched diseases
        seen: dict[str, HPOTerm] = {}
        for orpha_code in orpha_codes:
            dp_rows = session.exec(
                select(DiseasePhenotype).where(DiseasePhenotype.orpha_code == orpha_code)
            ).all()
            for dp in dp_rows:
                if dp.hpo_id not in seen and dp.frequency_weight >= 0.5:
                    gene_source = next(iter(genes_found))
                    seen[dp.hpo_id] = HPOTerm(
                        hpo_id=dp.hpo_id,
                        confidence=_HIGH_CONFIDENCE * dp.frequency_weight,
                        source=gene_source,
                        assertion="present",
                        source_type="vcf",
                    )

    return list(seen.values())
