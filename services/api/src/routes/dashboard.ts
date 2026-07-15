import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma, type Snapshot } from "@diffchroma/db";
import { presignGet } from "@diffchroma/shared";
import { requireUser, signSession } from "../auth.js";
import { resolveBuildIfComplete } from "../lib/resolution.js";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const createProjectSchema = z.object({ name: z.string().min(1), repoFullName: z.string().optional() });
const commentSchema = z.object({ body: z.string().min(1).max(5000) });

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
    const project = await prisma.project.findFirst({
      where: { id, customerId: req.user!.customerId },
    });
    if (!project) return reply.code(404).send({ error: "not found" });
    return project;
  });

  app.get("/projects/:id/builds", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findFirst({ where: { id, customerId: req.user!.customerId } });
    if (!project) return reply.code(404).send({ error: "not found" });
    const builds = await prisma.build.findMany({
      where: { projectId: id },
      orderBy: { number: "desc" },
      take: 50,
    });
    return builds;
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
