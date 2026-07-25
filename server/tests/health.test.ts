import request from "supertest";
import { app } from "../src/app";

describe("GET /api/v1/health", () => {
  it("returns 200 and ok status", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: "ok" } });
  });
});
