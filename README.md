<div align="center">

# Lumina

**Doctor-reviewed rare disease triage and differential diagnosis support**

[![Frontend](https://img.shields.io/badge/frontend-Vercel-black?style=flat-square)](https://lumina-sandy-two.vercel.app)
[![API](https://img.shields.io/badge/API-Hugging%20Face%20Spaces-orange?style=flat-square)](https://veees-lumina-api.hf.space)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

</div>

---

## What Is Lumina?

Lumina is a clinical decision-support prototype for rare disease diagnosis.

Rare diseases are hard to diagnose because the useful evidence is usually scattered across clinical notes, visible physical features, lab reports, and genetic findings. Lumina brings those inputs into one workflow, converts them into reviewed HPO phenotype findings, and ranks possible rare diseases using Orphanet/HPO data.

The important design idea is **doctor-in-the-loop**:

- AI can suggest findings.
- The doctor must accept or reject those findings.
- Only accepted findings are used for final scoring.
- Genetic evidence is entered manually from a clinical report and receives strong weight when it supports a disease.

Lumina is **not a medical device** and does not replace a doctor. It is a research/prototype system for making rare disease triage faster, more explainable, and easier to review.

---

## Why This Project Exists

In a real clinical exam, typing long notes and manually searching rare disease databases is slow. A doctor needs something that can:

- capture patient evidence quickly,
- suggest likely HPO phenotypes,
- show where each finding came from,
- let the doctor approve or reject AI suggestions,
- rank possible rare diseases,
- explain what evidence supports each diagnosis,
- show what important findings are missing,
- generate a referral letter that can still be edited.

Lumina was built around that workflow.

---

## Current Clinical Workflow

1. The doctor opens the intake page.
2. The doctor enters patient context such as name, age, and sex.
3. The doctor adds evidence through four input sections:
   - clinical notes,
   - clinical photo,
   - lab report,
   - genetic evidence.
4. Notes can be typed, dictated by voice, or built with quick present/absent symptom chips.
5. AI suggests HPO findings from notes, photos, and lab reports.
6. Suggested findings remain pending until the doctor accepts or rejects them.
7. The doctor enters genetic evidence manually from a clinical/genetic report.
8. Lumina runs the final differential only on accepted HPO findings and reviewed genetic evidence.
9. The results page shows the top 10 differential diagnoses with supporting evidence, missing findings, and distinguishing clues.
10. The doctor can generate and edit a referral letter.

---

## What The Doctor Sees

### Intake Page

The intake page is designed as a clinical workspace, not a simple form.

It includes:

- patient context,
- clinical notes with voice input,
- quick symptom checklist with present/absent options,
- clinical photo upload,
- lab report upload,
- manual genetic evidence,
- review findings panel,
- accept/reject controls for AI-suggested phenotypes,
- final differential button.

The doctor does not need to understand raw HPO IDs during normal use. The UI shows phenotype names, and extra details can be shown through hover/tooltips.

### Results Page

The results page shows:

- top 10 differential diagnoses,
- evidence-strength confidence,
- matched findings,
- findings expected for a disease but not present in the input,
- findings unique to a diagnosis,
- absent findings that reduce confidence,
- HPO provenance,
- deterministic/reproducible result signal,
- editable referral letter.

---

## Architecture

Lumina is a monorepo with a Next.js frontend, a FastAPI backend, and shared Python packages.

```text
User / Doctor
   |
   v
Next.js frontend on Vercel
apps/web
   |
   |  Handles:
   |  - login and localized UI
   |  - intake workflow
   |  - voice notes
   |  - quick symptom checklist
   |  - doctor review of AI suggestions
   |  - case dashboard
   |  - result explanation
   |  - editable referral letter UI
   |
   v
FastAPI backend on Hugging Face Spaces
apps/api
   |
   |  Handles:
   |  - text/photo/lab HPO suggestion APIs
   |  - score API
   |  - disease detail API
   |  - referral letter API
   |  - legacy VCF parsing route
   |
   v
Shared Python packages
packages/
   |
   |  packages/extractors
   |  - extracts and validates HPO suggestions
   |
   |  packages/scoring
   |  - deterministic disease ranking
   |  - evidence-strength scoring
   |  - missing/distinguishing findings
   |
   |  packages/ingest
   |  - builds local disease/HPO data assets
   |
   |  packages/schemas
   |  - shared schema/type definitions
   |
   v
Local data assets
data/orpha.sqlite
   |
   |  Contains disease, phenotype, gene, and relationship data
   v
Ranked differential diagnosis
```

## How Lumina Was Made

Lumina was built as a web application with a separate API.

The frontend focuses on the doctor experience. It collects the case data, shows AI suggestions, lets the doctor review them, and presents the final diagnosis explanation.

The backend focuses on clinical logic. It extracts HPO phenotype suggestions, validates them, scores diseases, and generates referral letters.

The data layer uses rare disease knowledge sources such as HPO, Orphanet, ClinVar, and FGDD-derived assets. These are converted into a local database so the API can rank diseases without asking an LLM to invent the answer.

The final diagnosis ranking is deterministic. This means that the same accepted evidence should produce the same result, which is important for clinical trust.

## Data Flow

```text
Doctor input
  |
  |-- clinical notes
  |-- clinical photo
  |-- lab report
  |-- manual genetic evidence
  v
AI / extraction layer
  |
  |-- suggests HPO phenotypes
  |-- validates HPO IDs against local data
  |-- stores source/provenance
  v
Doctor review
  |
  |-- accept useful findings
  |-- reject wrong findings
  |-- leave pending findings out of scoring
  v
Scoring engine
  |
  |-- matches accepted HPO terms to Orphanet diseases
  |-- applies absent finding penalties
  |-- adds genetic evidence support
  |-- returns top 10 differential diagnoses
  v
Results page
  |
  |-- explains why each disease is ranked
  |-- shows missing findings
  |-- shows distinguishing clues
  |-- supports referral letter generation
```

### Frontend: `apps/web`

The frontend is a Next.js application deployed on Vercel.

It contains:

- app routes for landing, dashboard, intake, case detail, disease detail, and referral letter pages,
- reusable UI components,
- localized message files for 7 languages,
- browser-side case management,
- localStorage case persistence,
- doctor review state for pending/accepted/rejected findings,
- API client logic for calling the FastAPI backend.

Current frontend limitation: cases are still stored mainly in browser localStorage, so a production version needs server-side persistence.

### Backend: `apps/api`

The backend is a FastAPI service deployed on Hugging Face Spaces.

It contains:

- HPO suggestion endpoints for clinical notes, photos, and lab reports,
- score endpoint for final differential diagnosis,
- disease detail endpoint,
- referral letter generation endpoint,
- compatibility routes for older intake flows,
- legacy VCF parsing route that is kept in backend but hidden from the main UI.

Only the API/backend subset should be deployed to Hugging Face. The frontend belongs on Vercel.

### Shared Packages: `packages/*`

The shared Python packages contain most of the clinical logic.

`packages/extractors`:

- text extraction,
- photo/vision extraction,
- lab report extraction,
- HPO validation,
- fallback matching when model extraction fails.

`packages/scoring`:

- disease ranking,
- HPO similarity,
- accepted/absent phenotype handling,
- genetic support weighting,
- missing findings,
- distinguishing features,
- evidence-strength confidence.

`packages/ingest`:

- Orphanet/HPO/ClinVar data preparation,
- local database building,
- disease-gene-phenotype relationship loading.

`packages/schemas`:

- shared schema definitions used across backend and frontend-facing payloads.

---

## How Scoring Works

Lumina does not ask an LLM to directly choose the final diagnosis.

The scoring flow is:

1. AI or rules suggest HPO findings.
2. The doctor accepts or rejects each suggestion.
3. Rejected and pending findings are ignored for scoring.
4. Accepted present findings increase support for diseases linked to those phenotypes.
5. Accepted absent findings reduce support for diseases where those findings are expected.
6. Manual pathogenic genetic evidence strongly boosts diseases linked to that gene.
7. VUS/uncertain genetic evidence does not dominate the score.
8. The backend returns the top 10 ranked diseases.

This makes the result more explainable than a pure chatbot answer.

---

## What Has Been Built So Far

### Clinical Intake

- Four main input sections: clinical notes, clinical photo, lab report, genetic evidence.
- Voice input inside clinical notes.
- Quick symptom checklist with present/absent findings.
- Collapsible symptom categories.
- Doctor review panel for pending, accepted, and rejected findings.
- Final differential only runs after review.

### AI HPO Suggestions

- Clinical notes can produce HPO suggestions.
- Clinical photos can produce HPO suggestions.
- Lab reports can produce HPO suggestions.
- Suggestions include label, HPO ID, definition, source, confidence, assertion, and review status.
- AI is allowed to suggest broadly, but returned HPO IDs are validated against the local HPO database.

### Genetic Evidence

- Main workflow uses manual genetic evidence instead of asking doctors to upload VCF files.
- The doctor can enter gene and variant classification from a real clinical/genetic report.
- Pathogenic or likely pathogenic evidence receives high weight.
- VCF parsing still exists in backend code for compatibility, but it is not the main doctor-facing workflow.

### Results

- Top 10 differential diagnoses.
- Evidence-strength confidence instead of always normalizing to 100%.
- Matched phenotype findings.
- Expected but not yet matched findings.
- Distinguishing features between close diagnoses.
- Absent findings that reduce disease confidence.
- HPO provenance so the doctor can audit where findings came from.
- Reproducibility/deterministic signal.

### Case Management

- Dashboard of cases.
- Search by patient, diagnosis, date, and saved text.
- Case outcome tracking: pending, confirmed, ruled out.
- Backup download with clinician-friendly wording.
- Original input shown on the case page.
- Additional evidence can be added to an existing case.

### Referral Letter

- Referral letter generation.
- Editable letter before use.
- Patient, sender, recipient, and urgency fields.
- Letter generation follows the selected UI language.

### Localization

The UI supports 7 locales:

- English,
- Hindi,
- German,
- French,
- Spanish,
- Chinese,
- Japanese.

Numbers on the landing page are locale-aware. HPO labels are localized where official HPO translation files exist. Disease names mostly remain in the source language from Orphanet/source data.

---

## Current Limitations

Lumina is still a prototype. Important limitations:

- It is not clinically certified.
- It has not been validated on a large clinical dataset.
- Cases are not yet stored in a proper database.
- localStorage can be cleared by the browser.
- Photo and lab extraction quality depends on the uploaded file and model/OCR quality.
- The doctor must review AI suggestions to reduce hallucination risk.
- Hindi HPO labels fall back to English where no official HPO Hindi translation exists.
- Disease names are not fully translated.
- The VCF route exists in backend code but is no longer the preferred UI workflow.

---

## Future Plans

Short-term improvements:

- Add proper persistent case storage.
- Add server-side backups and restore.
- Improve lab report OCR reliability.
- Add clearer per-file upload and extraction status.
- Add batch accept/reject for suggested findings.
- Improve the input quality panel before scoring.
- Add more browser tests for notes, photo, lab, genetic evidence, review, and results.

Clinical/product improvements:

- Add audit logs for accepted/rejected findings.
- Track final confirmed or ruled-out diagnoses.
- Compare Lumina's ranking with eventual confirmed outcomes.
- Improve disease detail pages with inheritance, age of onset, prevalence, and confirmatory tests.
- Improve referral letter customization.
- Add stronger safety disclaimers and review history.

Research/data improvements:

- Expand validated HPO matching.
- Improve translated HPO terminology where reliable sources exist.
- Add controlled disease-name localization only where medically accurate.
- Improve disease-gene evidence weighting.
- Add a benchmark dataset for rare disease triage.

Deployment/engineering improvements:

- Add CI checks for frontend build, backend lint, and locale key parity.
- Add automated API tests for extraction and scoring.
- Add end-to-end browser tests for the full doctor workflow.
- Move production secrets and deployment settings into managed platform environments.

---

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| UI | shadcn-style components and custom clinical UI |
| Auth | Clerk |
| Backend | FastAPI, Python |
| AI extraction | Groq-hosted Llama models |
| OCR/PDF | pytesseract, Pillow, pypdf |
| Scoring | Deterministic HPO/Orphanet evidence scoring |
| Data | Orphanet, HPO, ClinVar, FGDD-derived assets |
| Frontend deployment | Vercel |
| API deployment | Hugging Face Spaces |

---

## Repository Map

```text
apps/
  web/
    Next.js frontend
    UI pages, components, localization, dashboard, intake, results

  api/
    FastAPI backend
    API routes for extraction, scoring, diseases, referral letters

packages/
  extractors/
    HPO extraction and validation logic

  scoring/
    Disease ranking and evidence scoring

  ingest/
    Data ingestion/build scripts

  schemas/
    Shared schemas/types

data/
  orpha.sqlite
    Local disease/phenotype/gene graph used by the backend
```

---

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the frontend:

```bash
cd apps/web
pnpm dev
```

Run the API:

```bash
cd apps/api
uv sync
uv run uvicorn main:app --reload
```

Useful checks:

```bash
pnpm typecheck
pnpm lint
cd apps/api && uv run ruff check .
```

Frontend-only checks:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

---

## Deployment Rules

- Deploy the frontend to Vercel.
- Deploy only the API/backend to Hugging Face Spaces.
- Do not deploy the whole repository to Hugging Face.
- Do not deploy frontend code to Hugging Face.
- Do not commit demo patient files, credentials, tokens, or private clinical data.

---

## Project Status

Lumina currently demonstrates a complete prototype flow:

```text
clinical input
  -> AI HPO suggestions
  -> doctor review
  -> accepted evidence only
  -> deterministic rare disease ranking
  -> explainable result
  -> editable referral letter
```

The next major step is making it more production-like: persistent storage, stronger validation, better OCR reliability, proper audit logs, and deeper clinical testing.
