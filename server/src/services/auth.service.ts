/**
 * Auth business rules: registering a new user, verifying login
 * credentials, and issuing JWTs. Knows nothing about req/res - a controller
 * calls these functions and translates the result into an HTTP response.
 */
import { AppError } from "../utils/AppError";
import { signToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
import { sanitizeUser, SafeUser } from "../utils/sanitizeUser";
import { createUser, findUserByEmail, findUserById } from "../repositories/user.repository";
import { LoginInput, RegisterInput } from "../validators/auth.schema";

interface AuthResult {
  user: SafeUser;
  token: string;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existingUser = await findUserByEmail(input.email);
  if (existingUser) {
    throw AppError.conflict("An account with this email already exists", "EMAIL_IN_USE");
  }

  const passwordHash = await hashPassword(input.password);

  // First-ever account could reasonably become admin, but for predictable
  // behavior every self-registered user starts as MEMBER. Promoting to
  // ADMIN is an explicit action via the Users management screen (Module 4).
  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  const token = signToken({ sub: user.id, role: user.role });

  return { user: sanitizeUser(user), token };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const token = signToken({ sub: user.id, role: user.role });

  return { user: sanitizeUser(user), token };
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw AppError.notFound("User not found", "USER_NOT_FOUND");
  }

  return sanitizeUser(user);
}

/**
 * Re-issues a fresh access token for an already-authenticated user. We use
 * short-lived stateless access tokens (no server-side session table), so
 * "refresh" here means: prove you still hold a valid token, and get a new
 * one with a reset expiry. The user is re-read so a token can't be refreshed
 * for a since-deleted account, and the role is re-read so a demotion takes
 * effect on the next refresh rather than only on next login.
 */
export async function refresh(userId: string): Promise<AuthResult> {
  const user = await findUserById(userId);
  if (!user) {
    throw AppError.unauthorized("Session is no longer valid", "INVALID_SESSION");
  }

  const token = signToken({ sub: user.id, role: user.role });
  return { user: sanitizeUser(user), token };
}
