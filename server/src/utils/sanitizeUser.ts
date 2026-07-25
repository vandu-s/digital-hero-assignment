/**
 * Strips passwordHash before a User ever leaves the service layer. Every
 * response that includes a user MUST go through this - it is the single
 * choke point that prevents a hash from accidentally leaking in a JSON
 * response.
 */
import { User } from "@prisma/client";

export type SafeUser = Omit<User, "passwordHash">;

export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
