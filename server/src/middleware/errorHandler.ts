/**
 * Centralized error handler - the single place that turns any thrown error
 * into the API's standard error envelope: { success: false, error: { message, code } }.
 * Must be registered LAST in app.ts (after all routes) - Express identifies
 * error-handling middleware by its 4-argument signature.
 */
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.flatten().fieldErrors,
      },
    });
  }

  // Unexpected error - log full detail server-side, but never leak internals
  // (stack traces, DB errors, etc.) to the client. Only local development
  // sees the raw error string; every other environment (test, staging,
  // production) gets the generic message.
  console.error(err);
  return res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === "development" ? String(err) : "Internal server error",
      code: "INTERNAL_ERROR",
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}`, code: "NOT_FOUND" },
  });
}
