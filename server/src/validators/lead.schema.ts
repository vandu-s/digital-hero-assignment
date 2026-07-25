/**
 * Zod schemas for lead requests: creating, updating, and listing.
 * The list-query schema is the interesting one - it defines and coerces
 * every supported pagination/filter/sort/search param in one place, so the
 * repository layer can trust it's always well-formed.
 */
import { z } from "zod";

const LEAD_STATUS_VALUES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
] as const;

const leadStatusEnum = z.enum(LEAD_STATUS_VALUES);

// Shared by both authenticated create and the public lead-form create -
// the public form additionally omits fields only staff should set.
const leadContactFields = {
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  message: z.string().trim().max(2000, "Message is too long").optional(),
  source: z.string().trim().optional(),
  value: z.coerce.number().nonnegative().optional(),
};

export const createLeadSchema = z.object({
  body: z.object({
    ...leadContactFields,
    assignedToId: z.string().uuid().optional(),
  }),
});

// Used by the public, unauthenticated landing-page form - always creates an
// unassigned NEW lead, so it never accepts assignedToId or status.
export const createPublicLeadSchema = z.object({
  body: z.object(leadContactFields),
});

export const updateLeadSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().trim().min(1).optional(),
      email: z.string().trim().toLowerCase().email().optional(),
      phone: z.string().trim().optional(),
      company: z.string().trim().optional(),
      message: z.string().trim().max(2000).optional(),
      source: z.string().trim().optional(),
      value: z.coerce.number().nonnegative().optional(),
      status: leadStatusEnum.optional(),
      // null explicitly unassigns; undefined means "don't change"
      assignedToId: z.string().uuid().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const leadIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listLeadsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().optional(),
    status: leadStatusEnum.optional(),
    assignedToId: z.string().uuid().optional(),
    // Inclusive date-range filter on lead creation. Accepts either a full
    // ISO datetime or a plain YYYY-MM-DD (the date picker sends the latter);
    // coerced to a Date here so the repository can build a gte/lte clause.
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "name", "value", "status"]).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>["body"];
export type CreatePublicLeadInput = z.infer<typeof createPublicLeadSchema>["body"];
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>["body"];
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>["query"];
