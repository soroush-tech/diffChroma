import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** Stateless factory — a fresh server per request. Tool registrations land
 *  in the follow-up change. */
export function createMcpServer(): McpServer {
  return new McpServer({ name: "diffchroma", version: "0.1.0" });
}
