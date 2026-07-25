import { Router } from "express";
import {
  createLeadHandler,
  createPublicLeadHandler,
  deleteLeadHandler,
  getLeadHandler,
  listLeadsHandler,
  updateLeadHandler,
} from "../controllers/lead.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { authLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createLeadSchema,
  createPublicLeadSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from "../validators/lead.schema";

const router = Router();

// Public - no auth. Used by the landing-page lead capture form. Rate limited
// because an unauthenticated public endpoint is a spam/abuse target.
router.post(
  "/public",
  authLimiter,
  validate(createPublicLeadSchema),
  asyncHandler(createPublicLeadHandler)
);

// Everything below requires a logged-in user.
router.use(authenticate);

router.get("/", validate(listLeadsQuerySchema), asyncHandler(listLeadsHandler));
router.post("/", validate(createLeadSchema), asyncHandler(createLeadHandler));
router.get("/:id", validate(leadIdParamSchema), asyncHandler(getLeadHandler));
router.put("/:id", validate(updateLeadSchema), asyncHandler(updateLeadHandler));

// Admin only.
router.delete(
  "/:id",
  authorize("ADMIN"),
  validate(leadIdParamSchema),
  asyncHandler(deleteLeadHandler)
);

export default router;
