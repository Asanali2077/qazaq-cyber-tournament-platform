import { z } from "zod";

export const participantIdSchema = z.object({
  id: z.string().uuid()
});

export const matchIdSchema = z.object({
  id: z.string().uuid()
});

export const updateMatchResultSchema = z.object({
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  forceEdit: z.boolean().optional().default(false)
});
