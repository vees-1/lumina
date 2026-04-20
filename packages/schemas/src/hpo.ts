import { z } from "zod";

export const HPOTermSchema = z.object({
  hpo_id: z.string(),
  confidence: z.number().min(0).max(1),
  source: z.string(),
});

export type HPOTerm = z.infer<typeof HPOTermSchema>;
