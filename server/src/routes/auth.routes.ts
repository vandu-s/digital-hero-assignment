import { Router } from "express";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { authLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../validators/auth.schema";

const router = Router();

// Tight rate limit on credential endpoints to blunt brute-force / stuffing.
router.post("/register", authLimiter, validate(registerSchema), asyncHandler(registerHandler));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(loginHandler));
router.get("/me", authenticate, asyncHandler(meHandler));
// Both require a currently-valid token: refresh re-issues one, logout is a
// no-op acknowledgement for stateless tokens (client discards its copy).
router.post("/refresh", authenticate, asyncHandler(refreshHandler));
router.post("/logout", authenticate, asyncHandler(logoutHandler));

export default router;
