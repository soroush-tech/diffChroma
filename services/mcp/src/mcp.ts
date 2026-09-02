import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as q from "./queries.js";

const BUILD_STATUSES = [
  "QUEUED",
  "RENDERING",
  "COMPARING",
  "PENDING_REVIEW",
  "PASSED",
  "APPROVED",
  "REJECTED",
  "ERROR",
] as const;

const buildRefShape = {
  buildId: z.string().optional().describe("Build id. Alternative to project + buildNumber."),
  project: z.string().optional().describe("Project id or name"),
  buildNumber: z.number().int().optional().describe("Per-project build (release) number"),
};

const READ_ONLY = { readOnlyHint: true } as const;

const jsonResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

const errorResult = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

async function run(fn: () => Promise<unknown>) {
  try {
    return jsonResult(await fn());
  } catch (err) {
    if (err instanceof q.NotFoundError) return errorResult(err.message);
    throw err;
  }
}

/** Stateless factory — a fresh server per request. */
export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "diffchroma", version: "0.1.0" });

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "All DiffChroma projects with their build counts.",
      annotations: READ_ONLY,
      inputSchema: {},
    },
    () => run(() => q.listProjects()),
  );

  server.registerTool(
    "list_builds",
    {
      title: "List builds (releases) of a project",
      description:
        "Recent builds of a project, newest first. Each row carries the visual-diff counts " +
        "(changedCount, newCount) and the total accessibility violations, so this answers " +
        "\"which issues does each release have\" at a glance.",
      annotations: READ_ONLY,
      inputSchema: {
        project: z.string().describe("Project id or name"),
        branch: z.string().optional().describe("Filter to one branch"),
        status: z.enum(BUILD_STATUSES).optional().describe("Filter by build status"),
        limit: z.number().int().min(1).max(100).default(20),
      },
    },
    (args) => run(() => q.listBuilds(args)),
  );

  server.registerTool(
    "get_build",
    {
      title: "Get one build (release)",
      description:
        "One build in detail: status, commit/PR, snapshot counts by status, and accessibility " +
        "totals by impact. Identify the build by buildId, or by project (id or name) + buildNumber.",
      annotations: READ_ONLY,
      inputSchema: buildRefShape,
    },
    (args) => run(() => q.getBuild(args)),
  );

  server.registerTool(
    "get_build_issues",
    {
      title: "Get all issues in a build (release)",
      description:
        "Accessibility violations and visual diffs for one build. Identify the build by buildId, " +
        "or by project (id or name) + buildNumber. Large results are truncated and flagged.",
      annotations: READ_ONLY,
      inputSchema: {
        ...buildRefShape,
        kind: z.enum(["all", "a11y", "visual"]).default("all"),
        a11yGroupBy: z
          .enum(["rule", "story"])
          .default("rule")
          .describe("Group a11y violations by axe rule or by story"),
      },
    },
    (args) => run(() => q.getBuildIssues(args)),
  );

  server.registerTool(
    "find_builds_by_rule",
    {
      title: "Find builds affected by an axe rule",
      description:
        "Reverse lookup: which builds (releases) have accessibility violations of a given axe " +
        "ruleId (e.g. \"color-contrast\"), newest first, with affected stories and worst impact.",
      annotations: READ_ONLY,
      inputSchema: {
        ruleId: z.string().describe("Axe rule id, e.g. color-contrast"),
        project: z.string().optional().describe("Project id or name"),
        branch: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      },
    },
    (args) => run(() => q.findBuildsByRule(args)),
  );

  server.registerTool(
    "get_a11y_summary",
    {
      title: "Accessibility summary for a project",
      description:
        "Accessibility totals for the latest audited build of a project branch (defaults to " +
        "main/master when present), matching the dashboard's summary view.",
      annotations: READ_ONLY,
      inputSchema: {
        project: z.string().describe("Project id or name"),
        branch: z.string().optional(),
      },
    },
    (args) => run(() => q.a11ySummary(args)),
  );

  return server;
}
