/**
 * All direct Prisma access for the User model lives here. Services call
 * these functions instead of importing `prisma` themselves - if we ever
 * swap ORMs, only this file changes.
 */
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { SYSTEM_USER_EMAIL } from "../config/constants";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function findSystemUser() {
  return prisma.user.findUniqueOrThrow({ where: { email: SYSTEM_USER_EMAIL } });
}

export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}) {
  return prisma.user.create({ data });
}

export function findAllUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
}

export interface FindUsersOptions {
  where: Prisma.UserWhereInput;
  // Undefined page/limit means "return every match" - the assignment
  // dropdowns rely on that, so pagination is applied only when asked for.
  page?: number;
  limit?: number;
  sortBy: string;
  order: "asc" | "desc";
}

export async function findUsers(options: FindUsersOptions) {
  const { where, page, limit, sortBy, order } = options;
  const paginate = page !== undefined && limit !== undefined;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: order },
      ...(paginate ? { skip: (page - 1) * limit, take: limit } : {}),
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

export function updateUser(id: string, data: { name?: string; role?: Role }) {
  return prisma.user.update({ where: { id }, data });
}

export function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}

// How much data would be orphaned if this user were deleted. Used to block
// deletion of a user who still owns leads/notes/activities (the FKs have no
// cascade/set-null, so a raw delete would throw a DB error - we turn that
// into a clear 409 instead).
export function countUserReferences(id: string) {
  return prisma.$transaction([
    prisma.lead.count({ where: { assignedToId: id } }),
    prisma.lead.count({ where: { createdById: id } }),
    prisma.note.count({ where: { authorId: id } }),
    prisma.activity.count({ where: { actorId: id } }),
  ]);
}
