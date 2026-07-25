/**
 * Augments Express's Request type so `req.user` is known everywhere,
 * instead of every controller casting `req` to `any`. Populated by the
 * `authenticate` middleware.
 */
import { JwtPayload } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      // Populated by the `validate` middleware with the parsed + coerced
      // query object (e.g. page: "2" -> 2). Controllers that read query
      // params should use this instead of the raw req.query.
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
