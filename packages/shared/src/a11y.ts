/** Pure grouping/aggregation for the a11y endpoints. DB rows in (uppercase
 *  Prisma enum impacts), wire rows out (lowercase impacts). */

export type WireImpact = "critical" | "serious" | "moderate" | "minor";

const DB_TO_WIRE: Record<string, WireImpact> = {
  CRITICAL: "critical",
  SERIOUS: "serious",
  MODERATE: "moderate",
  MINOR: "minor",
};

const IMPACT_RANK: Record<WireImpact, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

export const toWireImpact = (impact: string): WireImpact => DB_TO_WIRE[impact] ?? "minor";

export function worstImpact(impacts: readonly WireImpact[]): WireImpact | null {
  if (impacts.length === 0) return null;
  return impacts.reduce((worst, i) => (IMPACT_RANK[i] < IMPACT_RANK[worst] ? i : worst));
}

export interface AuditInput {
  storyId: string;
  storyTitle: string;
  lastChangedAt: Date;
  violations: {
    ruleId: string;
    impact: string;
    description: string;
    helpUrl: string;
    nodeCount: number;
    targets: unknown;
  }[];
}

export interface A11yChildRow {
  key: string;
  title: string;
  impact: WireImpact;
  description?: string;
  helpUrl?: string;
  nodes: number;
  targets?: string[];
}

export interface A11yRow {
  key: string;
  title: string;
  violations: number;
  nodes: number;
  impact: WireImpact | null;
  lastChangedAt: string | null;
  description?: string;
  helpUrl?: string;
  children: A11yChildRow[];
}

const asTargets = (targets: unknown): string[] | undefined =>
  Array.isArray(targets) ? targets.map(String) : undefined;

function sortRows(rows: A11yRow[]): A11yRow[] {
  return rows.sort(
    (a, b) =>
      b.violations - a.violations ||
      IMPACT_RANK[a.impact ?? "minor"] - IMPACT_RANK[b.impact ?? "minor"] ||
      a.title.localeCompare(b.title),
  );
}

/** One parent row per audited story that has violations; children are its
 *  per-rule violation entries. */
export function groupByTest(audits: readonly AuditInput[]): A11yRow[] {
  const rows = audits
    .filter((a) => a.violations.length > 0)
    .map((audit) => {
      const children: A11yChildRow[] = audit.violations
        .map((v) => ({
          key: v.ruleId,
          title: v.ruleId,
          impact: toWireImpact(v.impact),
          description: v.description,
          helpUrl: v.helpUrl,
          nodes: v.nodeCount,
          targets: asTargets(v.targets),
        }))
        .sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] || b.nodes - a.nodes);
      return {
        key: audit.storyId,
        title: audit.storyTitle,
        violations: audit.violations.length,
        nodes: children.reduce((sum, c) => sum + c.nodes, 0),
        impact: worstImpact(children.map((c) => c.impact)),
        lastChangedAt: audit.lastChangedAt.toISOString(),
        children,
      };
    });
  return sortRows(rows);
}

/** Transposed view: one parent row per axe rule; children are the stories
 *  exhibiting it. Parent `violations` counts affected stories. */
export function groupByRule(audits: readonly AuditInput[]): A11yRow[] {
  const byRule = new Map<string, A11yRow>();
  for (const audit of audits) {
    for (const v of audit.violations) {
      const impact = toWireImpact(v.impact);
      let row = byRule.get(v.ruleId);
      if (!row) {
        row = {
          key: v.ruleId,
          title: v.ruleId,
          violations: 0,
          nodes: 0,
          impact,
          lastChangedAt: null,
          description: v.description,
          helpUrl: v.helpUrl,
          children: [],
        };
        byRule.set(v.ruleId, row);
      }
      row.violations += 1;
      row.nodes += v.nodeCount;
      row.impact = worstImpact([row.impact ?? "minor", impact]);
      if (row.lastChangedAt === null || audit.lastChangedAt.toISOString() > row.lastChangedAt) {
        row.lastChangedAt = audit.lastChangedAt.toISOString();
      }
      row.children.push({
        key: audit.storyId,
        title: audit.storyTitle,
        impact,
        nodes: v.nodeCount,
        targets: asTargets(v.targets),
      });
    }
  }
  for (const row of byRule.values()) {
    row.children.sort((a, b) => b.nodes - a.nodes || a.title.localeCompare(b.title));
  }
  return sortRows([...byRule.values()]);
}

/** Case-insensitive substring filter: a parent survives when its own title or
 *  any child title matches. Children are never trimmed. */
export function filterRows(rows: readonly A11yRow[], search: string): A11yRow[] {
  const needle = search.trim().toLowerCase();
  if (needle === "") return [...rows];
  return rows.filter(
    (row) =>
      row.title.toLowerCase().includes(needle) ||
      row.children.some((c) => c.title.toLowerCase().includes(needle)),
  );
}

export function sinceDate(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * 86_400_000);
}
