import { z } from "zod";
import { HPOTermSchema } from "./hpo";

export const RankedDiseaseSchema = z.object({
  orpha_code: z.string(),
  name: z.string(),
  confidence: z.number().min(0).max(1),
  icd10: z.string().nullable(),
  contributing_terms: z.array(HPOTermSchema),
});

export type RankedDisease = z.infer<typeof RankedDiseaseSchema>;

export const ScoreRequestSchema = z.object({
  terms: z.array(HPOTermSchema),
  age_range: z.string().optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  inheritance: z.string().optional(),
});

export type ScoreRequest = z.infer<typeof ScoreRequestSchema>;

export const AgentSuggestionSchema = z.object({
  modality: z.string(),
  reasoning: z.string(),
  cycles_remaining: z.number(),
});

export type AgentSuggestion = z.infer<typeof AgentSuggestionSchema>;
