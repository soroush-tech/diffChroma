import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { prisma, type Build, type Project } from "@diffchroma/db";
import {
  config,
  getObjectBuffer,
  putObject,
  s3Keys,
  updateCheckRun,
} from "@diffchroma/shared";

interface DiffResult {
  status: "UNCHANGED" | "CHANGED";
  ratio: number;
  diffPng: Buffer | null;
}

function diffImages(current: Buffer, baseline: Buffer, maxDiffPixelRatio: number): DiffResult {
  const a = PNG.sync.read(current);
  const b = PNG.sync.read(baseline);
  if (a.width !== b.width || a.height !== b.height) {
    return { status: "CHANGED", ratio: 1, diffPng: null };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0.1,
    includeAA: false,
  });
  const ratio = mismatched / (a.width * a.height);
  if (ratio <= maxDiffPixelRatio) return { status: "UNCHANGED", ratio, diffPng: null };
  return { status: "CHANGED", ratio, diffPng: PNG.sync.write(diff) };
}

export async function compareBuild(buildId: string): Promise<void> {
  const build = await prisma.build.findUniqueOrThrow({
    where: { id: buildId },
    include: { project: true, snapshots: true },
  });
  const { project } = build;
  if (build.status !== "COMPARING") {
    console.warn(`[compare] build ${buildId} is ${build.status}, skipping`);
    return;
  }

  const hadBaselines =
    (await prisma.baseline.count({ where: { projectId: project.id } })) > 0;

  let changed = 0;
  let added = 0;
  for (const snap of build.snapshots) {
    const baseline = await prisma.baseline.findUnique({
      where: {
        projectId_storyId_viewport: {
          projectId: project.id,
          storyId: snap.storyId,
          viewport: snap.viewport,
        },
      },
      include: { snapshot: true },
    });

    if (!baseline) {
      added++;
      await prisma.snapshot.update({ where: { id: snap.id }, data: { status: "NEW" } });
      continue;
    }

    const [current, base] = await Promise.all([
      getObjectBuffer(snap.imageKey),
      getObjectBuffer(baseline.snapshot.imageKey),
    ]);
    const result = diffImages(current, base, project.maxDiffPixelRatio);

    let diffKey: string | null = null;
    if (result.diffPng) {
      diffKey = s3Keys.diff(project.customerId, project.id, build.number, snap.storyId, snap.viewport);
      await putObject(diffKey, result.diffPng, "image/png");
    }
    if (result.status === "CHANGED") changed++;

    await prisma.snapshot.update({
      where: { id: snap.id },
      data: {
        status: result.status,
        diffPixelRatio: result.ratio,
        diffKey,
        baselineSnapshotId: baseline.snapshotId,
      },
    });
    console.log(`[compare] ${snap.storyId} @ ${snap.viewport}: ${result.status} (${result.ratio.toFixed(4)})`);
  }

  const dashboardUrl = `${config.DASHBOARD_URL}/builds/${build.id}`;

  if (changed === 0 && added === 0) {
    await finish(build, project, "PASSED", { changed, added });
    return;
  }

  // First-ever build: auto-accept everything as the initial baseline.
  if (!hadBaselines && changed === 0 && project.autoAcceptFirstBuild) {
    for (const snap of build.snapshots) {
      await prisma.snapshot.update({ where: { id: snap.id }, data: { status: "APPROVED" } });
      await prisma.baseline.upsert({
        where: {
          projectId_storyId_viewport: {
            projectId: project.id,
            storyId: snap.storyId,
            viewport: snap.viewport,
          },
        },
        update: { snapshotId: snap.id },
        create: {
          projectId: project.id,
          storyId: snap.storyId,
          viewport: snap.viewport,
          snapshotId: snap.id,
        },
      });
    }
    await finish(build, project, "PASSED", { changed: 0, added }, "First build auto-accepted as baseline");
    return;
  }

  await prisma.build.update({
    where: { id: build.id },
    data: { status: "PENDING_REVIEW", changedCount: changed, newCount: added },
  });
  if (build.checkRunId && project.installationId && project.repoFullName) {
    await updateCheckRun(
      { repoFullName: project.repoFullName, installationId: project.installationId },
      build.checkRunId,
      {
        conclusion: "action_required",
        title: `${changed} changed, ${added} new — review required`,
        summary: `Visual changes need review: **${changed} changed**, **${added} new** of ${build.snapshots.length} snapshots.\n\n[Review in DiffChroma](${dashboardUrl})`,
        detailsUrl: dashboardUrl,
      },
    ).catch((err) => console.error("[compare] check update failed:", err));
  }
  console.log(`[compare] build ${buildId}: PENDING_REVIEW (${changed} changed, ${added} new)`);
}

async function finish(
  build: Build & { snapshots: unknown[] },
  project: Project,
  status: "PASSED",
  counts: { changed: number; added: number },
  note?: string,
): Promise<void> {
  await prisma.build.update({
    where: { id: build.id },
    data: {
      status,
      changedCount: counts.changed,
      newCount: counts.added,
      completedAt: new Date(),
    },
  });
  if (build.checkRunId && project.installationId && project.repoFullName) {
    await updateCheckRun(
      { repoFullName: project.repoFullName, installationId: project.installationId },
      build.checkRunId,
      {
        conclusion: "success",
        title: note ?? "No visual changes",
        summary: note ?? `All ${build.snapshots.length} snapshots match the baseline.`,
        detailsUrl: `${config.DASHBOARD_URL}/builds/${build.id}`,
      },
    ).catch((err) => console.error("[compare] check update failed:", err));
  }
  console.log(`[compare] build ${build.id}: ${status}${note ? ` (${note})` : ""}`);
}

export async function failBuild(buildId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const build = await prisma.build
    .update({
      where: { id: buildId },
      data: { status: "ERROR", error: message, completedAt: new Date() },
      include: { project: true },
    })
    .catch(() => null);
  if (build?.checkRunId && build.project.installationId && build.project.repoFullName) {
    await updateCheckRun(
      { repoFullName: build.project.repoFullName, installationId: build.project.installationId },
      build.checkRunId,
      { conclusion: "failure", title: "Compare errored", summary: message },
    ).catch(() => undefined);
  }
}
