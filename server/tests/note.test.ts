import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { ADMIN_EMAIL, MEMBER_EMAIL, loginAs } from "./helpers/auth";

const TEST_PREFIX = "Note Test";

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

async function createLead(
  token: string,
  overrides: Partial<{ name: string; email: string; assignedToId: string }> = {}
) {
  const res = await request(app)
    .post("/api/v1/leads")
    .set(authHeader(token))
    .send({
      name: overrides.name ?? `${TEST_PREFIX} Lead`,
      email: overrides.email ?? "notetest@example.com",
      ...(overrides.assignedToId ? { assignedToId: overrides.assignedToId } : {}),
    });
  return res.body.data.id as string;
}

describe("POST /api/v1/notes", () => {
  it("adds a note to a lead and logs a NOTE_ADDED activity", async () => {
    const leadId = await createLead(admin.token, { assignedToId: member.userId });

    const res = await request(app)
      .post("/api/v1/notes")
      .set(authHeader(member.token))
      .send({ leadId, body: "Called the customer, interested." });

    expect(res.status).toBe(201);
    expect(res.body.data.body).toBe("Called the customer, interested.");

    const detailRes = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set(authHeader(admin.token));

    expect(detailRes.body.data.notes).toHaveLength(1);
    const activityTypes = detailRes.body.data.activities.map((a: { type: string }) => a.type);
    expect(activityTypes).toContain("NOTE_ADDED");
  });

  it("rejects an empty note body with 400", async () => {
    const leadId = await createLead(admin.token);

    const res = await request(app)
      .post("/api/v1/notes")
      .set(authHeader(admin.token))
      .send({ leadId, body: "" });

    expect(res.status).toBe(400);
  });

  it("prevents a member from noting a lead not assigned to them", async () => {
    const leadId = await createLead(admin.token); // unassigned

    const res = await request(app)
      .post("/api/v1/notes")
      .set(authHeader(member.token))
      .send({ leadId, body: "Trying to note someone else's lead" });

    expect(res.status).toBe(404);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const leadId = await createLead(admin.token);

    const res = await request(app).post("/api/v1/notes").send({ leadId, body: "No auth" });

    expect(res.status).toBe(401);
  });
});
