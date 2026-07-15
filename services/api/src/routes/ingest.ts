import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@diffchroma/db";
import {
  QUEUES,
  config,
  createCheckRun,
  presignPut,
  s3Keys,
  type QueueConnection,
} from "@diffchroma/shared";
import { requireProject } from "../auth.js";

const createBuildSchema = z.object({
  commitSha: z.string().min(1),
  branch: z.string().min(1),
  prNumber: z.number().int().optional(),
});

/** Routes used by the GitHub Action / CI, authenticated with the project token. */
export function registerIngestRoutes(app: FastifyInstance, queue: QueueConnection): void {
  app.post("/v1/builds", { preHandler: requireProject }, async (req, reply) => {
    const body = createBuildSchema.parse(req.body);
    const project = req.project!;

    // Allocate the next build number; retry once on a concurrent-insert race.
    for (let attempt = 0; ; attempt++) {
      const max = await prisma.build.aggregate({
        where: { projectId: project.id },
        _max: { number: true },
      });
      const number = (max._max.number ?? 0) + 1;
      const zipKey = s3Keys.upload(project.customerId, project.id, number);
      try {
        const build = await prisma.build.create({
          data: {
            projectId: project.id,
            number,
            commitSha: body.commitSha,
            branch: body.branch,
            prNumber: body.prNumber,
            storybookZipKey: zipKey,
          },
        });
        const uploadUrl = await presignPut(zipKey, "application/zip");
        return reply.code(201).send({
          buildId: build.id,
          number,
          uploadUrl,
          dashboardUrl: `${config.DASHBOARD_URL}/builds/${build.id}`,
        });
      } catch (err) {
        if (attempt === 0 && err instanceof Error && err.message.includes("Unique constraint")) continue;
        throw err;
      }
    }
  });

  app.post("/v1/builds/:id/uploaded", { preHandler: requireProject }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = req.project!;
    const build = await prisma.build.findFirst({ where: { id, projectId: project.id } });
    if (!build) return reply.code(404).send({ error: "build not found" });
    if (build.status !== "QUEUED") return reply.code(409).send({ error: `build is ${build.status}` });

    let checkRunId: number | null = null;
    if (project.installationId && project.repoFullName) {
      try {
        checkRunId = await createCheckRun(
          { repoFullName: project.repoFullName, installationId: project.installationId },
          build.commitSha,
          `${config.DASHBOARD_URL}/builds/${build.id}`,
        );
      } catch (err) {
        req.log.error({ err }, "failed to create check run");
      }
    }

    if (checkRunId != null) {
      await prisma.build.update({ where: { id: build.id }, data: { checkRunId } });
    }
    queue.publish(QUEUES.render, { buildId: build.id });
    return { ok: true, buildId: build.id };
  });

  app.get("/v1/builds/:id", { preHandler: requireProject }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const build = await prisma.build.findFirst({ where: { id, projectId: req.project!.id } });
    if (!build) return reply.code(404).send({ error: "build not found" });
    return {
      buildId: build.id,
      number: build.number,
      status: build.status,
      storyCount: build.storyCount,
      changedCount: build.changedCount,
      newCount: build.newCount,
      error: build.error,
      dashboardUrl: `${config.DASHBOARD_URL}/builds/${build.id}`,
    };
  });
}
