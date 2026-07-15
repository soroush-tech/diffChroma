import { z } from "zod";

/** Message published when a Storybook zip finished uploading and needs screenshots. */
export const renderJobSchema = z.object({ buildId: z.string() });
export type RenderJob = z.infer<typeof renderJobSchema>;

/** Message published when all snapshots of a build are rendered and need diffing. */
export const compareJobSchema = z.object({ buildId: z.string() });
export type CompareJob = z.infer<typeof compareJobSchema>;

export const BUILD_STATUSES = [
  "QUEUED",
  "RENDERING",
  "COMPARING",
  "PENDING_REVIEW",
  "PASSED",
  "APPROVED",
  "REJECTED",
  "ERROR",
] as const;
export type BuildStatus = (typeof BUILD_STATUSES)[number];

export const SNAPSHOT_STATUSES = ["PENDING", "NEW", "UNCHANGED", "CHANGED", "APPROVED", "REJECTED"] as const;
export type SnapshotStatus = (typeof SNAPSHOT_STATUSES)[number];

/** S3 key layout — everything for a build lives under its prefix. */
export const s3Keys = {
  buildPrefix: (customerId: string, projectId: string, buildNumber: number) =>
    `c/${customerId}/p/${projectId}/b/${buildNumber}`,
  upload: (customerId: string, projectId: string, buildNumber: number) =>
    `${s3Keys.buildPrefix(customerId, projectId, buildNumber)}/upload/storybook.zip`,
  shot: (customerId: string, projectId: string, buildNumber: number, storyId: string, viewport: string) =>
    `${s3Keys.buildPrefix(customerId, projectId, buildNumber)}/shots/${encodeURIComponent(storyId)}/${viewport}.png`,
  diff: (customerId: string, projectId: string, buildNumber: number, storyId: string, viewport: string) =>
    `${s3Keys.buildPrefix(customerId, projectId, buildNumber)}/diffs/${encodeURIComponent(storyId)}/${viewport}.png`,
};
