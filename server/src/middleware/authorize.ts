/**
 * Restricts a route to specific roles, e.g. `authorize("ADMIN")`. Must run
 * AFTER `authenticate` - it reads req.user, which authenticate populates.
 * Kept separate from authenticate so "is this a valid user?" and "is this
 * user allowed here?" stay two distinct, independently testable questions.
 */
import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../utils/AppError";

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden("You do not have permission to perform this action");
    }

    next();
  };
}
