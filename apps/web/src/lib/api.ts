import type { CaseData, CaseOutcome, CaseSummary, GeneticEvidence, HPOTerm, PatientContext, RankResult } from "@/types/lumina";

const API = "/api";
type StoredCaseSummary = CaseSummary & { status: CaseOutcome };

export interface ApiHealth {
  status: string;
  version?: string;
  db?: string;
}

async function extractionError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string" && body.detail.trim()) {
      return new Error(body.detail);
    }
  } catch {}
  return new Error(fallback);
}

export async function getApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const res = await fetch(`${API}/health`, {
    method: "GET",
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function submitNotes(notes: string): Promise<HPOTerm[]> {
  const res = await fetch(`${API}/intake/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error("Notes extraction failed");
  return res.json();
}

export async function suggestNotes(notes: string): Promise<HPOTerm[]> {
  const res = await fetch(`${API}/intake/text/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error("Notes suggestion failed");
  return res.json();
}

export async function submitPhoto(file: File, facial = false): Promise<HPOTerm[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/intake/photo?facial=${facial}`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Photo extraction failed");
  return res.json();
}

export async function suggestPhoto(file: File, facial = false): Promise<HPOTerm[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/intake/photo/suggest?facial=${facial}`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Photo suggestion failed");
  return res.json();
}

export async function submitLab(file: File): Promise<HPOTerm[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/intake/lab`, { method: "POST", body: form });
  if (!res.ok) throw await extractionError(res, "Lab extraction failed");
  return res.json();
}

export async function suggestLab(file: File): Promise<HPOTerm[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/intake/lab/suggest`, { method: "POST", body: form });
  if (!res.ok) throw await extractionError(res, "Lab suggestion failed");
  return res.json();
}

export async function submitVcf(file: File): Promise<HPOTerm[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/intake/vcf`, { method: "POST", body: form });
  if (!res.ok) throw await extractionError(res, "VCF extraction failed");
  return res.json();
}

export async function scoreCase(terms: HPOTerm[], topK = 10, modalities = 1, geneticEvidence: GeneticEvidence[] = []): Promise<RankResult[]> {
  const res = await fetch(`${API}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terms, top_k: topK, modalities, genetic_evidence: geneticEvidence }),
  });
  if (!res.ok) throw new Error("Scoring failed");
  return res.json();
}

export interface AgentSuggestion {
  modality: string;
  reasoning: string;
  cycles_remaining: number;
}

export async function getAgentSuggestion(
  top5: RankResult[],
  modalitiesUsed: string[],
  cycle = 0,
  lang = "en"
): Promise<AgentSuggestion> {
  const res = await fetch(`${API}/agent/next`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ top5, modalities_used: modalitiesUsed, cycle, lang }),
  });
  if (!res.ok) throw new Error("Agent suggestion failed");
  return res.json();
}

export async function* streamLetter(
  caseData: CaseData,
  lang = "en",
  options?: Partial<PatientContext> & { to?: string; from?: string }
): AsyncGenerator<string> {
  const res = await fetch(`${API}/agent/letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      top5: caseData.rankings.slice(0, 5),
      evidence: { hpo_terms: caseData.hpoTerms, modalities: caseData.modalities },
      patient_context: { ...(caseData.patientContext ?? {}), ...options },
      lang,
    }),
  });
  if (!res.ok || !res.body) throw new Error("Letter generation failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        yield JSON.parse(data).text as string;
      } catch {}
    }
  }
}

export function saveCaseToStorage(caseData: CaseData): void {
  const normalizedCase: CaseData = {
    ...caseData,
    outcome: caseData.outcome ?? "pending",
  };
  localStorage.setItem(`lumina_case_${caseData.id}`, JSON.stringify(normalizedCase));
  const summaries = getCaseSummaries();
  const summary: StoredCaseSummary = {
    id: normalizedCase.id,
    timestamp: normalizedCase.timestamp,
    topDiagnosis: normalizedCase.rankings[0]?.name ?? "Unknown",
    confidence: normalizedCase.rankings[0]?.confidence ?? 0,
    modalities: normalizedCase.modalities,
    hpoCount: normalizedCase.hpoTerms.length,
    patientName: normalizedCase.patientContext?.patientName,
    status: normalizedCase.outcome ?? "pending",
  };
  summaries.unshift(summary);
  localStorage.setItem("lumina_cases", JSON.stringify(summaries.slice(0, 50)));
}

export function getCaseSummaries(): StoredCaseSummary[] {
  try {
    const summaries = JSON.parse(localStorage.getItem("lumina_cases") ?? "[]") as StoredCaseSummary[];
    return summaries.map((summary) => ({
      ...summary,
      status: normalizeCaseOutcome(summary.status),
    }));
  } catch {
    return [];
  }
}

export function getCaseById(id: string): CaseData | null {
  try {
    return JSON.parse(localStorage.getItem(`lumina_case_${id}`) ?? "null");
  } catch {
    return null;
  }
}

export function updateCaseInStorage(caseId: string, updated: CaseData): void {
  const summaries = getCaseSummaries();
  const existingStatus = summaries.find((s: CaseSummary) => s.id === caseId)?.status;
  const normalizedCase: CaseData = {
    ...updated,
    outcome: normalizeCaseOutcome(updated.outcome ?? existingStatus),
  };
  localStorage.setItem(`lumina_case_${caseId}`, JSON.stringify(normalizedCase));
  const idx = summaries.findIndex((s: CaseSummary) => s.id === caseId);
  const summary: StoredCaseSummary = {
    id: normalizedCase.id,
    timestamp: normalizedCase.timestamp,
    topDiagnosis: normalizedCase.rankings[0]?.name ?? "Unknown",
    confidence: normalizedCase.rankings[0]?.confidence ?? 0,
    modalities: normalizedCase.modalities,
    hpoCount: normalizedCase.hpoTerms.length,
    patientName: normalizedCase.patientContext?.patientName,
    status: normalizedCase.outcome ?? "pending",
  };
  if (idx >= 0) summaries[idx] = summary;
  else summaries.unshift(summary);
  localStorage.setItem("lumina_cases", JSON.stringify(summaries.slice(0, 50)));
}

export function exportAllCases(): void {
  const summaries = getCaseSummaries();
  const full = summaries.map((summary: StoredCaseSummary) => {
    try {
      const caseData = JSON.parse(localStorage.getItem(`lumina_case_${summary.id}`) ?? "null") as CaseData | null;
      if (!caseData) return summary;
      return {
        ...caseData,
        outcome: normalizeCaseOutcome(caseData.outcome ?? summary.status),
      };
    } catch {
      return summary;
    }
  }).filter(Boolean);
  const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lumina_cases_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function normalizeCaseOutcome(outcome?: string | null): CaseOutcome {
  if (outcome === "confirmed" || outcome === "ruled_out" || outcome === "pending") return outcome;
  return "pending";
}
