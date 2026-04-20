import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import type { Role } from "../types/domain";
import { ApiError } from "../utils/api-error";
import { verifyToken } from "../utils/jwt";

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const bearerToken = req.headers.authorization?.replace("Bearer ", "");
  const token = req.cookies?.[env.COOKIE_NAME] ?? bearerToken;

  if (!token) {
    return next(new ApiError(401, "Authentication required"));
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role as Role,
      name: payload.name
    };

    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired session"));
  }
};

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }

    return next();
  };
