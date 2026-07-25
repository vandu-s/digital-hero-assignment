import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";

// Auth tests hit the real local Postgres database via Prisma rather than
// mocking it - an auth flow is exactly the kind of thing where a mock can
// pass while the real DB constraint (unique email) behaves differently.
const TEST_EMAIL = "auth-test-user@crm.test";

async function deleteTestUser() {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
}

beforeEach(deleteTestUser);
afterAll(async () => {
  await deleteTestUser();
  await prisma.$disconnect();
});

describe("POST /api/v1/auth/register", () => {
  it("creates a new user and returns a token", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: TEST_EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
    expect(res.body.data.user.role).toBe("MEMBER");
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("rejects a duplicate email with 409", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: TEST_EMAIL,
      password: "Password123!",
    });

    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Another Name",
      email: TEST_EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_IN_USE");
  });

  it("rejects an invalid payload with 400", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "A",
      email: "not-an-email",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: TEST_EMAIL,
      password: "Password123!",
    });
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: "Password123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
  });

  it("rejects a wrong password with 401 and a generic message", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: "WrongPassword123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects an unknown email with the same generic message", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "nobody@crm.test",
      password: "Password123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the current user when a valid token is provided", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: TEST_EMAIL,
      password: "Password123!",
    });
    const token = registerRes.body.data.token;

    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
  });

  it("rejects a request with no Authorization header", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
  });

  it("rejects a request with an invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not-a-real-token");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  async function registerAndGetToken() {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Refresh User",
      email: TEST_EMAIL,
      password: "Password123!",
    });
    return res.body.data.token as string;
  }

  it("issues a fresh token for a valid session", async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.token.length).toBeGreaterThan(10);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);

    // The refreshed token must actually authenticate a subsequent request.
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.data.token}`);
    expect(meRes.status).toBe(200);
  });

  it("rejects a refresh with no token", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("acknowledges logout for an authenticated user", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      name: "Logout User",
      email: TEST_EMAIL,
      password: "Password123!",
    });
    const token = registerRes.body.data.token;

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects logout with no token", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(401);
  });
});
