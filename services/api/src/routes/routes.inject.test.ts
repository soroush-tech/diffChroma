/** Inject tests for the new dashboard/a11y endpoints. They run against the
 *  local dev Postgres seeded by `pnpm db:seed` and skip themselves when the
 *  database is unreachable (e.g. `pnpm dev:infra` is down). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "@diffchroma/db";
import { config } from "@diffchroma/shared";
import { buildApp } from "../app.js";

const dbUp = await prisma.$queryRaw`SELECT 1`.then(
  () => true,
  (err: unknown) => {
    console.error(
      "[inject.test] DB unreachable, skipping:",
      JSON.stringify({
        cwd: process.cwd(),
        hasDbUrl: !!process.env.DATABASE_URL,
        err: err instanceof Error ? err.message.replace(/\s+/g, " ").slice(0, 200) : String(err),
      }),
    );
    return false;
  },
);

describe.skipIf(!dbUp)("API routes (inject, seeded dev DB)", () => {
  let app: FastifyInstance;
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildApp();
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: config.SEED_ADMIN_EMAIL, password: config.SEED_ADMIN_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    token = (login.json() as { token: string }).token;

    const projects = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(projects.statusCode).toBe(200);
    const list = projects.json() as { id: string }[];
    expect(list.length).toBeGreaterThan(0);
    projectId = list[0]!.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  const get = (url: string) =>
    app.inject({ method: "GET", url, headers: { authorization: `Bearer ${token}` } });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: `/projects/${projectId}/a11y/summary` });
    expect(res.statusCode).toBe(401);
  });

  it("returns the a11y summary shape", async () => {
    const res = await get(`/projects/${projectId}/a11y/summary`);
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body).toHaveProperty("enabled");
    expect(body).toHaveProperty("branches");
    const totals = body.totals as Record<string, unknown>;
    expect(totals.byImpact).toMatchObject({ critical: expect.any(Number), minor: expect.any(Number) });
  });

  it("returns grouped violations for both groupings", async () => {
    for (const groupBy of ["test", "rule"] as const) {
      const res = await get(`/projects/${projectId}/a11y/violations?groupBy=${groupBy}`);
      expect(res.statusCode).toBe(200);
      const body = res.json() as { groupBy: string; total: number; rows: unknown[] };
      expect(body.groupBy).toBe(groupBy);
      expect(body.rows).toHaveLength(body.total);
    }
  });

  it("returns the library tree with totals", async () => {
    const res = await get(`/projects/${projectId}/library`);
    expect(res.statusCode).toBe(200);
    const body = res.json() as { totals: { components: number; stories: number }; components: unknown[] };
    expect(body.components).toHaveLength(body.totals.components);
  });

  it("returns UTC-month usage and validates PATCH bodies", async () => {
    const usage = await get(`/projects/${projectId}/usage`);
    expect(usage.statusCode).toBe(200);
    expect((usage.json() as { month: string }).month).toMatch(/^\d{4}-\d{2}$/);

    const empty = await app.inject({
      method: "PATCH",
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(empty.statusCode).toBe(400);

    const badRatio = await app.inject({
      method: "PATCH",
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { maxDiffPixelRatio: 1.5 },
    });
    expect(badRatio.statusCode).toBe(400);
  });
});
