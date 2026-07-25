/**
 * Verifies the `Authorization: Bearer <token>` header on protected routes.
 * On success, attaches the decoded payload to req.user for downstream
 * middleware/controllers to read. On failure, throws a 401 - it never lets
 * the request continue unauthenticated.
 */
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/jwt";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing or malformed Authorization header");
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw AppError.unauthorized("Invalid or expired token");
  }
}
