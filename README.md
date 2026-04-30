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

## FAQ

**Why not just paste this into ChatGPT or Claude?**

For common diseases, a general-purpose LLM works fine. For rare diseases, there are four structural problems:

1. **Coverage.** ChatGPT will suggest 3–5 diseases it pattern-matches from training data. Lumina scores all 11,456 Orphanet diseases simultaneously. The correct diagnosis might be #8 on the ranked list — it will surface even if no clinician in the room has ever seen the disease.

2. **Hallucination on phenotype associations.** When an LLM says "this presentation is consistent with X syndrome," it is generating from learned statistical patterns, not from curated data. It can confidently describe features a disease does not actually have. Lumina's ranking is derived from Orphanet's annotated disease–phenotype links — if a disease scores high, it is because your patient's HPO terms actually overlap with that disease's curated annotations.

3. **Quantified, grounded confidence.** "Most likely X" is not a confidence score. Lumina's scores come from Lin semantic similarity over the HPO ontology — they are mathematically derived, not vibes. The modality caps (40/55/65/80%) are deliberately conservative and reflect how much evidence was actually provided.

4. **Reproducibility and auditability.** Same input → same ranked output, every time. A clinician can inspect exactly which HPO terms drove each result and which annotated phenotypes they matched. ChatGPT's answer varies between runs and leaves no auditable trail.

The referral letter is drafted by the same class of model as ChatGPT. The core value is not the AI — it is the systematic, exhaustive, ontology-grounded search across rare diseases that no general-purpose LLM performs reliably.

---

**What does the confidence score actually mean?**

It is a relative score, not an absolute probability. The top-ranked disease is always calibrated to the confidence ceiling for the number of modalities used (e.g. 40% for a single modality). All other diseases are scored relative to that ceiling. A 40% score does not mean there is a 40% chance the patient has that disease — it means the phenotypic overlap is as strong as a single-modality case can support. Adding more modalities raises the ceiling and sharpens the differential.

---

**Is patient data safe?**

No clinical data is stored on the server. Case data — HPO terms, rankings, notes — lives entirely in browser localStorage and is never persisted beyond the session. The only data that leaves the browser is the raw clinical input sent to the extraction API (HuggingFace Spaces) for HPO mapping. Lumina is not HIPAA-certified and should not be used with identifiable patient data in a production clinical setting.

---

**Can I use it with only one type of data?**

Yes. Any single modality works — notes, photo, lab report, or VCF file. The confidence ceiling for a single modality is 40%, which is intentional: one data source gives you a plausible lead, not a diagnosis. The agent loop will suggest which modality to add next to improve confidence.

---

**Can this be used to make a clinical diagnosis?**

No. Lumina is a decision support tool, not a diagnostic device. It is designed to help clinicians think outside the box and surface rare diseases they might not consider — not to replace clinical examination, specialist input, or confirmatory testing. Do not use Lumina as the sole basis for any clinical decision.

---

**How current is the disease database?**

The database is built from a static snapshot of Orphanet XML exports, HPO (hp.obo + phenotype.hpoa), ClinVar variant summaries, and the FGDD facial phenotype dataset. It is not updated in real time. The Orphanet dataset used covers 11,456 diseases with over 200,000 phenotype links.

---

## Local development

    pnpm install

    cd apps/web && pnpm dev
    cd apps/api && uv sync && uv run uvicorn main:app --reload

    pnpm typecheck && pnpm lint
    cd apps/api && uv run ruff check .
