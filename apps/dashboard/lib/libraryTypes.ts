export interface LibraryViewport {
  viewport: string;
  imageUrl: string;
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

export interface LibraryResponse {
  latest: { buildId: string; buildNumber: number; branch: string } | null;
  totals: { components: number; stories: number };
  components: LibraryComponent[];
}
