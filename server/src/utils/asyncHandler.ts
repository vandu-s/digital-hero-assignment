/**
 * Wraps an async Express handler so any rejected promise is forwarded to
 * next(error) automatically. Without this, a thrown error inside an async
 * controller would crash the process instead of reaching errorHandler.
 */
import { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (handler: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
