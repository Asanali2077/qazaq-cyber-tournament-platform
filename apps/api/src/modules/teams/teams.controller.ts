import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { teamsService } from "./teams.service";
import { createTeamSchema, joinTeamSchema } from "./teams.validation";

const router = Router();

router.use(requireAuth);

router.get(
  "/my",
  asyncHandler(async (req, res) => {
    const teams = await teamsService.getMyTeams(req.user!.id);
    res.json({ teams });
  })
);

router.post(
  "/",
  validate({ body: createTeamSchema }),
  asyncHandler(async (req, res) => {
    const team = await teamsService.createTeam(req.user!.id, req.body);
    res.status(201).json({ team });
  })
);

router.post(
  "/join",
  validate({ body: joinTeamSchema }),
  asyncHandler(async (req, res) => {
    const team = await teamsService.joinTeam(req.user!.id, req.body.inviteCode);
    res.json({ team });
  })
);

export const teamsController = router;
