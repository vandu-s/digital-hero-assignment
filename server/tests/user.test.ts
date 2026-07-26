import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { ADMIN_EMAIL, MEMBER_EMAIL, loginAs } from "./helpers/auth";

let admin: { token: string; userId: string };
let member: { token: string; userId: string };

beforeAll(async () => {
  admin = await loginAs(ADMIN_EMAIL);
  member = await loginAs(MEMBER_EMAIL);
});

afterAll(async () => {
  await prisma.$disconnect();
});

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("GET /api/v1/users", () => {
  it("lets an admin list all users without exposing password hashes", async () => {
    const res = await request(app).get("/api/v1/users").set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    for (const user of res.body.data) {
      expect(user.passwordHash).toBeUndefined();
    }
  });

  it("forbids a member from listing users", async () => {
    const res = await request(app).get("/api/v1/users").set(authHeader(member.token));

    expect(res.status).toBe(403);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/v1/users");

    expect(res.status).toBe(401);
  });

  // The lead-assignment dropdowns call this endpoint with no query params and
  // need every user back, so an unpaginated call must stay unpaginated.
  it("returns every user and no pagination meta when page/limit are omitted", async () => {
    const res = await request(app).get("/api/v1/users").set(authHeader(admin.token));
    const total = await prisma.user.count();

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(total);
    expect(res.body.meta).toBeUndefined();
  });

  it("paginates and reports meta when page and limit are supplied", async () => {
    const total = await prisma.user.count();
    const res = await request(app).get("/api/v1/users?page=1&limit=2").set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 2,
      total,
      totalPages: Math.max(1, Math.ceil(total / 2)),
    });
  });

  it("returns different users on page 2 than page 1", async () => {
    const [first, second] = await Promise.all([
      request(app).get("/api/v1/users?page=1&limit=1").set(authHeader(admin.token)),
      request(app).get("/api/v1/users?page=2&limit=1").set(authHeader(admin.token)),
    ]);

    expect(first.body.data[0].id).not.toBe(second.body.data[0].id);
  });

  it("filters by search term and narrows the reported total", async () => {
    const res = await request(app)
      .get("/api/v1/users?page=1&limit=10&search=jane")
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const user of res.body.data) {
      expect(`${user.name} ${user.email}`.toLowerCase()).toContain("jane");
    }
    expect(res.body.meta.total).toBe(res.body.data.length);
  });

  it("filters by role", async () => {
    const res = await request(app)
      .get("/api/v1/users?page=1&limit=50&role=ADMIN")
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    for (const user of res.body.data) {
      expect(user.role).toBe("ADMIN");
    }
  });

  it("returns an empty page past the end of the result set", async () => {
    const res = await request(app)
      .get("/api/v1/users?page=999&limit=10")
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("rejects a limit above the 100 cap", async () => {
    const res = await request(app)
      .get("/api/v1/users?page=1&limit=500")
      .set(authHeader(admin.token));

    expect(res.status).toBe(400);
  });

  // sortBy is an enum so a caller can't order by an arbitrary column.
  it("rejects an unsupported sortBy column", async () => {
    const res = await request(app)
      .get("/api/v1/users?page=1&limit=10&sortBy=passwordHash")
      .set(authHeader(admin.token));

    expect(res.status).toBe(400);
  });
});

describe("PUT /api/v1/users/:id", () => {
  it("lets an admin rename another user", async () => {
    const res = await request(app)
      .put(`/api/v1/users/${member.userId}`)
      .set(authHeader(admin.token))
      .send({ name: "Jane Renamed" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Jane Renamed");

    // Revert so other tests/seed data aren't affected.
    await request(app)
      .put(`/api/v1/users/${member.userId}`)
      .set(authHeader(admin.token))
      .send({ name: "Jane Member" });
  });

  it("lets an admin promote a member to admin and back", async () => {
    const promoteRes = await request(app)
      .put(`/api/v1/users/${member.userId}`)
      .set(authHeader(admin.token))
      .send({ role: "ADMIN" });

    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.data.role).toBe("ADMIN");

    const demoteRes = await request(app)
      .put(`/api/v1/users/${member.userId}`)
      .set(authHeader(admin.token))
      .send({ role: "MEMBER" });

    expect(demoteRes.status).toBe(200);
    expect(demoteRes.body.data.role).toBe("MEMBER");
  });

  it("prevents an admin from changing their own role", async () => {
    const res = await request(app)
      .put(`/api/v1/users/${admin.userId}`)
      .set(authHeader(admin.token))
      .send({ role: "MEMBER" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CANNOT_CHANGE_OWN_ROLE");
  });

  it("forbids a member from updating any user", async () => {
    const res = await request(app)
      .put(`/api/v1/users/${admin.userId}`)
      .set(authHeader(member.token))
      .send({ name: "Hacked Admin" });

    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent user id", async () => {
    const res = await request(app)
      .put("/api/v1/users/00000000-0000-0000-0000-000000000000")
      .set(authHeader(admin.token))
      .send({ name: "Nobody" });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/users", () => {
  const NEW_EMAIL = "created-by-admin@crm.test";

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: NEW_EMAIL } });
  });

  it("lets an admin create a new member and never returns the password hash", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set(authHeader(admin.token))
      .send({ name: "Newby Member", email: NEW_EMAIL, password: "Password123!", role: "MEMBER" });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(NEW_EMAIL);
    expect(res.body.data.role).toBe("MEMBER");
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("lets an admin create an admin", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set(authHeader(admin.token))
      .send({ name: "Newby Admin", email: NEW_EMAIL, password: "Password123!", role: "ADMIN" });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("ADMIN");
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set(authHeader(admin.token))
      .send({ name: "Dupe", email: ADMIN_EMAIL, password: "Password123!", role: "MEMBER" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_IN_USE");
  });

  it("rejects a too-short password with 400", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set(authHeader(admin.token))
      .send({ name: "Weak", email: NEW_EMAIL, password: "short", role: "MEMBER" });

    expect(res.status).toBe(400);
  });

  it("forbids a member from creating users", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set(authHeader(member.token))
      .send({ name: "Nope", email: NEW_EMAIL, password: "Password123!", role: "MEMBER" });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/v1/users/:id", () => {
  const DISPOSABLE_EMAIL = "disposable-user@crm.test";

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: DISPOSABLE_EMAIL } });
  });

  it("lets an admin delete a user who owns no leads/notes/activity", async () => {
    const created = await request(app).post("/api/v1/users").set(authHeader(admin.token)).send({
      name: "Disposable",
      email: DISPOSABLE_EMAIL,
      password: "Password123!",
      role: "MEMBER",
    });
    const id = created.body.data.id;

    const res = await request(app).delete(`/api/v1/users/${id}`).set(authHeader(admin.token));
    expect(res.status).toBe(204);

    const gone = await prisma.user.findUnique({ where: { id } });
    expect(gone).toBeNull();
  });

  it("blocks deleting a user who still owns leads with 409", async () => {
    // The seeded member "jane" owns/was assigned leads, so she can't be deleted.
    const res = await request(app)
      .delete(`/api/v1/users/${member.userId}`)
      .set(authHeader(admin.token));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("USER_HAS_REFERENCES");
  });

  it("forbids an admin from deleting their own account", async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${admin.userId}`)
      .set(authHeader(admin.token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CANNOT_DELETE_SELF");
  });

  it("returns 404 for a non-existent user id", async () => {
    const res = await request(app)
      .delete("/api/v1/users/00000000-0000-0000-0000-000000000000")
      .set(authHeader(admin.token));

    expect(res.status).toBe(404);
  });

  it("forbids a member from deleting users", async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${admin.userId}`)
      .set(authHeader(member.token));

    expect(res.status).toBe(403);
  });
});
