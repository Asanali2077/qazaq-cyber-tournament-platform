import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { tournamentsService } from "./tournaments.service";
import {
  createTournamentSchema,
  registerTeamSchema,
  tournamentIdSchema
} from "./tournaments.validation";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tournaments = await tournamentsService.listTournaments();
    res.json({ tournaments });
  })
);

router.get(
  "/:id",
  validate({ params: tournamentIdSchema }),
  asyncHandler(async (req, res) => {
    const tournament = await tournamentsService.getTournament(req.params.id as string);
    res.json({ tournament });
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "ORGANIZER"),
  validate({ body: createTournamentSchema }),
  asyncHandler(async (req, res) => {
    const tournament = await tournamentsService.createTournament(req.user!, req.body);
    res.status(201).json({ tournament });
  })
);

router.post(
  "/:id/register-team",
  requireAuth,
  validate({ params: tournamentIdSchema, body: registerTeamSchema }),
  asyncHandler(async (req, res) => {
    const participant = await tournamentsService.registerTeamToTournament(
      req.user!.id,
      req.params.id as string,
      req.body.teamId
    );

    res.status(201).json({ participant });
  })
);

export const tournamentsController = router;
