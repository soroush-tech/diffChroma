/** Query-layer tests against the local dev Postgres (seeded by `pnpm db:seed`,
 *  optionally populated by `pnpm simulate`). They skip themselves when the
 *  database is unreachable (e.g. `pnpm dev:infra` is down). */
import { describe, expect, it } from "vitest";
import { prisma } from "@diffchroma/db";
import * as q from "./queries.js";

const dbUp = await prisma.$queryRaw`SELECT 1`.then(
  () => true,
  (err: unknown) => {
    console.error(
      "[queries.test] DB unreachable, skipping:",
      err instanceof Error ? err.message.replace(/\s+/g, " ").slice(0, 200) : String(err),
    );
    return false;
  },
);

describe.skipIf(!dbUp)("mcp queries (seeded dev DB)", () => {
  it("lists the seeded project", async () => {
    const { projects } = await q.listProjects();
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      buildCount: expect.any(Number),
    });
  });

  it("resolves projects by name and rejects unknown refs", async () => {
    const { projects } = await q.listProjects();
    const name = projects[0]!.name;
    const byName = await q.listBuilds({ project: name, limit: 5 });
    expect(byName.project.name).toBe(name);
    await expect(q.listBuilds({ project: "no-such-project", limit: 5 })).rejects.toBeInstanceOf(
      q.NotFoundError,
    );
  });

  it("rejects unresolvable build refs", async () => {
    await expect(q.getBuild({})).rejects.toBeInstanceOf(q.NotFoundError);
    await expect(q.getBuild({ buildId: "no-such-build" })).rejects.toBeInstanceOf(q.NotFoundError);
  });

  it("summarizes a11y for a project even without builds", async () => {
    const { projects } = await q.listProjects();
    const summary = await q.a11ySummary({ project: projects[0]!.id });
    expect(summary.totals.byImpact).toMatchObject({
      critical: expect.any(Number),
      serious: expect.any(Number),
      moderate: expect.any(Number),
      minor: expect.any(Number),
    });
  });

  it("returns capped issue payloads once pipeline data exists", async () => {
    const { projects } = await q.listProjects();
    const withBuilds = projects.find((p) => p.buildCount > 0);
    if (!withBuilds) return; // seed-only DB — run `pnpm simulate` for full coverage
    const { builds } = await q.listBuilds({ project: withBuilds.id, limit: 1 });
    const latest = builds[0]!;
    expect(latest.a11yViolations).toBeGreaterThanOrEqual(0);

    const detail = await q.getBuild({ buildId: latest.id });
    expect(detail.number).toBe(latest.number);

    const issues = (await q.getBuildIssues({
      buildId: latest.id,
      kind: "all",
      a11yGroupBy: "rule",
    })) as {
      a11y: { rows: { children: unknown[] }[]; totalRows: number; truncated: boolean };
      visual: { total: number; snapshots: unknown[]; truncated: boolean };
    };
    expect(issues.a11y.rows.length).toBeLessThanOrEqual(30);
    for (const row of issues.a11y.rows) expect(row.children.length).toBeLessThanOrEqual(15);
    expect(issues.visual.snapshots.length).toBeLessThanOrEqual(100);

    if (issues.a11y.totalRows > 0) {
      const ruleKey = (issues.a11y.rows[0] as { key?: string }).key!;
      const byRule = await q.findBuildsByRule({ ruleId: ruleKey, limit: 5 });
      expect(byRule.builds.length).toBeGreaterThan(0);
      expect(byRule.builds[0]!.affectedStories).toBeGreaterThan(0);
    }
  });
});
