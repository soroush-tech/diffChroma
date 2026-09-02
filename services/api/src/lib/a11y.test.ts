import { describe, expect, it } from "vitest";
import {
  filterRows,
  groupByRule,
  groupByTest,
  sinceDate,
  toWireImpact,
  worstImpact,
  type AuditInput,
} from "@diffchroma/shared/a11y";

const violation = (over: Partial<AuditInput["violations"][number]>) => ({
  ruleId: "color-contrast",
  impact: "SERIOUS",
  description: "Elements must meet contrast ratio thresholds",
  helpUrl: "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
  nodeCount: 1,
  targets: [".btn"],
  ...over,
});

const audit = (over: Partial<AuditInput>): AuditInput => ({
  storyId: "button--primary",
  storyTitle: "Button / Primary",
  lastChangedAt: new Date("2026-08-01T00:00:00Z"),
  violations: [violation({})],
  ...over,
});

describe("impact helpers", () => {
  it("lowercases DB impacts and defaults unknown to minor", () => {
    expect(toWireImpact("CRITICAL")).toBe("critical");
    expect(toWireImpact("bogus")).toBe("minor");
  });
  it("picks the worst impact", () => {
    expect(worstImpact(["minor", "critical", "moderate"])).toBe("critical");
    expect(worstImpact([])).toBeNull();
  });
});

describe("groupByTest", () => {
  it("drops audits with no violations and aggregates the rest", () => {
    const rows = groupByTest([
      audit({}),
      audit({ storyId: "clean--story", storyTitle: "Clean / Story", violations: [] }),
      audit({
        storyId: "form--broken",
        storyTitle: "Form / Broken",
        violations: [
          violation({ ruleId: "image-alt", impact: "CRITICAL", nodeCount: 2 }),
          violation({ nodeCount: 3 }),
        ],
      }),
    ]);
    expect(rows.map((r) => r.key)).toEqual(["form--broken", "button--primary"]);
    const broken = rows[0]!;
    expect(broken.violations).toBe(2);
    expect(broken.nodes).toBe(5);
    expect(broken.impact).toBe("critical");
    expect(broken.children[0]!.key).toBe("image-alt");
  });
});

describe("groupByRule", () => {
  it("transposes stories under rules and counts affected stories", () => {
    const rows = groupByRule([
      audit({}),
      audit({
        storyId: "form--broken",
        storyTitle: "Form / Broken",
        lastChangedAt: new Date("2026-08-05T00:00:00Z"),
        violations: [violation({ nodeCount: 4 }), violation({ ruleId: "image-alt", impact: "CRITICAL" })],
      }),
    ]);
    const contrast = rows.find((r) => r.key === "color-contrast")!;
    expect(contrast.violations).toBe(2);
    expect(contrast.nodes).toBe(5);
    expect(contrast.lastChangedAt).toBe("2026-08-05T00:00:00.000Z");
    expect(contrast.children.map((c) => c.key)).toEqual(["form--broken", "button--primary"]);
    expect(rows.find((r) => r.key === "image-alt")!.impact).toBe("critical");
  });
});

describe("filterRows", () => {
  const rows = groupByTest([
    audit({}),
    audit({ storyId: "form--broken", storyTitle: "Form / Broken" }),
  ]);
  it("matches parent titles case-insensitively", () => {
    expect(filterRows(rows, "BUTTON").map((r) => r.key)).toEqual(["button--primary"]);
  });
  it("keeps parents whose children match", () => {
    expect(filterRows(rows, "color-contrast")).toHaveLength(2);
  });
  it("returns everything for blank search", () => {
    expect(filterRows(rows, "  ")).toHaveLength(2);
  });
});

describe("sinceDate", () => {
  it("subtracts whole days", () => {
    expect(sinceDate(7, new Date("2026-08-08T12:00:00Z")).toISOString()).toBe(
      "2026-08-01T12:00:00.000Z",
    );
  });
});
