/** Pure grouping logic for the Library endpoint: flat baseline rows in,
 *  component tree out. Presigning stays in the route layer. */

export interface LibraryEntry {
  storyId: string;
  storyTitle: string;
  viewport: string;
  snapshotId: string;
  imageKey: string;
  buildId: string;
  buildNumber: number;
  updatedAt: Date;
}

export interface LibraryViewport {
  viewport: string;
  imageKey: string;
  snapshotId: string;
  buildId: string;
  buildNumber: number;
  updatedAt: string;
}

export interface LibraryStory {
  storyId: string;
  name: string;
  viewports: LibraryViewport[];
}

export interface LibraryComponent {
  title: string;
  path: string[];
  storyCount: number;
  stories: LibraryStory[];
}

export interface LibraryTree {
  totals: { components: number; stories: number };
  components: LibraryComponent[];
}

/** Snapshot storyTitle format is "Component Title / Story Name"; the component
 *  part may itself contain "/" section nesting ("Theme/AppBar"). A title with
 *  no " / " separator is treated as a bare component title. */
export function componentTitleOf(storyTitle: string): string {
  const idx = storyTitle.lastIndexOf(" / ");
  return idx === -1 ? storyTitle : storyTitle.slice(0, idx);
}

export function storyNameOf(storyTitle: string): string {
  const idx = storyTitle.lastIndexOf(" / ");
  return idx === -1 ? storyTitle : storyTitle.slice(idx + 3);
}

export function buildLibraryTree(entries: readonly LibraryEntry[]): LibraryTree {
  const components = new Map<string, Map<string, LibraryStory>>();
  for (const entry of entries) {
    const title = componentTitleOf(entry.storyTitle);
    let stories = components.get(title);
    if (!stories) {
      stories = new Map();
      components.set(title, stories);
    }
    let story = stories.get(entry.storyId);
    if (!story) {
      story = { storyId: entry.storyId, name: storyNameOf(entry.storyTitle), viewports: [] };
      stories.set(entry.storyId, story);
    }
    story.viewports.push({
      viewport: entry.viewport,
      imageKey: entry.imageKey,
      snapshotId: entry.snapshotId,
      buildId: entry.buildId,
      buildNumber: entry.buildNumber,
      updatedAt: entry.updatedAt.toISOString(),
    });
  }

  const list: LibraryComponent[] = [...components.entries()]
    .map(([title, stories]) => ({
      title,
      path: title.split("/").map((s) => s.trim()),
      storyCount: stories.size,
      stories: [...stories.values()]
        .map((s) => ({ ...s, viewports: s.viewports.sort((a, b) => a.viewport.localeCompare(b.viewport)) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    totals: {
      components: list.length,
      stories: list.reduce((sum, c) => sum + c.storyCount, 0),
    },
    components: list,
  };
}
