<div align="center">

# Lumina

**Clinical search engine for rare disease diagnosis**

[![Live Demo](https://img.shields.io/badge/demo-lumina--sandy--two.vercel.app-black?style=flat-square)](https://lumina-sandy-two.vercel.app)
[![API](https://img.shields.io/badge/API-HuggingFace%20Spaces-orange?style=flat-square)](https://veees-lumina-api.hf.space)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

</div>

---

## What it does

Lumina converts clinical data (notes, images, labs, genomics) into **HPO terms** and ranks **11,456 rare diseases** by phenotypic overlap.

It acts as a **decision support system** — helping clinicians explore the full rare disease space, not just what they remember.

---

## The problem

- **7,000+ rare diseases**
- **4–5 years** average time to diagnosis
- **7–8 specialists** per patient

The bottleneck is not access to information — it is **differential diagnosis**.

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

## Core idea

All inputs are mapped to **HPO (Human Phenotype Ontology)**.

This enables:
- Unified representation across modalities  
- Deterministic scoring  
- No AI dependency in ranking  

---

## Scoring

### Lin semantic similarity

    lin(a, b) = 2 × IC(LCA) / (IC(a) + IC(b))

- Measures semantic similarity between phenotypes  
- Uses information content from Orphanet  
- Ranks diseases by phenotypic overlap  

No LLM is involved in scoring.

---

### Confidence caps

| Modalities | Max confidence |
|:--|:--|
| 1 | 40% |
| 2 | 55% |
| 3 | 65% |
| 4 | 80% |

- Prevents overconfidence  
- Encourages adding more evidence  

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

- 4 modalities: notes, image, lab, VCF  
- 11,456 diseases (Orphanet + HPO + ClinVar + FGDD)  
- Ranked differential with phenotype evidence  
- Agent suggests next best modality  
- Referral letter generation  
- FHIR export (R4)  
- 7 languages  
- No server-side PHI (localStorage only)  

---

## FAQ

### Why not just use ChatGPT or Claude?

- LLMs suggest a few diseases → Lumina ranks all  
- LLMs hallucinate → Lumina uses curated data  
- No real confidence → Lumina uses ontology-based scoring  
- Not reproducible → Lumina is deterministic  

> AI is used only for extraction

---

### Can the AI extraction step hallucinate HPO terms?

Yes. The notes and photo extractors use Groq/Llama to map clinical findings to HPO IDs. Several mitigations are in place:

- **Constrained vocabulary** — notes extraction passes the top 2,000 HPO terms to the model; it can only assign IDs from that list  
- **Temperature 0** — deterministic sampling, no creative generation  
- **Ranker validation** — any HP: ID not present in the ontology is silently dropped before scoring  
- **Keyword fallback** — if Groq returns nothing for notes, regex matching against the HPO vocabulary is used instead  
- **VCF is deterministic** — genomic extraction uses no AI at all  

The remaining risk is a *plausible-but-wrong* mapping: a real HP: ID that exists in the ontology but does not match the actual finding. This is why confidence ceilings are deliberately conservative and why multi-modality corroboration is recommended.

---

### What does the confidence score mean?

- Relative score, not probability  
- Top result scaled to modality ceiling  
- Others ranked relative to it  

---

### Is this a diagnostic tool?

No.  
Decision support only — not a replacement for clinicians.

---

### How current is the data?

- Static snapshot  
- Orphanet + HPO + ClinVar + FGDD  
- 11,456 diseases, 200k+ phenotype links  

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
