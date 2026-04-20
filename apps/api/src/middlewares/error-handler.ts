import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error";
import { formatZodError } from "./validate";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Validation failed",
      errors: formatZodError(error)
    });
  }

  console.error(error);

  return res.status(500).json({
    message: "Internal server error"
  });
};
