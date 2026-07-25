/**
 * Translates HTTP requests into calls to leadService and shapes the HTTP
 * response. Contains no business rules - role scoping, assignment logic,
 * and activity logging all live in leadService.
 */
import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import * as leadService from "../services/lead.service";
import { ListLeadsQuery } from "../validators/lead.schema";

function requireUser(req: Request) {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return { id: req.user.sub, role: req.user.role };
}

export async function listLeadsHandler(req: Request, res: Response) {
  const requestingUser = requireUser(req);
  const query = req.validatedQuery as unknown as ListLeadsQuery;

  const { leads, meta } = await leadService.listLeads(requestingUser, query);
  res.status(200).json({ success: true, data: leads, meta });
}

export async function getLeadHandler(req: Request, res: Response) {
  const requestingUser = requireUser(req);
  const lead = await leadService.getLeadById(requestingUser, req.params.id);
  res.status(200).json({ success: true, data: lead });
}

export async function createLeadHandler(req: Request, res: Response) {
  const requestingUser = requireUser(req);
  const lead = await leadService.createLead(requestingUser, req.body);
  res.status(201).json({ success: true, data: lead });
}

export async function createPublicLeadHandler(req: Request, res: Response) {
  const lead = await leadService.createPublicLead(req.body);
  res.status(201).json({ success: true, data: lead });
}

export async function updateLeadHandler(req: Request, res: Response) {
  const requestingUser = requireUser(req);
  const lead = await leadService.updateLead(requestingUser, req.params.id, req.body);
  res.status(200).json({ success: true, data: lead });
}

export async function deleteLeadHandler(req: Request, res: Response) {
  await leadService.deleteLead(req.params.id);
  res.status(204).send();
}
