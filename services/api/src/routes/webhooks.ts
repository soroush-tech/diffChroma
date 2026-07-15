import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "@diffchroma/db";
import { config } from "@diffchroma/shared";

function verifySignature(secret: string, payload: string, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface InstallationPayload {
  action?: string;
  installation?: { id: number };
  repositories?: { full_name: string }[];
  repositories_added?: { full_name: string }[];
  repositories_removed?: { full_name: string }[];
}

/**
 * GitHub App webhook. The only thing DiffChroma needs from webhooks is the
 * mapping repoFullName -> installationId so it can post Check Runs.
 */
export function registerWebhookRoutes(app: FastifyInstance): void {
  // Keep the raw body for signature verification.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string", bodyLimit: 5 * 1024 * 1024 },
    (req, body, done) => {
      (req as { rawBody?: string }).rawBody = body as string;
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error);
      }
    },
  );

  app.post("/webhooks/github", async (req, reply) => {
    if (config.GITHUB_WEBHOOK_SECRET) {
      const raw = (req as { rawBody?: string }).rawBody ?? "";
      const sig = req.headers["x-hub-signature-256"] as string | undefined;
      if (!verifySignature(config.GITHUB_WEBHOOK_SECRET, raw, sig)) {
        return reply.code(401).send({ error: "bad signature" });
      }
    }

    const event = req.headers["x-github-event"] as string | undefined;
    const payload = req.body as InstallationPayload;

    if ((event === "installation" || event === "installation_repositories") && payload.installation) {
      const installationId = payload.installation.id;
      const added = [...(payload.repositories ?? []), ...(payload.repositories_added ?? [])].map(
        (r) => r.full_name,
      );
      const removed = (payload.repositories_removed ?? []).map((r) => r.full_name);

      if (payload.action === "deleted") {
        await prisma.project.updateMany({ where: { installationId }, data: { installationId: null } });
      } else {
        if (added.length > 0) {
          await prisma.project.updateMany({
            where: { repoFullName: { in: added } },
            data: { installationId },
          });
        }
        if (removed.length > 0) {
          await prisma.project.updateMany({
            where: { repoFullName: { in: removed } },
            data: { installationId: null },
          });
        }
      }
      req.log.info({ installationId, added, removed, action: payload.action }, "installation event");
    }

    return { ok: true };
  });
}
