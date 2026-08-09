import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { Prisma, prisma, type Snapshot } from "@diffchroma/db";
import { presignGet } from "@diffchroma/shared";
import { requireUser, signSession } from "../auth.js";
import { buildLibraryTree, componentTitleOf, type LibraryEntry } from "../lib/libraryTree.js";
import { resolveBuildIfComplete } from "../lib/resolution.js";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const createProjectSchema = z.object({ name: z.string().min(1), repoFullName: z.string().optional() });
const commentSchema = z.object({ body: z.string().min(1).max(5000) });
const patchProjectSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    maxDiffPixelRatio: z.number().min(0).max(1).optional(),
    autoAcceptFirstBuild: z.boolean().optional(),
    a11yEnabled: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "empty patch" });

export async function getProjectForUser(req: FastifyRequest, reply: FastifyReply, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, customerId: req.user!.customerId },
  });
  if (!project) {
    reply.code(404).send({ error: "not found" });
    return null;
  }
  return project;
}

async function snapshotView(snap: Snapshot, baselineImageKeys: Map<string, string>) {
  return {
    id: snap.id,
    storyId: snap.storyId,
    storyTitle: snap.storyTitle,
    viewport: snap.viewport,
    status: snap.status,
    diffPixelRatio: snap.diffPixelRatio,
    imageUrl: await presignGet(snap.imageKey),
    diffUrl: snap.diffKey ? await presignGet(snap.diffKey) : null,
    baselineUrl: snap.baselineSnapshotId
      ? await presignGet(baselineImageKeys.get(snap.baselineSnapshotId)!)
      : null,
  };
}

export function registerDashboardRoutes(app: FastifyInstance): void {
  app.post("/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: "invalid credentials" });
    }
    return { token: signSession(user.id), user: { id: user.id, email: user.email, name: user.name } };
  });

  app.get("/me", { preHandler: requireUser }, async (req) => {
    const { id, email, name, customerId } = req.user!;
    return { id, email, name, customerId };
  });

  // ---- projects ----

  app.get("/projects", { preHandler: requireUser }, async (req) => {
    const projects = await prisma.project.findMany({
      where: { customerId: req.user!.customerId },
      include: {
        builds: { orderBy: { number: "desc" }, take: 1 },
        _count: { select: { builds: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      repoFullName: p.repoFullName,
      buildCount: p._count.builds,
      latestBuild: p.builds[0]
        ? { id: p.builds[0].id, number: p.builds[0].number, status: p.builds[0].status }
        : null,
    }));
  });

  app.post("/projects", { preHandler: requireUser }, async (req, reply) => {
    const body = createProjectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        customerId: req.user!.customerId,
        name: body.name,
        repoFullName: body.repoFullName,
        projectToken: `dc_${randomBytes(24).toString("hex")}`,
      },
    });
    return reply.code(201).send(project);
  });

  app.get("/projects/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await getProjectForUser(req, reply, id);
    if (!project) return;
    return project;
  });

  app.patch("/projects/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await getProjectForUser(req, reply, id);
    if (!project) return;
    const patch = patchProjectSchema.parse(req.body);
    try {
      return await prisma.project.update({ where: { id }, data: patch });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.code(409).send({ error: "name already in use" });
      }
      throw err;
    }
  });

  app.get("/projects/:id/builds", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await getProjectForUser(req, reply, id);
    if (!project) return;
    const builds = await prisma.build.findMany({
      where: { projectId: id },
      orderBy: { number: "desc" },
      take: 50,
    });
    return builds;
  });

  app.get("/projects/:id/usage", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await getProjectForUser(req, reply, id);
    if (!project) return;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [visual, a11y, builds, baselines] = await Promise.all([
      prisma.snapshot.count({
        where: { build: { projectId: id }, createdAt: { gte: monthStart } },
      }),
      prisma.a11yAudit.count({
        where: { build: { projectId: id }, createdAt: { gte: monthStart } },
      }),
      prisma.build.count({ where: { projectId: id, createdAt: { gte: monthStart } } }),
      prisma.baseline.findMany({
        where: { projectId: id },
        select: { snapshot: { select: { storyTitle: true } } },
      }),
    ]);
    const componentCount = new Set(baselines.map((b) => componentTitleOf(b.snapshot.storyTitle)))
      .size;
    return {
      month: now.toISOString().slice(0, 7),
      snapshotsThisMonth: visual + a11y,
      visualThisMonth: visual,
      a11yThisMonth: a11y,
      buildsThisMonth: builds,
      componentCount,
    };
  });

  app.get("/projects/:id/library", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await getProjectForUser(req, reply, id);
    if (!project) return;
    const [latestBuild, baselines] = await Promise.all([
      prisma.build.findFirst({
        where: { projectId: id },
        orderBy: { number: "desc" },
        select: { id: true, number: true, branch: true },
      }),
      prisma.baseline.findMany({
        where: { projectId: id },
        select: {
          storyId: true,
          viewport: true,
          updatedAt: true,
          snapshot: {
            select: {
              id: true,
              storyTitle: true,
              imageKey: true,
              buildId: true,
              build: { select: { number: true } },
            },
          },
        },
      }),
    ]);
    const entries: LibraryEntry[] = baselines.map((b) => ({
      storyId: b.storyId,
      storyTitle: b.snapshot.storyTitle,
      viewport: b.viewport,
      snapshotId: b.snapshot.id,
      imageKey: b.snapshot.imageKey,
      buildId: b.snapshot.buildId,
      buildNumber: b.snapshot.build.number,
      updatedAt: b.updatedAt,
    }));
    const tree = buildLibraryTree(entries);
    const components = await Promise.all(
      tree.components.map(async (component) => ({
        ...component,
        stories: await Promise.all(
          component.stories.map(async (story) => ({
            storyId: story.storyId,
            name: story.name,
            viewports: await Promise.all(
              story.viewports.map(async ({ imageKey, ...vp }) => ({
                ...vp,
                imageUrl: await presignGet(imageKey),
              })),
            ),
          })),
        ),
      })),
    );
    return {
      latest: latestBuild
        ? { buildId: latestBuild.id, buildNumber: latestBuild.number, branch: latestBuild.branch }
        : null,
      totals: tree.totals,
      components,
    };
  });

  // ---- builds & snapshots ----

  async function getBuildForUser(req: FastifyRequest, reply: FastifyReply, buildId: string) {
    const build = await prisma.build.findFirst({
      where: { id: buildId, project: { customerId: req.user!.customerId } },
      include: { project: true },
    });
    if (!build) {
      reply.code(404).send({ error: "not found" });
      return null;
    }
    return build;
  }

  app.get("/builds/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const build = await getBuildForUser(req, reply, id);
    if (!build) return;

    const snapshots = await prisma.snapshot.findMany({
      where: { buildId: id },
      orderBy: [{ storyTitle: "asc" }, { storyId: "asc" }],
    });
    const baselineIds = snapshots.map((s) => s.baselineSnapshotId).filter((x): x is string => !!x);
    const baselineSnaps = await prisma.snapshot.findMany({ where: { id: { in: baselineIds } } });
    const baselineImageKeys = new Map(baselineSnaps.map((s) => [s.id, s.imageKey]));

    return {
      id: build.id,
      number: build.number,
      status: build.status,
      commitSha: build.commitSha,
      branch: build.branch,
      prNumber: build.prNumber,
      error: build.error,
      createdAt: build.createdAt,
      project: { id: build.project.id, name: build.project.name },
      counts: {
        total: build.storyCount,
        changed: build.changedCount,
        new: build.newCount,
      },
      snapshots: await Promise.all(snapshots.map((s) => snapshotView(s, baselineImageKeys))),
    };
  });

  app.post("/builds/:id/approve-all", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const build = await getBuildForUser(req, reply, id);
    if (!build) return;
    await prisma.snapshot.updateMany({
      where: { buildId: id, status: { in: ["NEW", "CHANGED"] } },
      data: { status: "APPROVED" },
    });
    return resolveBuildIfComplete(id);
  });

  async function setSnapshotStatus(
    req: FastifyRequest,
    reply: FastifyReply,
    status: "APPROVED" | "REJECTED",
  ) {
    const { id } = req.params as { id: string };
    const snap = await prisma.snapshot.findFirst({
      where: { id, build: { project: { customerId: req.user!.customerId } } },
    });
    if (!snap) return reply.code(404).send({ error: "not found" });
    if (!["NEW", "CHANGED", "APPROVED", "REJECTED"].includes(snap.status)) {
      return reply.code(409).send({ error: `snapshot is ${snap.status}` });
    }
    await prisma.snapshot.update({ where: { id }, data: { status } });
    const build = await resolveBuildIfComplete(snap.buildId);
    return { ok: true, buildStatus: build.status };
  }

  app.post("/snapshots/:id/approve", { preHandler: requireUser }, (req, reply) =>
    setSnapshotStatus(req, reply, "APPROVED"),
  );
  app.post("/snapshots/:id/reject", { preHandler: requireUser }, (req, reply) =>
    setSnapshotStatus(req, reply, "REJECTED"),
  );

  // ---- comments ----

  app.get("/snapshots/:id/comments", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const snap = await prisma.snapshot.findFirst({
      where: { id, build: { project: { customerId: req.user!.customerId } } },
    });
    if (!snap) return reply.code(404).send({ error: "not found" });
    return prisma.comment.findMany({ where: { snapshotId: id }, orderBy: { createdAt: "asc" } });
  });

  app.post("/snapshots/:id/comments", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = commentSchema.parse(req.body);
    const snap = await prisma.snapshot.findFirst({
      where: { id, build: { project: { customerId: req.user!.customerId } } },
    });
    if (!snap) return reply.code(404).send({ error: "not found" });
    const comment = await prisma.comment.create({
      data: { snapshotId: id, userId: req.user!.id, authorName: req.user!.name, body: body.body },
    });
    return reply.code(201).send(comment);
  });
}
