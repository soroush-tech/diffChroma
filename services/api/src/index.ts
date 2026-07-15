import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { config, connectQueue } from "@diffchroma/shared";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerIngestRoutes } from "./routes/ingest.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";

async function main() {
  const queue = await connectQueue();

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation", issues: err.issues });
    }
    req.log.error(err);
    return reply.code(err.statusCode ?? 500).send({ error: err.message });
  });

  app.get("/health", async () => ({ ok: true }));

  registerWebhookRoutes(app);
  registerIngestRoutes(app, queue);
  registerDashboardRoutes(app);

  await app.listen({ port: config.API_PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
