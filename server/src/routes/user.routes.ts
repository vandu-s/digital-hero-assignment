import { Router } from "express";
import {
  createUserHandler,
  deleteUserHandler,
  listUsersHandler,
  updateUserHandler,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from "../validators/user.schema";

const router = Router();

// Every user management endpoint is admin-only.
router.use(authenticate, authorize("ADMIN"));

router.get("/", validate(listUsersQuerySchema), asyncHandler(listUsersHandler));
router.post("/", validate(createUserSchema), asyncHandler(createUserHandler));
router.put("/:id", validate(updateUserSchema), asyncHandler(updateUserHandler));
router.delete("/:id", validate(userIdParamSchema), asyncHandler(deleteUserHandler));

export default router;
