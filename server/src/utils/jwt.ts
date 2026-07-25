/**
 * Signs and verifies JWTs. This is the ONLY file that touches jsonwebtoken
 * directly - authService signs tokens on login, and the `authenticate`
 * middleware verifies them on every protected request.
 */
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload } from "../types/auth";

// jsonwebtoken types `expiresIn` as a template-literal union (e.g. "1d"),
// but our validated env var is a plain string - the env schema is what
// guarantees it's a valid duration string at boot, so this cast is safe.
const signOptions: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, signOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
