import { prisma, type Build, type Project } from "@diffchroma/db";
import { updateCheckRun } from "@diffchroma/shared";

/**
 * Called after any snapshot approval/rejection. When no NEW/CHANGED snapshots
 * remain, the build reaches a terminal state: REJECTED if anything was
 * rejected, otherwise APPROVED — and approved snapshots become the new
 * baselines for their (story, viewport).
 */
export async function resolveBuildIfComplete(buildId: string): Promise<Build> {
  const build = await prisma.build.findUniqueOrThrow({
    where: { id: buildId },
    include: { project: true, snapshots: true },
  });
  if (build.status !== "PENDING_REVIEW") return build;

  const open = build.snapshots.filter((s) => s.status === "NEW" || s.status === "CHANGED");
  if (open.length > 0) return build;

  const rejected = build.snapshots.some((s) => s.status === "REJECTED");

  if (!rejected) {
    const approved = build.snapshots.filter((s) => s.status === "APPROVED");
    for (const snap of approved) {
      await prisma.baseline.upsert({
        where: {
          projectId_storyId_viewport: {
            projectId: build.projectId,
            storyId: snap.storyId,
            viewport: snap.viewport,
          },
        },
        update: { snapshotId: snap.id },
        create: {
          projectId: build.projectId,
          storyId: snap.storyId,
          viewport: snap.viewport,
          snapshotId: snap.id,
        },
      });
    }
  }

  const updated = await prisma.build.update({
    where: { id: buildId },
    data: { status: rejected ? "REJECTED" : "APPROVED", completedAt: new Date() },
  });

  await reportCheck(build.project, updated);
  return updated;
}

async function reportCheck(project: Project, build: Build): Promise<void> {
  if (!build.checkRunId || !project.installationId || !project.repoFullName) return;
  try {
    await updateCheckRun(
      { repoFullName: project.repoFullName, installationId: project.installationId },
      build.checkRunId,
      build.status === "APPROVED"
        ? { conclusion: "success", title: "Visual changes approved", summary: "All visual changes were reviewed and approved." }
        : { conclusion: "failure", title: "Visual changes rejected", summary: "One or more visual changes were rejected in review." },
    );
  } catch (err) {
    console.error("[api] failed to update check run:", err);
  }
}
