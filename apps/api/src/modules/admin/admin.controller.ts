import { Router } from "express";
import { emitTournamentUpdate } from "../../lib/socket";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { tournamentIdSchema } from "../tournaments/tournaments.validation";
import { adminService } from "./admin.service";
import {
  matchIdSchema,
  participantIdSchema,
  updateMatchResultSchema
} from "./admin.validation";

const router = Router();

router.use(requireAuth, requireRole("ADMIN", "ORGANIZER"));

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const tournaments = await adminService.getOverview(req.user!);
    res.json({ tournaments });
  })
);

router.patch(
  "/participants/:id/approve",
  validate({ params: participantIdSchema }),
  asyncHandler(async (req, res) => {
    const participant = await adminService.approveParticipant(
      req.user!,
      req.params.id as string
    );
    emitTournamentUpdate(participant.tournamentId, "participant_updated");
    res.json({ participant });
  })
);

router.patch(
  "/participants/:id/reject",
  validate({ params: participantIdSchema }),
  asyncHandler(async (req, res) => {
    const participant = await adminService.rejectParticipant(
      req.user!,
      req.params.id as string
    );
    emitTournamentUpdate(participant.tournamentId, "participant_updated");
    res.json({ participant });
  })
);

router.post(
  "/tournaments/:id/generate-bracket",
  validate({ params: tournamentIdSchema }),
  asyncHandler(async (req, res) => {
    const tournament = await adminService.generateBracket(
      req.user!,
      req.params.id as string
    );
    emitTournamentUpdate(req.params.id as string, "bracket_generated");
    res.json({ tournament });
  })
);

router.post(
  "/tournaments/:id/reset",
  validate({ params: tournamentIdSchema }),
  asyncHandler(async (req, res) => {
    const tournament = await adminService.resetTournament(
      req.user!,
      req.params.id as string
    );
    emitTournamentUpdate(req.params.id as string, "tournament_reset");
    res.json({ tournament });
  })
);

router.patch(
  "/matches/:id/result",
  validate({ params: matchIdSchema, body: updateMatchResultSchema }),
  asyncHandler(async (req, res) => {
    const tournament = await adminService.updateMatchResult(
      req.user!,
      req.params.id as string,
      req.body
    );
    emitTournamentUpdate(tournament.id, "match_result_updated");
    res.json({ tournament });
  })
);

export const adminController = router;
