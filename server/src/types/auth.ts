import { Role } from "@prisma/client";

/**
 * Shape of the data we encode inside the JWT. Kept minimal on purpose -
 * only what authorization middleware needs (id + role) so the token stays
 * small and we never leak the password hash or other user fields into it.
 */
export interface JwtPayload {
  sub: string; // user id
  role: Role;
}
