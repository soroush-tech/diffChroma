/** All Prisma access for the MCP tools. Returns plain JSON-able objects,
 *  size-capped so tool results stay friendly to AI context windows. */

import { prisma, type BuildStatus, type SnapshotStatus } from "@diffchroma/db";
import {
  groupByRule,
  groupByTest,
  toWireImpact,
  worstImpact,
  type A11yRow,
  type WireImpact,
} from "@diffchroma/shared/a11y";

/** Signals a bad reference the model can repair (wrong project/build id). */
export class NotFoundError extends Error {}

const A11Y_ROW_CAP = 30;
const A11Y_CHILD_CAP = 15;
const TARGET_CAP = 3;
const SNAPSHOT_CAP = 100;

/** Builds whose render phase completed — audits exist and are final. */
const AUDITED_STATUSES: BuildStatus[] = [
  "COMPARING",
  "PENDING_REVIEW",
  "PASSED",
  "APPROVED",
  "REJECTED",
];

const EMPTY_BY_IMPACT: Record<WireImpact, number> = {
  critical: 0,
  serious: 0,
  moderate: 0,
  minor: 0,
};

async function resolveProject(ref: string) {
  const project = await prisma.project.findFirst({
    where: { OR: [{ id: ref }, { name: ref }] },
  });
  if (!project) {
    throw new NotFoundError(`No project with id or name "${ref}". Call list_projects to see valid projects.`);
  }
  return project;
}

export interface BuildRef {
  buildId?: string | undefined;
  project?: string | undefined;
  buildNumber?: number | undefined;
}

async function resolveBuild(ref: BuildRef) {
  if (ref.buildId) {
    const build = await prisma.build.findUnique({ where: { id: ref.buildId } });
    if (!build) {
      throw new NotFoundError(`No build with id "${ref.buildId}". Call list_builds to see valid builds.`);
    }
    return build;
  }
  if (ref.project === undefined || ref.buildNumber === undefined) {
    throw new NotFoundError("Identify the build by buildId, or by project (id or name) plus buildNumber.");
  }
  const project = await resolveProject(ref.project);
  const build = await prisma.build.findUnique({
    where: { projectId_number: { projectId: project.id, number: ref.buildNumber } },
  });
  if (!build) {
    throw new NotFoundError(
      `Project "${project.name}" has no build number ${ref.buildNumber}. Call list_builds to see valid builds.`,
    );
  }
  return build;
}

export async function listProjects() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      repoFullName: true,
      a11yEnabled: true,
      createdAt: true,
      _count: { select: { builds: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return {
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      repoFullName: p.repoFullName,
      a11yEnabled: p.a11yEnabled,
      createdAt: p.createdAt.toISOString(),
      buildCount: p._count.builds,
    })),
  };
}

export async function listBuilds(args: {
  project: string;
  branch?: string | undefined;
  status?: BuildStatus | undefined;
  limit: number;
}) {
  const project = await resolveProject(args.project);
  const builds = await prisma.build.findMany({
    where: {
      projectId: project.id,
      ...(args.branch ? { branch: args.branch } : {}),
      ...(args.status ? { status: args.status } : {}),
    },
    orderBy: { number: "desc" },
    take: args.limit,
    select: {
      id: true,
      number: true,
      branch: true,
      commitSha: true,
      prNumber: true,
      status: true,
      storyCount: true,
      changedCount: true,
      newCount: true,
      createdAt: true,
      completedAt: true,
    },
  });
  const sums = await prisma.a11yAudit.groupBy({
    by: ["buildId"],
    where: { buildId: { in: builds.map((b) => b.id) } },
    _sum: { violationCount: true },
  });
  const violationsByBuild = new Map(sums.map((s) => [s.buildId, s._sum.violationCount ?? 0]));
  return {
    project: { id: project.id, name: project.name },
    builds: builds.map((b) => ({
      id: b.id,
      number: b.number,
      branch: b.branch,
      commitSha: b.commitSha,
      prNumber: b.prNumber,
      status: b.status,
      storyCount: b.storyCount,
      changedCount: b.changedCount,
      newCount: b.newCount,
      a11yViolations: violationsByBuild.get(b.id) ?? 0,
      createdAt: b.createdAt.toISOString(),
      completedAt: b.completedAt?.toISOString() ?? null,
    })),
  };
}

export async function getBuild(ref: BuildRef) {
  const build = await resolveBuild(ref);
  const [snapshotGroups, audits, impacts] = await Promise.all([
    prisma.snapshot.groupBy({
      by: ["status"],
      where: { buildId: build.id },
      _count: { _all: true },
    }),
    prisma.a11yAudit.aggregate({
      where: { buildId: build.id },
      _sum: { violationCount: true, nodeCount: true },
      _count: { _all: true },
    }),
    prisma.a11yViolation.groupBy({
      by: ["impact"],
      where: { audit: { buildId: build.id } },
      _count: { _all: true },
    }),
  ]);
  const byStatus: Record<string, number> = {};
  for (const group of snapshotGroups) byStatus[group.status] = group._count._all;
  const byImpact = { ...EMPTY_BY_IMPACT };
  for (const group of impacts) byImpact[toWireImpact(group.impact)] += group._count._all;
  return {
    id: build.id,
    projectId: build.projectId,
    number: build.number,
    branch: build.branch,
    commitSha: build.commitSha,
    prNumber: build.prNumber,
    status: build.status,
    error: build.error,
    storyCount: build.storyCount,
    changedCount: build.changedCount,
    newCount: build.newCount,
    createdAt: build.createdAt.toISOString(),
    completedAt: build.completedAt?.toISOString() ?? null,
    snapshots: { byStatus },
    a11y: {
      auditedStories: audits._count._all,
      totalViolations: audits._sum.violationCount ?? 0,
      nodes: audits._sum.nodeCount ?? 0,
      byImpact,
    },
  };
}

function trimA11yRows(rows: A11yRow[]) {
  const kept = rows.slice(0, A11Y_ROW_CAP).map((row) => {
    const children = row.children.slice(0, A11Y_CHILD_CAP).map((child) => ({
      ...child,
      ...(child.targets ? { targets: child.targets.slice(0, TARGET_CAP) } : {}),
    }));
    const omittedChildren = row.children.length - children.length;
    return { ...row, children, ...(omittedChildren > 0 ? { omittedChildren } : {}) };
  });
  const truncated =
    rows.length > A11Y_ROW_CAP ||
    rows.some(
      (row) =>
        row.children.length > A11Y_CHILD_CAP ||
        row.children.some((child) => (child.targets?.length ?? 0) > TARGET_CAP),
    );
  return { rows: kept, truncated };
}

export async function getBuildIssues(args: {
  kind: "all" | "a11y" | "visual";
  a11yGroupBy: "rule" | "story";
} & BuildRef) {
  const build = await resolveBuild(args);
  const result: Record<string, unknown> = {
    build: {
      id: build.id,
      number: build.number,
      branch: build.branch,
      commitSha: build.commitSha,
      prNumber: build.prNumber,
      status: build.status,
    },
  };

  if (args.kind !== "a11y") {
    const visualWhere = {
      buildId: build.id,
      status: { in: ["NEW", "CHANGED", "REJECTED"] as SnapshotStatus[] },
    };
    const [total, snapshots] = await Promise.all([
      prisma.snapshot.count({ where: visualWhere }),
      prisma.snapshot.findMany({
        where: visualWhere,
        select: {
          storyId: true,
          storyTitle: true,
          viewport: true,
          status: true,
          diffPixelRatio: true,
        },
        orderBy: [{ status: "asc" }, { diffPixelRatio: { sort: "desc", nulls: "last" } }],
        take: SNAPSHOT_CAP,
      }),
    ]);
    result.visual = { total, snapshots, truncated: total > SNAPSHOT_CAP };
  }

  if (args.kind !== "visual") {
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
    const grouped = args.a11yGroupBy === "rule" ? groupByRule(audits) : groupByTest(audits);
    const { rows, truncated } = trimA11yRows(grouped);
    result.a11y = { groupBy: args.a11yGroupBy, totalRows: grouped.length, rows, truncated };
  }

  return result;
}

export async function findBuildsByRule(args: {
  ruleId: string;
  project?: string | undefined;
  branch?: string | undefined;
  limit: number;
}) {
  const projectId = args.project ? (await resolveProject(args.project)).id : undefined;
  const builds = await prisma.build.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(args.branch ? { branch: args.branch } : {}),
      a11yAudits: { some: { violations: { some: { ruleId: args.ruleId } } } },
    },
    orderBy: { createdAt: "desc" },
    take: args.limit,
    select: {
      id: true,
      projectId: true,
      number: true,
      branch: true,
      status: true,
      createdAt: true,
      a11yAudits: {
        where: { violations: { some: { ruleId: args.ruleId } } },
        take: 25,
        select: {
          storyTitle: true,
          violations: {
            where: { ruleId: args.ruleId },
            select: { impact: true, nodeCount: true },
          },
        },
      },
    },
  });
  return {
    ruleId: args.ruleId,
    builds: builds.map((b) => {
      const impacts = b.a11yAudits.flatMap((a) => a.violations.map((v) => toWireImpact(v.impact)));
      const nodes = b.a11yAudits.reduce(
        (sum, a) => sum + a.violations.reduce((inner, v) => inner + v.nodeCount, 0),
        0,
      );
      return {
        buildId: b.id,
        projectId: b.projectId,
        buildNumber: b.number,
        branch: b.branch,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        affectedStories: b.a11yAudits.length,
        stories: b.a11yAudits.slice(0, 10).map((a) => a.storyTitle),
        nodes,
        worstImpact: worstImpact(impacts),
      };
    }),
  };
}

/** Branches with recent builds, newest activity first; the requested branch is
 *  honored only when it actually exists. Default is the trunk (main/master)
 *  when present. Mirrors the dashboard's REST behavior. */
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

export async function a11ySummary(args: { project: string; branch?: string | undefined }) {
  const project = await resolveProject(args.project);
  const { branches, branch } = await resolveBranch(project.id, args.branch);
  const build = await prisma.build.findFirst({
    where: {
      projectId: project.id,
      branch,
      status: { in: AUDITED_STATUSES },
      a11yAudits: { some: {} },
    },
    orderBy: { number: "desc" },
    select: { id: true, number: true, createdAt: true },
  });

  if (!build) {
    return {
      project: { id: project.id, name: project.name },
      enabled: project.a11yEnabled,
      branches,
      branch,
      build: null,
      totals: { violations: 0, nodes: 0, components: 0, tests: 0, byImpact: { ...EMPTY_BY_IMPACT } },
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
  const byImpact = { ...EMPTY_BY_IMPACT };
  for (const group of impacts) byImpact[toWireImpact(group.impact)] += group._count._all;

  return {
    project: { id: project.id, name: project.name },
    enabled: project.a11yEnabled,
    branches,
    branch,
    build: { id: build.id, number: build.number, createdAt: build.createdAt.toISOString() },
    totals: {
      violations: aggregate._sum.violationCount ?? 0,
      nodes: aggregate._sum.nodeCount ?? 0,
      components: new Set(audits.map((a) => a.componentTitle)).size,
      tests: aggregate._count._all,
      byImpact,
    },
  };
}
