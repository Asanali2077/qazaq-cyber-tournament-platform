import { z } from "zod";
import { TOURNAMENT_FORMATS } from "../../types/domain";

export const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  game: z.string().min(2).max(100),
  format: z.enum(TOURNAMENT_FORMATS),
  startDate: z.string().datetime(),
  registrationClosesAt: z.string().datetime()
});

export const tournamentIdSchema = z.object({
  id: z.string().uuid()
});

export const registerTeamSchema = z.object({
  teamId: z.string().uuid()
});
