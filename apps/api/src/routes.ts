import { Router } from "express";
import { adminController } from "./modules/admin/admin.controller";
import { authController } from "./modules/auth/auth.controller";
import { dashboardController } from "./modules/dashboard/dashboard.controller";
import { teamsController } from "./modules/teams/teams.controller";
import { tournamentsController } from "./modules/tournaments/tournaments.controller";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok"
  });
});

router.use("/auth", authController);
router.use("/teams", teamsController);
router.use("/tournaments", tournamentsController);
router.use("/dashboard", dashboardController);
router.use("/admin", adminController);

export const apiRoutes = router;
