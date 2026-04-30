<div align="center">

# Lumina

**Clinical search engine for rare disease diagnosis**

[![Live Demo](https://img.shields.io/badge/demo-lumina--sandy--two.vercel.app-black?style=flat-square)](https://lumina-sandy-two.vercel.app)
[![API](https://img.shields.io/badge/API-HuggingFace%20Spaces-orange?style=flat-square)](https://veees-lumina-api.hf.space)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

</div>

---

Lumina converts clinical data (notes, images, labs, genomics) into **HPO terms** and ranks **11,456 rare diseases** by phenotypic overlap. It acts as a decision support system — helping clinicians explore the full rare disease space in seconds, not years.

---

## Architecture

    ┌──────────────────────────────────────────────────────────────────┐
    │                        Browser (Next.js 16)                      │
    │                                                                  │
    │   Clinical Notes   Clinical Photo   Lab Report   Genomic VCF     │
    │       .txt            .jpg/.png      .jpg/.pdf    .vcf/.vcf.gz   │
    └───────────────────────────┬──────────────────────────────────────┘
                                │  /api/* — Vercel proxy rewrite
                                ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │              FastAPI  (HuggingFace Spaces · cpu-basic)           │
    │                                                                  │
    │  /intake/text        /intake/photo     /intake/lab  /intake/vcf  │
    │  Groq Llama 3.3 70B  Groq Llama 4      Groq Llama 4  cyvcf2     │
    │  + keyword fallback  Scout Vision      Scout Vision  → ClinVar   │
    │                                                      → gene→HPO  │
    │                                                                  │
    │            ──── list[(hpo_id, confidence)] ────                  │
    │                            │                                     │
    │                         /score                                   │
    │               Lin semantic similarity                            │
    │               Modality-aware confidence cap                      │
    │               (40 / 55 / 65 / 80% for 1 – 4 modalities)         │
    │                            │                                     │
    │                      orpha.sqlite                                │
    │             11,456 diseases · 200k+ phenotype links              │
    │             HPO IC table · ancestor sets · FGDD vocab            │
    │                            │                                     │
    │                        /agent/*                                  │
    │               Next modality suggestion  (Groq)                   │
    │               Referral letter generation (Groq, streaming SSE)   │
    └──────────────────────────────────────────────────────────────────┘

---

## How it works

All inputs map to **HPO (Human Phenotype Ontology)**, enabling unified representation and deterministic scoring.

**Scoring**: Lin semantic similarity (no LLM involved in ranking)
```
lin(a, b) = 2 × IC(LCA) / (IC(a) + IC(b))
```

**Confidence caps** (by modalities): 40% (1) → 55% (2) → 65% (3) → 80% (4)  
Prevents overconfidence and encourages multi-modality evidence.

---

## AI usage

AI is used **only for extraction**, not decision-making.

| Task | Method |
|:--|:--|
| Notes → HPO | Llama 3.3 + keyword fallback |
| Image → HPO | Llama 4 Vision + FGDD |
| Lab → HPO | OCR + Llama |
| VCF → HPO | ClinVar pipeline |
| Suggestions / letter | Llama 3.3 |
| **Scoring** | **Deterministic (Lin similarity)** |

---

## Features

| | |
|:--|:--|
| Modalities | Notes, image, lab, VCF |
| Diseases | 11,456 (Orphanet + HPO + ClinVar) |
| Ranking | Phenotype overlap with evidence |
| Agent | Suggests next best modality |
| Export | FHIR (R4), referral letter |
| Languages | 7 supported |
| Privacy | Local-only (no server PHI) |

---

## FAQ

**Can the AI extraction step hallucinate HPO terms?**

Yes, but mitigations are in place: constrained vocabulary (top 2k HPO terms only), temperature 0 (deterministic), ranker validation (invalid IDs dropped), keyword fallback (regex if Groq fails), and VCF extraction is fully deterministic (no AI). The remaining risk is plausible-but-wrong mappings — which is why confidence ceilings are conservative.

**What does the confidence score mean?**

Relative ranking, not absolute probability. Top result scaled to modality ceiling; others ranked relative to it.

**Is this a diagnostic tool?**

No. Decision support only — not a replacement for clinicians.

---

## Stack

| Layer | Tech |
|:--|:--|
| Frontend | Next.js 16, Tailwind, shadcn/ui |
| Backend | FastAPI, Python 3.13 |
| Scoring | Lin similarity |
| AI | Groq (Llama models) |
| DB | SQLite (Orphanet + HPO) |
| Deploy | Vercel + HuggingFace Spaces |

---

## Local development

    pnpm install

    cd apps/web && pnpm dev
    cd apps/api && uv sync && uv run uvicorn main:app --reload

    pnpm typecheck && pnpm lint
    cd apps/api && uv run ruff check .
