import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import * as noteService from "../services/note.service";

export async function createNoteHandler(req: Request, res: Response) {
  if (!req.user) {
    throw AppError.unauthorized();
  }

  const note = await noteService.createNote({ id: req.user.sub, role: req.user.role }, req.body);
  res.status(201).json({ success: true, data: note });
}
