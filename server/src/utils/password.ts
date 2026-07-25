/**
 * Thin wrapper around bcrypt so the rest of the app never imports bcrypt
 * directly - if we ever swap hashing libraries, this is the only file that
 * changes.
 */
import bcrypt from "bcrypt";
import { env } from "../config/env";

export function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, env.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
