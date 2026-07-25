/**
 * Shapes returned by the API. Kept in sync by hand with the Prisma models
 * on the server (server/prisma/schema.prisma) - there's no codegen link
 * between them, so if the backend schema changes, these types must be
 * updated too.
 */

export type Role = "ADMIN" | "MEMBER";

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string | null;
  value: string | null; // Prisma Decimal is serialized as a string over JSON
  status: LeadStatus;
  assignedToId: string | null;
  assignedTo: UserSummary | null;
  createdById: string;
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  body: string;
  leadId: string;
  authorId: string;
  author: { id: string; name: string };
  createdAt: string;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  leadId: string;
  actorId: string;
  actor: { id: string; name: string };
  createdAt: string;
}

export interface LeadDetail extends Lead {
  notes: Note[];
  activities: Activity[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
