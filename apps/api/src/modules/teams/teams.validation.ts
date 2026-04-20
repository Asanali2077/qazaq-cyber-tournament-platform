import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(2).max(60),
  logoUrl: z.string().url().optional().or(z.literal("")).transform((value) => value || undefined)
});

export const joinTeamSchema = z.object({
  inviteCode: z.string().min(4).max(20)
});
