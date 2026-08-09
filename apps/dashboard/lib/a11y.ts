import { toCsv } from "@diffchroma/shared/csv";
import type { PaletteColor } from "@soroush.tech/design-system";

export type WireImpact = "critical" | "serious" | "moderate" | "minor";

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

export interface A11ySummaryResponse {
  enabled: boolean;
  branches: string[];
  branch: string;
  build: { id: string; number: number; createdAt: string } | null;
  totals: {
    violations: number;
    nodes: number;
    components: number;
    tests: number;
    byImpact: Record<WireImpact, number>;
  };
}

export interface A11yTimeseriesResponse {
  points: { buildId: string; buildNumber: number; date: string; violations: number }[];
}

export interface A11yViolationsResponse {
  buildId: string | null;
  branch: string;
  groupBy: "test" | "rule";
  total: number;
  rows: A11yRow[];
}

export const impactTone: Record<WireImpact, PaletteColor> = {
  critical: "error",
  serious: "warning",
  moderate: "info",
  minor: "default",
};

/** Chromatic-style ordinal impact values so the CSV sorts by severity. */
const IMPACT_ORDINAL: Record<WireImpact, string> = {
  minor: "0-minor",
  moderate: "1-moderate",
  serious: "2-serious",
  critical: "3-critical",
};

export function buildA11yCsv(rows: readonly A11yRow[], groupBy: "test" | "rule"): string {
  const header =
    groupBy === "test"
      ? ["test", "rule", "impact", "nodes", "help_url", "last_changed"]
      : ["rule", "test", "impact", "nodes", "help_url", "last_changed"];
  const body = rows.flatMap((row) =>
    row.children.map((child) => [
      row.title,
      child.title,
      IMPACT_ORDINAL[child.impact],
      child.nodes,
      child.helpUrl ?? row.helpUrl ?? "",
      row.lastChangedAt ?? "",
    ]),
  );
  return toCsv(header, body);
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Branch names may contain path separators; keep the filename flat.
  a.download = filename.replace(/[\\/]/g, "-");
  a.click();
  URL.revokeObjectURL(url);
}
