import type { LibraryResponse, LibraryComponent } from "./libraryTypes";

export type { LibraryResponse, LibraryComponent };

/** Up to `n` thumbnail URLs for a component: first viewport of each story. */
export function thumbsOf(component: LibraryComponent, n = 4): string[] {
  return component.stories
    .map((story) => story.viewports[0]?.imageUrl)
    .filter((url): url is string => !!url)
    .slice(0, n);
}

export interface ComponentTileData {
  kind: "component";
  component: LibraryComponent;
  /** Name shown on the tile (last path segment). */
  name: string;
}

export interface FolderTileData {
  kind: "folder";
  name: string;
  /** Prefix segments to drill into (including this folder). */
  prefix: string[];
  componentCount: number;
  thumbs: string[];
}

export interface LibrarySection {
  name: string;
  tiles: (ComponentTileData | FolderTileData)[];
}

const FALLBACK_SECTION = "Components";

/** Group components into capture-style sections. Top level: section = first
 *  path segment (single-segment components pool under "Components"); deeper
 *  nesting becomes folder tiles. With a groupPrefix, only that folder's
 *  subtree shows, as one section. */
export function sectionize(
  components: readonly LibraryComponent[],
  groupPrefix: string[] | null,
): LibrarySection[] {
  const sections = new Map<string, Map<string, ComponentTileData | FolderTileData>>();

  for (const component of components) {
    let sectionName: string;
    let remainder: string[];
    if (groupPrefix && groupPrefix.length > 0) {
      if (
        component.path.length <= groupPrefix.length ||
        groupPrefix.some((seg, i) => component.path[i] !== seg)
      ) {
        continue;
      }
      sectionName = groupPrefix.join(" / ");
      remainder = component.path.slice(groupPrefix.length);
    } else if (component.path.length >= 2) {
      sectionName = component.path[0]!;
      remainder = component.path.slice(1);
    } else {
      sectionName = FALLBACK_SECTION;
      remainder = component.path;
    }

    let tiles = sections.get(sectionName);
    if (!tiles) {
      tiles = new Map();
      sections.set(sectionName, tiles);
    }

    if (remainder.length <= 1) {
      const name = remainder[0] ?? component.title;
      tiles.set(`c:${component.title}`, { kind: "component", component, name });
    } else {
      const folderName = remainder[0]!;
      const prefixLength = component.path.length - remainder.length;
      const prefix = [...component.path.slice(0, prefixLength), folderName];
      const key = `f:${folderName}`;
      const existing = tiles.get(key);
      if (existing && existing.kind === "folder") {
        existing.componentCount += 1;
        if (existing.thumbs.length < 4) existing.thumbs.push(...thumbsOf(component, 1));
      } else {
        tiles.set(key, {
          kind: "folder",
          name: folderName,
          prefix,
          componentCount: 1,
          thumbs: thumbsOf(component, 1),
        });
      }
    }
  }

  return [...sections.entries()]
    .map(([name, tiles]) => ({
      name,
      tiles: [...tiles.values()].sort((a, b) => {
        const an = a.kind === "component" ? a.name : a.name;
        const bn = b.kind === "component" ? b.name : b.name;
        return an.localeCompare(bn);
      }),
    }))
    .sort((a, b) =>
      a.name === FALLBACK_SECTION ? 1 : b.name === FALLBACK_SECTION ? -1 : a.name.localeCompare(b.name),
    );
}

export function filterComponents(
  components: readonly LibraryComponent[],
  search: string,
): LibraryComponent[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return [...components];
  return components.filter((c) => c.title.toLowerCase().includes(needle));
}
