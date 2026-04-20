import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import { tournamentsService } from "../tournaments/tournaments.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const dashboard = await tournamentsService.getDashboard(req.user!);
    res.json(dashboard);
  })
);

export const dashboardController = router;
