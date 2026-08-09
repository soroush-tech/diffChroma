import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import type { QueueConnection } from "@diffchroma/shared";
import { registerA11yRoutes } from "./routes/a11y.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerIngestRoutes } from "./routes/ingest.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";

/** Build the Fastify app without connecting infrastructure or listening —
 *  tests inject against this. Ingest routes publish to RabbitMQ, so they are
 *  only registered when a queue connection is provided. */
export async function buildApp(queue?: QueueConnection): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation", issues: err.issues });
    }
    req.log.error(err);
    return reply.code(err.statusCode ?? 500).send({ error: err.message });
  });

  app.get("/health", async () => ({ ok: true }));

  registerWebhookRoutes(app);
  if (queue) registerIngestRoutes(app, queue);
  registerDashboardRoutes(app);
  registerA11yRoutes(app);
  return app;
}
