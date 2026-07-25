/**
 * User management business rules - listing all users (for the Users page
 * and the lead-assignment dropdown) and updating a user's name/role.
 * Every function here is admin-only; that's enforced by the route
 * middleware (authorize("ADMIN")), not re-checked here.
 */
import { AppError } from "../utils/AppError";
import { hashPassword } from "../utils/password";
import { sanitizeUser, SafeUser } from "../utils/sanitizeUser";
import {
  countUserReferences,
  createUser as createUserRecord,
  deleteUser as deleteUserRecord,
  findAllUsers,
  findUserByEmail,
  findUserById,
  updateUser as updateUserRecord,
} from "../repositories/user.repository";
import { CreateUserInput, UpdateUserInput } from "../validators/user.schema";

export async function listUsers(): Promise<SafeUser[]> {
  const users = await findAllUsers();
  return users.map(sanitizeUser);
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw AppError.conflict("An account with this email already exists", "EMAIL_IN_USE");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUserRecord({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
  });

  return sanitizeUser(user);
}

export async function deleteUser(requestingAdminId: string, targetUserId: string): Promise<void> {
  const targetUser = await findUserById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound("User not found", "USER_NOT_FOUND");
  }

  // An admin deleting their own account would be a foot-gun (and could remove
  // the last admin). Disallow self-deletion outright.
  if (targetUserId === requestingAdminId) {
    throw AppError.forbidden("You cannot delete your own account", "CANNOT_DELETE_SELF");
  }

  // The Lead/Note/Activity FKs to User have no cascade or set-null, so a user
  // who still owns any of that data cannot be safely removed. Surface a clear
  // 409 telling the admin to reassign first, rather than letting the DB throw.
  const [assignedLeads, createdLeads, notes, activities] = await countUserReferences(targetUserId);
  if (assignedLeads + createdLeads + notes + activities > 0) {
    throw AppError.conflict(
      "This user still has assigned or created leads, notes, or activity history. Reassign their leads before deleting.",
      "USER_HAS_REFERENCES"
    );
  }

  await deleteUserRecord(targetUserId);
}

export async function updateUser(
  requestingAdminId: string,
  targetUserId: string,
  input: UpdateUserInput
): Promise<SafeUser> {
  const targetUser = await findUserById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound("User not found", "USER_NOT_FOUND");
  }

  // An admin demoting themselves could lock the account out of admin-only
  // screens with no other admin able to reverse it. Simplest safe rule:
  // an admin cannot change their own role.
  if (targetUserId === requestingAdminId && input.role && input.role !== targetUser.role) {
    throw AppError.forbidden("You cannot change your own role", "CANNOT_CHANGE_OWN_ROLE");
  }

  const updatedUser = await updateUserRecord(targetUserId, input);
  return sanitizeUser(updatedUser);
}
