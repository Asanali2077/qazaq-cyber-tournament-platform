import { Router } from "express";
import { env } from "../../config/env";
import { requireAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import { authService } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.validation";

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

router.post(
  "/register",
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.cookie(env.COOKIE_NAME, result.token, cookieOptions);
    res.status(201).json(result);
  })
);

router.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.cookie(env.COOKIE_NAME, result.token, cookieOptions);
    res.json(result);
  })
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie(env.COOKIE_NAME, cookieOptions);
    res.status(204).send();
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.me(req.user!.id);
    res.json({ user });
  })
);

export const authController = router;
