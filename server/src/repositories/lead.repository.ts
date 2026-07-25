/**
 * All direct Prisma access for the Lead model. This layer knows how to
 * build WHERE/ORDER BY/pagination clauses, but has no opinion on WHO is
 * allowed to see what - that role-scoping decision is made by leadService,
 * which passes in the `where` filter this repository should apply.
 */
import { Lead, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export interface FindLeadsOptions {
  where: Prisma.LeadWhereInput;
  page: number;
  limit: number;
  sortBy: string;
  order: "asc" | "desc";
}

const leadListInclude = {
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.LeadInclude;

export async function findLeads(options: FindLeadsOptions) {
  const { where, page, limit, sortBy, order } = options;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: leadListInclude,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, total };
}

export function findLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      ...leadListInclude,
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });
}

export function createLead(data: Prisma.LeadCreateInput) {
  return prisma.lead.create({ data, include: leadListInclude });
}

export function updateLead(id: string, data: Prisma.LeadUpdateInput) {
  return prisma.lead.update({ where: { id }, data, include: leadListInclude });
}

export function deleteLead(id: string): Promise<Lead> {
  return prisma.lead.delete({ where: { id } });
}
