import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { ADMIN_EMAIL, MEMBER_EMAIL, loginAs } from "./helpers/auth";

// Leads created by these tests are tagged with this prefix so they can be
// cleaned up without touching the hand-authored sample leads from seed.ts.
const TEST_PREFIX = "Lead Test";

async function deleteTestLeads() {
  await prisma.lead.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
}

let admin: { token: string; userId: string };
let member: { token: string; userId: string };

beforeAll(async () => {
  admin = await loginAs(ADMIN_EMAIL);
  member = await loginAs(MEMBER_EMAIL);
});

beforeEach(deleteTestLeads);
afterAll(async () => {
  await deleteTestLeads();
  await prisma.$disconnect();
});

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("POST /api/v1/leads (create)", () => {
  it("lets an authenticated user create a lead", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({ name: `${TEST_PREFIX} Acme`, email: "acme@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(`${TEST_PREFIX} Acme`);
    expect(res.body.data.status).toBe("NEW");
    expect(res.body.data.assignedToId).toBeNull();
  });

  it("auto-assigns a member-created lead to that member so it stays visible to them", async () => {
    const createRes = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(member.token))
      .send({ name: `${TEST_PREFIX} MemberMade`, email: "membermade@example.com" });

    expect(createRes.status).toBe(201);
    // Defaulted to the creating member (members can't see unassigned leads).
    expect(createRes.body.data.assignedToId).toBe(member.userId);

    // And it must actually show up in that member's scoped list.
    const listRes = await request(app)
      .get("/api/v1/leads")
      .query({ search: `${TEST_PREFIX} MemberMade`, limit: 100 })
      .set(authHeader(member.token));

    expect(listRes.status).toBe(200);
    const names = listRes.body.data.map((l: { name: string }) => l.name);
    expect(names).toContain(`${TEST_PREFIX} MemberMade`);
  });

  it("rejects an unauthenticated create with 401", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ name: `${TEST_PREFIX} NoAuth`, email: "noauth@example.com" });

    expect(res.status).toBe(401);
  });

  it("rejects an invalid payload with 400", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({ name: "", email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/v1/leads/public (public lead form)", () => {
  it("creates an unassigned NEW lead with no auth required", async () => {
    const res = await request(app)
      .post("/api/v1/leads/public")
      .send({ name: `${TEST_PREFIX} Public`, email: "public@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("NEW");
    expect(res.body.data.assignedToId).toBeNull();
  });

  it("persists the visitor's message from the public form", async () => {
    const res = await request(app)
      .post("/api/v1/leads/public")
      .send({
        name: `${TEST_PREFIX} WithMessage`,
        email: "message@example.com",
        phone: "555-0100",
        company: "Acme Inc",
        message: "I'd like a demo of the enterprise plan next week.",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.message).toBe("I'd like a demo of the enterprise plan next week.");
    expect(res.body.data.company).toBe("Acme Inc");
    expect(res.body.data.phone).toBe("555-0100");
  });

  it("ignores assignedToId if a caller tries to sneak it in", async () => {
    const res = await request(app)
      .post("/api/v1/leads/public")
      .send({
        name: `${TEST_PREFIX} Sneaky`,
        email: "sneaky@example.com",
        assignedToId: member.userId,
      });

    // The public schema doesn't define assignedToId, so Zod strips it
    // silently rather than erroring - either behavior is acceptable, but
    // the important assertion is that it never actually gets assigned.
    expect(res.status).toBe(201);
    expect(res.body.data.assignedToId).toBeNull();
  });
});

describe("Assigning a lead", () => {
  it("lets an admin assign a lead to a member", async () => {
    const createRes = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({ name: `${TEST_PREFIX} ToAssign`, email: "toassign@example.com" });
    const leadId = createRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/v1/leads/${leadId}`)
      .set(authHeader(admin.token))
      .send({ assignedToId: member.userId });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.assignedToId).toBe(member.userId);

    const detailRes = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set(authHeader(admin.token));

    const activityTypes = detailRes.body.data.activities.map((a: { type: string }) => a.type);
    expect(activityTypes).toContain("ASSIGNED");
  });

  it("forbids a member from reassigning a lead", async () => {
    const createRes = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({
        name: `${TEST_PREFIX} MemberAssign`,
        email: "memberassign@example.com",
        assignedToId: member.userId,
      });
    const leadId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/v1/leads/${leadId}`)
      .set(authHeader(member.token))
      .send({ assignedToId: member.userId });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ASSIGN_FORBIDDEN");
  });

  it("rejects assigning to a non-existent user with 400", async () => {
    const createRes = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({ name: `${TEST_PREFIX} BadAssignee`, email: "badassignee@example.com" });
    const leadId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/v1/leads/${leadId}`)
      .set(authHeader(admin.token))
      .send({ assignedToId: "00000000-0000-0000-0000-000000000000" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ASSIGNEE");
  });
});

describe("Updating lead status", () => {
  it("updates status and logs a STATUS_CHANGED activity", async () => {
    const createRes = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({
        name: `${TEST_PREFIX} StatusFlow`,
        email: "statusflow@example.com",
        assignedToId: member.userId,
      });
    const leadId = createRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/v1/leads/${leadId}`)
      .set(authHeader(member.token))
      .send({ status: "CONTACTED" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe("CONTACTED");

    const detailRes = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set(authHeader(admin.token));

    const statusActivity = detailRes.body.data.activities.find(
      (a: { type: string }) => a.type === "STATUS_CHANGED"
    );
    expect(statusActivity.message).toBe("Status changed: NEW -> CONTACTED");
  });

  it("lets a member update status on their own assigned lead", async () => {
    const createRes = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({
        name: `${TEST_PREFIX} MemberOwnLead`,
        email: "memberown@example.com",
        assignedToId: member.userId,
      });
    const leadId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/v1/leads/${leadId}`)
      .set(authHeader(member.token))
      .send({ status: "QUALIFIED" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("QUALIFIED");
  });
});

describe("Role-scoped visibility", () => {
  it("hides a lead not assigned to a member (404, not 403)", async () => {
    const createRes = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({ name: `${TEST_PREFIX} NotMine`, email: "notmine@example.com" });
    const leadId = createRes.body.data.id;

    const res = await request(app).get(`/api/v1/leads/${leadId}`).set(authHeader(member.token));

    expect(res.status).toBe(404);
  });

  it("only lists leads assigned to the requesting member", async () => {
    await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({
        name: `${TEST_PREFIX} ListMine`,
        email: "listmine@example.com",
        assignedToId: member.userId,
      });
    await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({ name: `${TEST_PREFIX} ListNotMine`, email: "listnotmine@example.com" });

    const res = await request(app).get("/api/v1/leads").set(authHeader(member.token));

    expect(res.status).toBe(200);
    const names = res.body.data.map((lead: { name: string }) => lead.name);
    expect(names).toContain(`${TEST_PREFIX} ListMine`);
    expect(names).not.toContain(`${TEST_PREFIX} ListNotMine`);
  });

  it("lets an admin see leads regardless of assignment", async () => {
    await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({ name: `${TEST_PREFIX} AdminSeesAll`, email: "adminseesall@example.com" });

    const res = await request(app)
      .get("/api/v1/leads")
      .set(authHeader(admin.token))
      .query({ search: TEST_PREFIX });

    expect(res.status).toBe(200);
    const names = res.body.data.map((lead: { name: string }) => lead.name);
    expect(names).toContain(`${TEST_PREFIX} AdminSeesAll`);
  });
});

describe("DELETE /api/v1/leads/:id", () => {
  it("forbids a member from deleting a lead", async () => {
    const createRes = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({
        name: `${TEST_PREFIX} DeleteAttempt`,
        email: "deleteattempt@example.com",
        assignedToId: member.userId,
      });
    const leadId = createRes.body.data.id;

    const res = await request(app).delete(`/api/v1/leads/${leadId}`).set(authHeader(member.token));

    expect(res.status).toBe(403);
  });

  it("lets an admin delete a lead", async () => {
    const createRes = await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({ name: `${TEST_PREFIX} DeleteMe`, email: "deleteme@example.com" });
    const leadId = createRes.body.data.id;

    const res = await request(app).delete(`/api/v1/leads/${leadId}`).set(authHeader(admin.token));

    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/v1/leads/${leadId}`).set(authHeader(admin.token));
    expect(getRes.status).toBe(404);
  });
});
