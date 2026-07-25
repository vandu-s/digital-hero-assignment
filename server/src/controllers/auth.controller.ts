/**
 * Translates HTTP requests into calls to authService and shapes the HTTP
 * response. Contains no business rules - that all lives in authService.
 */
import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import * as authService from "../services/auth.service";

export async function registerHandler(req: Request, res: Response) {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function loginHandler(req: Request, res: Response) {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
}

export async function meHandler(req: Request, res: Response) {
  if (!req.user) {
    throw AppError.unauthorized();
  }

  const user = await authService.getCurrentUser(req.user.sub);
  res.status(200).json({ success: true, data: { user } });
}

export async function refreshHandler(req: Request, res: Response) {
  if (!req.user) {
    throw AppError.unauthorized();
  }

  const result = await authService.refresh(req.user.sub);
  res.status(200).json({ success: true, data: result });
}

/**
 * Access tokens are stateless (no server-side session store), so there is
 * nothing to revoke server-side - the client discards its token. We still
 * expose this endpoint so the API is REST-complete and so a future
 * denylist/refresh-cookie implementation has a stable hook.
 */
export async function logoutHandler(_req: Request, res: Response) {
  res.status(200).json({ success: true, data: { message: "Logged out" } });
}
