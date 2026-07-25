/**
 * Focused coverage for the GET /leads list features the main lead suite
 * didn't exercise: pagination + the `meta` envelope, status filtering,
 * sorting, search, and query-param validation. Seeds a small, known set of
 * admin-owned leads (so the admin sees exactly them plus any sample data)
 * and asserts on filtered subsets to stay independent of seed volume.
 */
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { ADMIN_EMAIL, loginAs } from "./helpers/auth";

const TEST_PREFIX = "ListTest";

async function deleteTestLeads() {
  await prisma.lead.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
}

let admin: { token: string; userId: string };

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  admin = await loginAs(ADMIN_EMAIL);
  await deleteTestLeads();

  // A predictable fixture: 5 leads, distinct statuses and values, all
  // sharing the searchable token "ZebraCo" so we can isolate them.
  const fixtures = [
    { name: `${TEST_PREFIX} ZebraCo Alpha`, status: "NEW", value: 100 },
    { name: `${TEST_PREFIX} ZebraCo Bravo`, status: "QUALIFIED", value: 500 },
    { name: `${TEST_PREFIX} ZebraCo Charlie`, status: "QUALIFIED", value: 300 },
    { name: `${TEST_PREFIX} ZebraCo Delta`, status: "WON", value: 900 },
    { name: `${TEST_PREFIX} ZebraCo Echo`, status: "LOST", value: 50 },
  ] as const;

  for (const f of fixtures) {
    await request(app)
      .post("/api/v1/leads")
      .set(authHeader(admin.token))
      .send({ name: f.name, email: "list@example.com", value: f.value });
    // Set status via update (create always starts NEW).
    if (f.status !== "NEW") {
      const found = await prisma.lead.findFirst({ where: { name: f.name } });
      if (found) {
        await request(app)
          .put(`/api/v1/leads/${found.id}`)
          .set(authHeader(admin.token))
          .send({ status: f.status });
      }
    }
  }
});

afterAll(async () => {
  await deleteTestLeads();
  await prisma.$disconnect();
});

describe("GET /api/v1/leads — search", () => {
  it("returns only leads matching the search term", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ search: "ZebraCo", limit: 100 })
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data.every((l: { name: string }) => l.name.includes("ZebraCo"))).toBe(true);
  });
});

describe("GET /api/v1/leads — pagination + meta", () => {
  it("respects page and limit and reports meta", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ search: "ZebraCo", page: 1, limit: 2 })
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
  });

  it("returns the second page with the remaining items", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ search: "ZebraCo", page: 3, limit: 2 })
      .set(authHeader(admin.token));

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.page).toBe(3);
  });
});

describe("GET /api/v1/leads — status filter", () => {
  it("returns only leads with the requested status", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ search: "ZebraCo", status: "QUALIFIED", limit: 100 })
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((l: { status: string }) => l.status === "QUALIFIED")).toBe(true);
  });
});

describe("GET /api/v1/leads — created-date filter", () => {
  it("includes leads created on/after `createdFrom`", async () => {
    // Fixtures were just created, so a far-past `from` must include them.
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ search: "ZebraCo", createdFrom: "2000-01-01", limit: 100 })
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
  });

  it("excludes leads created after `createdTo`", async () => {
    // A `to` far in the past must exclude the just-created fixtures.
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ search: "ZebraCo", createdTo: "2000-01-01", limit: 100 })
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("rejects an unparseable date with 400", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ createdFrom: "not-a-date" })
      .set(authHeader(admin.token));

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/leads — sorting", () => {
  it("sorts by value ascending", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ search: "ZebraCo", sortBy: "value", order: "asc", limit: 100 })
      .set(authHeader(admin.token));

    const values = res.body.data.map((l: { value: string | null }) => Number(l.value));
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });

  it("sorts by value descending", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ search: "ZebraCo", sortBy: "value", order: "desc", limit: 100 })
      .set(authHeader(admin.token));

    const values = res.body.data.map((l: { value: string | null }) => Number(l.value));
    const sorted = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sorted);
  });
});

describe("GET /api/v1/leads — query validation", () => {
  it("rejects an invalid sortBy field with 400", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ sortBy: "ssn" })
      .set(authHeader(admin.token));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a non-numeric page with 400", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ page: "abc" })
      .set(authHeader(admin.token));

    expect(res.status).toBe(400);
  });

  it("rejects a limit above the max (100) with 400", async () => {
    const res = await request(app)
      .get("/api/v1/leads")
      .query({ limit: 1000 })
      .set(authHeader(admin.token));

    expect(res.status).toBe(400);
  });
});
