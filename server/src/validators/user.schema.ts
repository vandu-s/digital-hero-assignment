import { z } from "zod";

export const userIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

// Admin-created accounts: unlike self-registration (always MEMBER), an admin
// may create either an ADMIN or MEMBER directly. Same 8-char password floor
// as registration so credential rules stay consistent across the app.
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      role: z.enum(["ADMIN", "MEMBER"]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

// Listing users supports the same pagination/search/sort shape as leads, but
// `page`/`limit` are intentionally left optional with NO default: the lead
// assignment dropdowns call this endpoint expecting every user back. Only when
// a caller explicitly asks for a page do we paginate.
export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    role: z.enum(["ADMIN", "MEMBER"]).optional(),
    sortBy: z.enum(["createdAt", "name", "email", "role"]).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>["query"];
