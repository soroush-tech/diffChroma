import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import type { Page } from "playwright";
import type { AxeResults } from "axe-core";
import { prisma, type A11yImpact } from "@diffchroma/db";

// Native-ESM worker: `require` does not exist, and axe-core ships no `exports`
// map, so createRequire is the supported way to resolve its bundled script.
const require = createRequire(import.meta.url);

export interface AxeViolation {
  ruleId: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  helpUrl: string;
  nodeCount: number;
  targets: string[];
}

/** Read axe's browser bundle. Returns null (a11y skipped) instead of throwing —
 *  an unavailable audit must never take the whole build down. */
export function loadAxeSource(): string | null {
  try {
    return readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  } catch (err) {
    console.error("[render] axe-core unavailable, a11y skipped:", err);
    return null;
  }
}

/** Run axe against the already-rendered story page and normalize the result.
 *  axe types `impact` as possibly null/undefined; the DB enum is required, so
 *  unknown impact degrades to "minor". */
export async function auditPage(page: Page, axeSource: string): Promise<AxeViolation[]> {
  await page.addScriptTag({ content: axeSource });
  const results = (await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axe = (window as any).axe;
    return (await axe.run(document, {
      rules: { region: { enabled: false } },
    })) as unknown;
  })) as AxeResults;
  return results.violations.map((v) => ({
    ruleId: v.id,
    impact: (v.impact ?? "minor") as AxeViolation["impact"],
    description: v.description,
    helpUrl: v.helpUrl,
    nodeCount: v.nodes.length,
    targets: v.nodes.slice(0, 10).map((n) => n.target.map(String).join(" ")),
  }));
}

/** Stable digest of a story's violation set, used to carry `lastChangedAt`
 *  forward across builds whose audit result did not change. */
export function fingerprintViolations(violations: AxeViolation[]): string {
  const parts = violations
    .map((v) => `${v.ruleId}:${v.nodeCount}`)
    .sort()
    .join("|");
  return createHash("sha1").update(parts).digest("hex");
}

const IMPACT_TO_DB: Record<AxeViolation["impact"], A11yImpact> = {
  critical: "CRITICAL",
  serious: "SERIOUS",
  moderate: "MODERATE",
  minor: "MINOR",
};

const IMPACT_ORDER: AxeViolation["impact"][] = ["critical", "serious", "moderate", "minor"];

export const toDbImpact = (impact: AxeViolation["impact"]): A11yImpact => IMPACT_TO_DB[impact];

export async function persistAudit(opts: {
  buildId: string;
  projectId: string;
  branch: string;
  buildNumber: number;
  story: { id: string; title: string; name: string };
  viewport: string;
  violations: AxeViolation[];
  error?: string;
}): Promise<void> {
  const { buildId, projectId, branch, buildNumber, story, viewport, violations, error } = opts;
  const fingerprint = fingerprintViolations(violations);
  const prev = await prisma.a11yAudit.findFirst({
    where: { storyId: story.id, build: { projectId, branch, number: { lt: buildNumber } } },
    orderBy: { build: { number: "desc" } },
    select: { fingerprint: true, lastChangedAt: true },
  });
  const lastChangedAt =
    prev && prev.fingerprint === fingerprint ? prev.lastChangedAt : new Date();
  const worstImpact = IMPACT_ORDER.find((i) => violations.some((v) => v.impact === i));
  await prisma.a11yAudit.create({
    data: {
      buildId,
      storyId: story.id,
      componentTitle: story.title,
      storyName: story.name,
      storyTitle: `${story.title} / ${story.name}`,
      viewport,
      violationCount: violations.length,
      nodeCount: violations.reduce((sum, v) => sum + v.nodeCount, 0),
      worstImpact: worstImpact ? toDbImpact(worstImpact) : null,
      fingerprint,
      lastChangedAt,
      error: error ?? null,
      violations: {
        create: violations.map((v) => ({
          ruleId: v.ruleId,
          impact: toDbImpact(v.impact),
          description: v.description,
          helpUrl: v.helpUrl,
          nodeCount: v.nodeCount,
          targets: v.targets,
        })),
      },
    },
  });
}
