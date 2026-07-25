/**
 * Rate limiters. Two tiers:
 *  - `apiLimiter`: a generous ceiling on all API traffic, a blunt
 *    protection against runaway clients / scraping.
 *  - `authLimiter`: a much tighter limit on the auth and public-form
 *    endpoints, which are the realistic brute-force / spam targets
 *    (login credential stuffing, public lead-form flooding).
 *
 * Disabled entirely in the test environment so the Jest suite (which fires
 * many requests in a row against the same app) isn't throttled.
 */
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const isTest = env.NODE_ENV === "test";

const rateLimitError = {
  success: false,
  error: {
    message: "Too many requests, please try again later.",
    code: "RATE_LIMITED",
  },
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  // Disabled in the test env - the Jest suite fires many requests in a row
  // against the same app and would otherwise trip the limit. (Note: in
  // express-rate-limit, max:0 means "block everything", not "unlimited" -
  // so we skip instead of setting max to 0.)
  skip: () => isTest,
  message: rateLimitError,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login/register/public-form attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: rateLimitError,
});
