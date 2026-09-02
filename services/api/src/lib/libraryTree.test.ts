import { describe, expect, it } from "vitest";
import { buildLibraryTree, componentTitleOf, storyNameOf, type LibraryEntry } from "./libraryTree.js";

const entry = (over: Partial<LibraryEntry>): LibraryEntry => ({
  storyId: "button--primary",
  storyTitle: "Button / Primary",
  viewport: "1280x720",
  snapshotId: "snap1",
  imageKey: "k/1.png",
  buildId: "b1",
  buildNumber: 1,
  updatedAt: new Date("2026-08-01T00:00:00Z"),
  ...over,
});

describe("componentTitleOf / storyNameOf", () => {
  it("splits on the LAST ' / ' separator", () => {
    expect(componentTitleOf("Theme/AppBar / With Menu / Open")).toBe("Theme/AppBar / With Menu");
    expect(storyNameOf("Theme/AppBar / With Menu / Open")).toBe("Open");
  });
  it("treats a separator-less title as a bare component", () => {
    expect(componentTitleOf("Standalone")).toBe("Standalone");
    expect(storyNameOf("Standalone")).toBe("Standalone");
  });
});

describe("buildLibraryTree", () => {
  it("returns empty totals for no entries", () => {
    expect(buildLibraryTree([])).toEqual({
      totals: { components: 0, stories: 0 },
      components: [],
    });
  });

  it("groups viewports under stories and stories under components", () => {
    const tree = buildLibraryTree([
      entry({ viewport: "1280x720" }),
      entry({ viewport: "375x667", snapshotId: "snap2" }),
      entry({ storyId: "button--ghost", storyTitle: "Button / Ghost", snapshotId: "snap3" }),
      entry({ storyId: "card--default", storyTitle: "Theme/Card / Default", snapshotId: "snap4" }),
    ]);
    expect(tree.totals).toEqual({ components: 2, stories: 3 });
    const button = tree.components.find((c) => c.title === "Button")!;
    expect(button.storyCount).toBe(2);
    expect(button.stories.map((s) => s.name)).toEqual(["Ghost", "Primary"]);
    expect(button.stories[1]!.viewports.map((v) => v.viewport)).toEqual(["1280x720", "375x667"]);
    const card = tree.components.find((c) => c.title === "Theme/Card")!;
    expect(card.path).toEqual(["Theme", "Card"]);
  });

  it("sorts components by title and serializes updatedAt", () => {
    const tree = buildLibraryTree([
      entry({ storyTitle: "Zeta / A", storyId: "z--a" }),
      entry({ storyTitle: "Alpha / A", storyId: "a--a" }),
    ]);
    expect(tree.components.map((c) => c.title)).toEqual(["Alpha", "Zeta"]);
    expect(tree.components[0]!.stories[0]!.viewports[0]!.updatedAt).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });
});
