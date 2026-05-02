<div align="center">

# Lumina

**Doctor-reviewed clinical decision-support prototype for rare disease triage**

[![Live Demo](https://img.shields.io/badge/frontend-Vercel-black?style=flat-square)](https://lumina-sandy-two.vercel.app)
[![API](https://img.shields.io/badge/API-HuggingFace%20Spaces-orange?style=flat-square)](https://veees-lumina-api.hf.space)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

</div>

---

Lumina helps clinicians turn messy rare-disease evidence into a reviewed differential diagnosis. It accepts clinical notes, clinical photos, lab reports, and manual genetic evidence. AI proposes HPO phenotypes, the doctor accepts or rejects them, and only accepted evidence enters deterministic Orphanet/HPO ranking.

Lumina is **decision support only**. It is not a medical device and does not replace a clinician.

---

## Current Workflow

1. A doctor enters a case through `apps/web`.
2. Clinical notes can be typed, dictated by voice, or built quickly with present/absent symptom chips.
3. Clinical photos and lab reports are sent to the API for HPO suggestions.
4. Suggested HPO findings stay pending until the doctor accepts or rejects them.
5. Manual genetic evidence is entered directly from clinical reports instead of exposing VCF upload in the main UI.
6. The scoring API ranks diseases using only accepted HPO terms plus reviewed genetic evidence.
7. Results show top 10 differentials, HPO provenance, expected-but-missing findings, differentiating clues, and an editable referral letter.

---

## Architecture

```text
Browser / Next.js 16 on Vercel
  apps/web
  - intake workflow
  - doctor review of HPO suggestions
  - dashboard and case storage in localStorage
  - result explanation, referral letter UI, FHIR export
  - 7 UI locales
  - official HPO label localization where upstream HPO translations exist

        /api/* proxy
             |
             v

FastAPI on Hugging Face Spaces
  apps/api
  - /intake/text and /intake/text/suggest
  - /intake/photo and /intake/photo/suggest
  - /intake/lab and /intake/lab/suggest
  - /intake/vcf kept as backend compatibility/dead UI path
  - /score
  - /disease/{orpha}
  - /agent/next and /agent/letter

        shared Python packages
             |
             v

packages/extractors -> HPO extraction and validation
packages/scoring    -> deterministic ranker, similarity, genetic support
packages/ingest     -> Orphanet/HPO/ClinVar/FGDD database build
data/orpha.sqlite   -> local rare-disease graph used by the API
```

---

## What Has Been Built

### Clinician-in-the-loop intake

- Four doctor-facing inputs: clinical notes, clinical photo, lab report, genetic evidence.
- Voice input is part of clinical notes.
- Quick symptom checklist supports present/absent entries and writes localized text into the note.
- Clinical photo and lab report upload produce pending HPO suggestions.
- Doctors accept or reject suggestions before scoring.
- Pending and rejected terms do not affect ranking.
- Manual genetic evidence replaces the main doctor-facing VCF upload workflow.

### HPO extraction

- Notes extraction uses Groq plus keyword fallback.
- Photo extraction uses vision model prompts and HPO validation.
- Lab extraction supports OCR/text extraction paths and clearer failure messaging.
- Extraction prompts are no longer limited to a small 2k HPO vocabulary block; returned HPO IDs are validated against the local HPO database.
- Suggestions include HPO ID, label, definition, source text, source type, confidence, assertion, and review status.

### Scoring and results

- Scoring is deterministic, not LLM-based.
- Only accepted HPO terms are scored.
- Absent findings penalize diseases where those phenotypes are expected.
- Manual pathogenic genetic evidence strongly boosts linked diseases but confidence is capped.
- Top 10 differential diagnoses are shown.
- Confidence is evidence-strength based and no longer normalizes the best result to 100%.
- Result cards show contributing findings, expected-but-not-in-input findings, differentiating clues, and HPO provenance.

### Case management

- Dashboard search by patient, diagnosis, date, and note text.
- Outcome tracking supports pending, confirmed, and ruled out.
- Backup download button uses clinician-friendly wording.
- Cases currently live in browser localStorage.
- Case page shows original input and later additions.

### Referral and export

- Referral letter generation streams from the API.
- Letter is editable before use.
- Patient/sender/recipient/urgency fields are supported.
- Letter generation is instructed to use the selected UI language.
- FHIR export remains available from the case page.

### Localization

- UI has 7 locales: English, Hindi, German, French, Spanish, Chinese, Japanese.
- Referral letters are generated in the selected language.
- HPO labels are localized using official HPO translation files where available:
  - Spanish, French, Japanese, Chinese have broad official coverage.
  - German has partial official coverage.
  - Hindi has no official HPO translation profile, so HPO labels fall back to English.
- Disease names remain from Orphanet/source data and are mostly English.

### Deployment

- Frontend is deployed on Vercel.
- API is deployed on Hugging Face Spaces.
- Only the API/backend subset should be pushed to Hugging Face.
- Do not push frontend or whole repo to Hugging Face.

---

## Important Current Limitations

- Browser localStorage is still the main case store.
- No server-side account-linked persistence yet.
- No audited clinical validation dataset yet.
- Hindi HPO terminology falls back to English because no official HPO Hindi profile was found.
- Clinical photo and lab extraction depend on OCR/model quality and should remain doctor-reviewed.
- VCF parsing still exists in backend code, but it is hidden from the main doctor-facing UI.
- This is not a certified clinical product.

---

## Future Plans

- Add real persistent case storage tied to authenticated users.
- Add organization/clinic-level backup and restore.
- Add stronger end-to-end browser tests for notes/photo/lab/genetic workflows.
- Add a better input-quality panel before final scoring.
- Improve lab/PDF OCR reliability and clearer per-file extraction status.
- Expand doctor review UX with batch accept/reject and better provenance.
- Add a controlled translated terminology strategy for disease names where reliable sources exist.
- Add structured outcome feedback for confirmed/ruled-out diagnoses.
- Add analytics to compare Lumina ranking vs eventual diagnosis.
- Add clinical disclaimers and audit logs suitable for serious deployment.
- Add CI checks for locale key parity and HPO label map loading.

---

## Stack

| Layer | Tech |
|:--|:--|
| Frontend | Next.js 16, React, Tailwind, shadcn-style UI |
| Auth | Clerk |
| Backend | FastAPI, Python, SQLModel |
| AI extraction | Groq Llama models |
| OCR/PDF | pytesseract, pypdf, Pillow |
| Scoring | Deterministic HPO semantic similarity + evidence-strength scoring |
| Data | Orphanet, HPO, ClinVar, FGDD-derived assets |
| Frontend deploy | Vercel |
| API deploy | Hugging Face Spaces |

---

## Local Development

```bash
pnpm install
cd apps/web && pnpm dev
cd apps/api && uv sync && uv run uvicorn main:app --reload
pnpm typecheck && pnpm lint
cd apps/api && uv run ruff check .
```

---

## Validation Commands

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
cd apps/api && uv run ruff check .
```

