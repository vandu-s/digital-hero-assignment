/**
 * Lead business rules: who can see which leads, what happens on create/
 * update/delete, and writing the Activity audit trail. Knows nothing about
 * req/res or Prisma's query syntax directly (that's the repository's job).
 */
import { Prisma, Role } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { createActivity } from "../repositories/activity.repository";
import {
  createLead as createLeadRecord,
  deleteLead as deleteLeadRecord,
  findLeadById,
  findLeads,
  updateLead as updateLeadRecord,
} from "../repositories/lead.repository";
import { findSystemUser, findUserById } from "../repositories/user.repository";
import {
  CreateLeadInput,
  CreatePublicLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
} from "../validators/lead.schema";

interface RequestingUser {
  id: string;
  role: Role;
}

// Admins see every lead; members only see leads assigned to them. This is
// the one rule that shapes almost every read in this service.
function buildScopedWhere(
  requestingUser: RequestingUser,
  filters: {
    search?: string;
    status?: string;
    assignedToId?: string;
    createdFrom?: Date;
    createdTo?: Date;
  }
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  if (requestingUser.role === "MEMBER") {
    where.assignedToId = requestingUser.id;
  } else if (filters.assignedToId) {
    // Admins may additionally filter by a specific assignee.
    where.assignedToId = filters.assignedToId;
  }

  if (filters.status) {
    where.status = filters.status as Prisma.EnumLeadStatusFilter["equals"];
  }

  // Inclusive created-date range. `createdTo` is pushed to the end of its day
  // so a plain YYYY-MM-DD "to" still includes leads created later that day.
  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {};
    if (filters.createdFrom) {
      where.createdAt.gte = filters.createdFrom;
    }
    if (filters.createdTo) {
      const end = new Date(filters.createdTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { company: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listLeads(requestingUser: RequestingUser, query: ListLeadsQuery) {
  const where = buildScopedWhere(requestingUser, query);

  const { leads, total } = await findLeads({
    where,
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    order: query.order,
  });

  return {
    leads,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

async function getLeadOrThrow(id: string) {
  const lead = await findLeadById(id);
  if (!lead) {
    throw AppError.notFound("Lead not found", "LEAD_NOT_FOUND");
  }
  return lead;
}

export async function getLeadById(requestingUser: RequestingUser, id: string) {
  const lead = await getLeadOrThrow(id);

  if (requestingUser.role === "MEMBER" && lead.assignedToId !== requestingUser.id) {
    // 404, not 403 - a member should not learn that a lead they can't
    // access even exists.
    throw AppError.notFound("Lead not found", "LEAD_NOT_FOUND");
  }

  return lead;
}

async function assertAssigneeExists(assignedToId: string) {
  const assignee = await findUserById(assignedToId);
  if (!assignee) {
    throw AppError.badRequest("assignedToId does not match an existing user", "INVALID_ASSIGNEE");
  }
}

export async function createLead(requestingUser: RequestingUser, input: CreateLeadInput) {
  // A member can only see leads assigned to them, so a lead they create with
  // no assignee would be invisible to them. Default the assignee to the
  // creating member so their own leads always show up in their pipeline.
  // Admins keep full control (assign to anyone, or leave it unassigned).
  const assignedToId =
    input.assignedToId ?? (requestingUser.role === "MEMBER" ? requestingUser.id : undefined);

  if (assignedToId) {
    await assertAssigneeExists(assignedToId);
  }

  const lead = await createLeadRecord({
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    message: input.message,
    source: input.source,
    value: input.value,
    createdBy: { connect: { id: requestingUser.id } },
    ...(assignedToId ? { assignedTo: { connect: { id: assignedToId } } } : {}),
  });

  await createActivity({
    leadId: lead.id,
    actorId: requestingUser.id,
    type: "CREATED",
    message: "Lead created",
  });

  if (assignedToId) {
    await createActivity({
      leadId: lead.id,
      actorId: requestingUser.id,
      type: "ASSIGNED",
      message: `Assigned to ${lead.assignedTo?.name ?? "a user"}`,
    });
  }

  return lead;
}

// Public, unauthenticated creation from the landing-page lead form. Always
// unassigned and NEW - kept as a separate function (not a flag on
// createLead) so the "no auth required" path can never accidentally accept
// assignedToId or status from an anonymous caller. Attributed to the
// seeded "System" user since createdById is a required foreign key.
export async function createPublicLead(input: CreatePublicLeadInput) {
  const systemUser = await findSystemUser();

  const lead = await createLeadRecord({
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    message: input.message,
    source: input.source,
    value: input.value,
    createdBy: { connect: { id: systemUser.id } },
  });

  await createActivity({
    leadId: lead.id,
    actorId: systemUser.id,
    type: "CREATED",
    message: "Lead submitted via public form",
  });

  return lead;
}

export async function updateLead(
  requestingUser: RequestingUser,
  id: string,
  input: UpdateLeadInput
) {
  const existingLead = await getLeadOrThrow(id);

  if (requestingUser.role === "MEMBER") {
    if (existingLead.assignedToId !== requestingUser.id) {
      throw AppError.notFound("Lead not found", "LEAD_NOT_FOUND");
    }
    if (input.assignedToId !== undefined) {
      throw AppError.forbidden("Only an admin can reassign a lead", "ASSIGN_FORBIDDEN");
    }
  }

  if (input.assignedToId) {
    await assertAssigneeExists(input.assignedToId);
  }

  const data: Prisma.LeadUpdateInput = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.email !== undefined && { email: input.email }),
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.company !== undefined && { company: input.company }),
    ...(input.message !== undefined && { message: input.message }),
    ...(input.source !== undefined && { source: input.source }),
    ...(input.value !== undefined && { value: input.value }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.assignedToId !== undefined && {
      assignedTo: input.assignedToId
        ? { connect: { id: input.assignedToId } }
        : { disconnect: true },
    }),
  };

  const updatedLead = await updateLeadRecord(id, data);

  if (input.status !== undefined && input.status !== existingLead.status) {
    await createActivity({
      leadId: id,
      actorId: requestingUser.id,
      type: "STATUS_CHANGED",
      message: `Status changed: ${existingLead.status} -> ${input.status}`,
    });
  }

  if (input.assignedToId !== undefined && input.assignedToId !== existingLead.assignedToId) {
    await createActivity({
      leadId: id,
      actorId: requestingUser.id,
      type: "ASSIGNED",
      message: input.assignedToId
        ? `Assigned to ${updatedLead.assignedTo?.name ?? "a user"}`
        : "Unassigned",
    });
  }

  return updatedLead;
}

export async function deleteLead(id: string) {
  await getLeadOrThrow(id);
  await deleteLeadRecord(id);
}
