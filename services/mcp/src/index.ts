import { timingSafeEqual } from "node:crypto";
import { StreamableHTTPTransport } from "@hono/mcp";
import { serve } from "@hono/node-server";
import { config } from "@diffchroma/shared";
import { Hono } from "hono";
import { createMcpServer } from "./mcp.js";

const app = new Hono();

app.get("/healthz", (c) => c.json({ ok: true }));

app.use("/mcp", async (c, next) => {
  const token = config.MCP_TOKEN;
  if (!token) return next(); // open dev mode — warned at startup
  const presented = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(presented);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
});

// Stateless: a fresh McpServer + transport per request, so concurrent
// clients never share JSON-RPC state. GET (standalone SSE) yields 405.
app.all("/mcp", async (c) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPTransport();
  await server.connect(transport);
  const response = await transport.handleRequest(c);
  return response ?? c.body(null, 202);
});

if (!config.MCP_TOKEN) {
  console.warn("[mcp] MCP_TOKEN unset — /mcp is UNAUTHENTICATED (dev only)");
}

serve({ fetch: app.fetch, port: config.MCP_PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`diffchroma-mcp listening on :${info.port}`);
});
