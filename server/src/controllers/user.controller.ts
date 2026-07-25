import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import * as userService from "../services/user.service";

export async function listUsersHandler(_req: Request, res: Response) {
  const users = await userService.listUsers();
  res.status(200).json({ success: true, data: users });
}

export async function createUserHandler(req: Request, res: Response) {
  const user = await userService.createUser(req.body);
  res.status(201).json({ success: true, data: user });
}

export async function deleteUserHandler(req: Request, res: Response) {
  if (!req.user) {
    throw AppError.unauthorized();
  }

  await userService.deleteUser(req.user.sub, req.params.id);
  res.status(204).send();
}

export async function updateUserHandler(req: Request, res: Response) {
  if (!req.user) {
    throw AppError.unauthorized();
  }

  const user = await userService.updateUser(req.user.sub, req.params.id, req.body);
  res.status(200).json({ success: true, data: user });
}
