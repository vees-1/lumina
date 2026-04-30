export interface HPOTerm {
  hpo_id: string;
  confidence: number;
  source: string;
}

export interface RankResult {
  orpha_code: number;
  name: string;
  score: number;
  confidence: number;
  contributing_terms: string[];
}

export interface CaseData {
  id: string;
  timestamp: number;
  notes?: string;
  modalities: string[];
  hpoTerms: HPOTerm[];
  rankings: RankResult[];
  patientContext?: { patientName?: string; age?: string; sex?: string };
}

export interface CaseSummary {
  id: string;
  timestamp: number;
  topDiagnosis: string;
  confidence: number;
  modalities: string[];
  hpoCount: number;
  patientName?: string;
}
