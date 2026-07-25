import { Router } from "express";
import { createNoteHandler } from "../controllers/note.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { createNoteSchema } from "../validators/note.schema";

const router = Router();

router.use(authenticate);
router.post("/", validate(createNoteSchema), asyncHandler(createNoteHandler));

export default router;
