import type { CaseData, HPOTerm, RankResult } from "@/types/lumina";

const API = "/api";

export async function submitNotes(notes: string): Promise<HPOTerm[]> {
  const res = await fetch(`${API}/intake/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error("Notes extraction failed");
  return res.json();
}

export async function submitPhoto(file: File, facial = false): Promise<HPOTerm[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/intake/photo?facial=${facial}`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Photo extraction failed");
  return res.json();
}

export async function submitLab(file: File): Promise<HPOTerm[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/intake/lab`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Lab extraction failed");
  return res.json();
}

export async function submitVcf(file: File): Promise<HPOTerm[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/intake/vcf`, { method: "POST", body: form });
  if (!res.ok) throw new Error("VCF extraction failed");
  return res.json();
}

export async function scoreCase(terms: HPOTerm[], topK = 10, modalities = 1): Promise<RankResult[]> {
  const res = await fetch(`${API}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terms, top_k: topK, modalities }),
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

export async function* streamLetter(caseData: CaseData, lang = "en"): AsyncGenerator<string> {
  const res = await fetch(`${API}/agent/letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      top5: caseData.rankings.slice(0, 5),
      evidence: { hpo_terms: caseData.hpoTerms, modalities: caseData.modalities },
      patient_context: caseData.patientContext ?? {},
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
  localStorage.setItem(`lumina_case_${caseData.id}`, JSON.stringify(caseData));
  const summaries = getCaseSummaries();
  const summary = {
    id: caseData.id,
    timestamp: caseData.timestamp,
    topDiagnosis: caseData.rankings[0]?.name ?? "Unknown",
    confidence: caseData.rankings[0]?.confidence ?? 0,
    modalities: caseData.modalities,
    hpoCount: caseData.hpoTerms.length,
    patientName: caseData.patientContext?.patientName,
  };
  summaries.unshift(summary);
  localStorage.setItem("lumina_cases", JSON.stringify(summaries.slice(0, 50)));
}

export function getCaseSummaries() {
  try {
    return JSON.parse(localStorage.getItem("lumina_cases") ?? "[]");
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
