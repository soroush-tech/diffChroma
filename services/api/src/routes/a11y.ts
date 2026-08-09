import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, type BuildStatus } from "@diffchroma/db";
import { requireUser } from "../auth.js";
import {
  filterRows,
  groupByRule,
  groupByTest,
  sinceDate,
  toWireImpact,
  type WireImpact,
} from "../lib/a11y.js";
import { getProjectForUser } from "./dashboard.js";

/** Builds whose render phase completed — audits exist and are final. */
const AUDITED_STATUSES: BuildStatus[] = [
  "COMPARING",
  "PENDING_REVIEW",
  "PASSED",
  "APPROVED",
  "REJECTED",
];

const violationsQuerySchema = z.object({
  branch: z.string().optional(),
  groupBy: z.enum(["test", "rule"]).default("test"),
  search: z.string().default(""),
});

const timeseriesQuerySchema = z.object({
  branch: z.string().optional(),
  days: z.coerce
    .number()
    .refine((d): d is 7 | 14 | 30 => [7, 14, 30].includes(d), { message: "days must be 7, 14, or 30" })
    .default(7),
});

/** Branches with recent builds, newest activity first; the requested branch is
 *  honored only when it actually exists. Default is the trunk (main/master)
 *  when present — not simply the most recently active branch. */
async function resolveBranch(projectId: string, requested: string | undefined) {
  const groups = await prisma.build.groupBy({
    by: ["branch"],
    where: { projectId },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: 20,
  });
  const branches = groups.map((g) => g.branch);
  const fallback = branches.find((b) => b === "main" || b === "master") ?? branches[0] ?? "main";
  const branch = requested && branches.includes(requested) ? requested : fallback;
  return { branches, branch };
}

async function latestAuditedBuild(projectId: string, branch: string) {
  return prisma.build.findFirst({
    where: {
      projectId,
      branch,
      status: { in: AUDITED_STATUSES },
      a11yAudits: { some: {} },
    },
    orderBy: { number: "desc" },
    select: { id: true, number: true, createdAt: true },
  });
}

export function registerA11yRoutes(app: FastifyInstance): void {
  app.get("/projects/:id/a11y/summary", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await getProjectForUser(req, reply, id);
    if (!project) return;
    const query = z.object({ branch: z.string().optional() }).parse(req.query);
    const { branches, branch } = await resolveBranch(id, query.branch);
    const build = await latestAuditedBuild(id, branch);

    const emptyByImpact: Record<WireImpact, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    if (!build) {
      return {
        enabled: project.a11yEnabled,
        branches,
        branch,
        build: null,
        totals: { violations: 0, nodes: 0, components: 0, tests: 0, byImpact: emptyByImpact },
      };
    }

    const [aggregate, audits, impacts] = await Promise.all([
      prisma.a11yAudit.aggregate({
        where: { buildId: build.id },
        _sum: { violationCount: true, nodeCount: true },
        _count: { _all: true },
      }),
      prisma.a11yAudit.findMany({
        where: { buildId: build.id },
        select: { componentTitle: true },
      }),
      prisma.a11yViolation.groupBy({
        by: ["impact"],
        where: { audit: { buildId: build.id } },
        _count: { _all: true },
      }),
    ]);
    const byImpact = { ...emptyByImpact };
    for (const group of impacts) byImpact[toWireImpact(group.impact)] += group._count._all;

    return {
      enabled: project.a11yEnabled,
      branches,
      branch,
      build,
      totals: {
        violations: aggregate._sum.violationCount ?? 0,
        nodes: aggregate._sum.nodeCount ?? 0,
        components: new Set(audits.map((a) => a.componentTitle)).size,
        tests: aggregate._count._all,
        byImpact,
      },
    };
  });

  app.get("/projects/:id/a11y/timeseries", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await getProjectForUser(req, reply, id);
    if (!project) return;
    const query = timeseriesQuerySchema.parse(req.query);
    const { branch } = await resolveBranch(id, query.branch);
    const builds = await prisma.build.findMany({
      where: {
        projectId: id,
        branch,
        status: { in: AUDITED_STATUSES },
        a11yAudits: { some: {} },
        createdAt: { gte: sinceDate(query.days) },
      },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        createdAt: true,
        a11yAudits: { select: { violationCount: true } },
      },
    });
    return {
      points: builds.map((b) => ({
        buildId: b.id,
        buildNumber: b.number,
        date: b.createdAt,
        violations: b.a11yAudits.reduce((sum, a) => sum + a.violationCount, 0),
      })),
    };
  });

  app.get("/projects/:id/a11y/violations", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await getProjectForUser(req, reply, id);
    if (!project) return;
    const query = violationsQuerySchema.parse(req.query);
    const { branch } = await resolveBranch(id, query.branch);
    const build = await latestAuditedBuild(id, branch);
    if (!build) return { buildId: null, branch, groupBy: query.groupBy, total: 0, rows: [] };

    const audits = await prisma.a11yAudit.findMany({
      where: { buildId: build.id, violationCount: { gt: 0 } },
      select: {
        storyId: true,
        storyTitle: true,
        lastChangedAt: true,
        violations: {
          select: {
            ruleId: true,
            impact: true,
            description: true,
            helpUrl: true,
            nodeCount: true,
            targets: true,
          },
        },
      },
    });
    const grouped = query.groupBy === "rule" ? groupByRule(audits) : groupByTest(audits);
    const rows = filterRows(grouped, query.search);
    return { buildId: build.id, branch, groupBy: query.groupBy, total: rows.length, rows };
  });
}
