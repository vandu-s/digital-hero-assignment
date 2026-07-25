/**
 * Shared test helper: logs in as one of the seeded accounts (see
 * prisma/seed.ts) and returns the JWT. Assumes `npm run prisma:seed` has
 * been run against the test database before the suite executes.
 */
import request from "supertest";
import { app } from "../../src/app";

export async function loginAs(email: string, password = "Password123!") {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });

  if (res.status !== 200) {
    throw new Error(
      `Test helper loginAs("${email}") failed with status ${res.status}: ${JSON.stringify(res.body)}`
    );
  }

  return {
    token: res.body.data.token as string,
    userId: res.body.data.user.id as string,
  };
}

export const ADMIN_EMAIL = "admin@crm.test";
export const MEMBER_EMAIL = "jane@crm.test";
