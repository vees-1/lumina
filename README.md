<div align="center">

# Lumina

**Multimodal clinical decision support for rare disease diagnosis**

[![Live Demo](https://img.shields.io/badge/demo-lumina--sandy--two.vercel.app-black?style=flat-square)](https://lumina-sandy-two.vercel.app)
[![API](https://img.shields.io/badge/API-HuggingFace%20Spaces-orange?style=flat-square)](https://veees-lumina-api.hf.space)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

</div>

---

## The problem

There are over **7,000 recognised rare diseases**. The average patient visits 7–8 specialists across 4–5 years before receiving a correct diagnosis. The bottleneck is not access to information — it is the **differential diagnosis step**: knowing which diseases to consider when a presentation is atypical.

No clinician can hold 7,000 disease phenotypes in working memory. Lumina solves this by instantly ranking the entire Orphanet disease catalogue against whatever clinical evidence is available — notes, photos, labs, or genomic data — and returning a scored differential with the specific phenotypic evidence driving each result.

It does not replace clinical judgement. It gives clinicians a structured, evidence-backed starting point across the full landscape of rare disease — including diseases they may never have encountered.

---

## Architecture

```
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
```

---

## How scoring works

### HPO as the universal interlingua

Every modality — clinical text, photographs, lab values, VCF variants — is first converted into a list of **HPO terms** (Human Phenotype Ontology IDs) with confidence weights. This is the core design decision. Because all four modalities emit the same representation, the scoring engine is fully modality-agnostic and requires no AI.

### Lin semantic similarity

HPO is a directed acyclic graph ordered from broad to specific. Each term carries an **information content (IC)** value derived from how frequently it appears across all 11,456 disease annotations — rarer, more specific terms score higher.

Lin similarity between two terms is:

```
lin(a, b) = 2 × IC(lowest common ancestor) / ( IC(a) + IC(b) )
```

For each patient, the ranker computes Lin similarity between every patient HPO term and every annotated phenotype for every disease in the database, takes the best match per query term (weighted by phenotype frequency in the disease), and averages across all query terms. The result is a scored ranking of all 11,456 diseases by phenotypic overlap — **no language model involved**.

### Modality-aware confidence caps

Confidence is capped based on how many modalities were submitted. A single data source is a lead, not a diagnosis — the cap reflects this honestly and encourages clinicians to gather corroborating evidence.

| Modalities used | Confidence ceiling |
|:---|:---|
| 1 | 40% |
| 2 | 55% |
| 3 | 65% |
| 4 | 80% |

---

## AI usage

AI handles only the **extraction** step — converting raw clinical inputs into HPO terms. Everything downstream is deterministic.

| Task | Method |
|:---|:---|
| Clinical notes → HPO | Groq Llama 3.3 70B + keyword fallback |
| Clinical photo → HPO | Groq Llama 4 Scout Vision + FGDD facial vocabulary |
| Lab report → HPO | pytesseract OCR → Groq Llama 3.3 70B |
| Genomic VCF → HPO | cyvcf2 + ClinVar pathogenicity filter + gene → disease → HPO chain |
| Next modality suggestion | Groq Llama 3.3 70B |
| Referral letter | Groq Llama 3.3 70B (streaming SSE) |
| **Scoring & ranking** | **Lin semantic similarity — no AI** |
| **Disease database** | **Orphanet + HPO + ClinVar + FGDD — static, curated** |

If Groq is unavailable, notes extraction falls back to keyword matching against the HPO vocabulary. All other modalities continue to function.

---

## Features

| | |
|:---|:---|
| **4 clinical modalities** | Notes, photo, lab report, genomic VCF — any combination |
| **11,456 rare diseases** | Full Orphanet + HPO + ClinVar + FGDD datasets |
| **Ranked differential** | Top-5 diagnoses with per-disease HPO evidence and confidence |
| **Agent loop** | Suggests which modality to add next based on confidence gap |
| **Referral letter** | AI-drafted specialist referral, streamed to the UI |
| **FHIR export** | R4-compliant bundle for EHR integration |
| **7 languages** | English, Hindi, German, French, Spanish, Chinese, Japanese |
| **No server-side PHI** | All case data lives in browser localStorage only |

---

## Stack

| Layer | Technology |
|:---|:---|
| Frontend | Next.js 16, Tailwind 4, shadcn/ui, Clerk |
| Backend | FastAPI, Python 3.13, uv |
| Scoring | Resnik/Lin semantic similarity |
| Extraction | Groq (Llama 3.3 70B, Llama 4 Scout Vision) |
| Database | SQLite (orpha.sqlite) — Orphanet + HPO + ClinVar + FGDD |
| Deployment | Vercel (frontend) · HuggingFace Spaces cpu-basic (API) |

---

## Local development

```bash
pnpm install

# Frontend → localhost:3000
cd apps/web && pnpm dev

# API → localhost:8000
cd apps/api && uv sync && uv run uvicorn main:app --reload
```

**Lint & typecheck**

```bash
pnpm typecheck && pnpm lint
cd apps/api && uv run ruff check .
```
