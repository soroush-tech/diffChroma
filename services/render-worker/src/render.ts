import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import extractZip from "extract-zip";
import { chromium, type Browser } from "playwright";
import { prisma } from "@diffchroma/db";
import { auditPage, loadAxeSource, persistAudit, type AxeViolation } from "./a11y.js";
import {
  QUEUES,
  config,
  getObjectBuffer,
  parseViewports,
  putObject,
  s3Keys,
  updateCheckRun,
  viewportKey,
  type QueueConnection,
} from "@diffchroma/shared";

interface StoryEntry {
  id: string;
  title: string;
  name: string;
  type?: string;
}

/** Parse Storybook's index.json (v4 `stories` or v5 `entries`). */
function parseStoryIndex(raw: string): StoryEntry[] {
  const data = JSON.parse(raw) as {
    entries?: Record<string, StoryEntry>;
    stories?: Record<string, StoryEntry>;
  };
  const entries = data.entries ?? data.stories;
  if (!entries) throw new Error("index.json has neither `entries` nor `stories`");
  return Object.values(entries).filter((e) => (e.type ?? "story") === "story");
}

/** Locate index.json: at the extraction root or exactly one directory deep. */
async function findStorybookRoot(dir: string): Promise<string> {
  if (existsSync(path.join(dir, "index.json"))) return dir;
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(path.join(dir, entry.name, "index.json"))) {
      return path.join(dir, entry.name);
    }
  }
  throw new Error("index.json not found in uploaded archive — is this a storybook-static build?");
}

const FREEZE_CSS = `
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  caret-color: transparent !important;
}
`;

interface StoryShot {
  png: Buffer;
  violations?: AxeViolation[];
  axeError?: string;
}

async function screenshotStory(
  browser: Browser,
  baseUrl: string,
  story: StoryEntry,
  viewport: { width: number; height: number },
  axeSource: string | null,
): Promise<StoryShot> {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce", deviceScaleFactor: 1 });
  try {
    await page.goto(`${baseUrl}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`, {
      waitUntil: "load",
      timeout: 30_000,
    });
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.waitForFunction(
      () => {
        const root = document.querySelector("#storybook-root, #root");
        return root !== null && (root.childNodes.length > 0 || root.textContent!.length > 0);
      },
      { timeout: 15_000 },
    );
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForTimeout(150); // settle layout after fonts
    const png = await page.screenshot({ animations: "disabled", caret: "hide", fullPage: false });
    if (axeSource === null) return { png };
    try {
      return { png, violations: await auditPage(page, axeSource) };
    } catch (err) {
      // An axe failure downgrades to an errored audit row; the build goes on.
      return { png, axeError: err instanceof Error ? err.message : String(err) };
    }
  } finally {
    await page.close();
  }
}

export async function renderBuild(buildId: string, queue: QueueConnection): Promise<void> {
  const build = await prisma.build.findUniqueOrThrow({
    where: { id: buildId },
    include: { project: true },
  });
  const { project } = build;
  if (build.status !== "QUEUED") {
    console.warn(`[render] build ${buildId} is ${build.status}, skipping`);
    return;
  }
  if (!build.storybookZipKey) throw new Error("build has no uploaded archive");

  await prisma.build.update({ where: { id: buildId }, data: { status: "RENDERING" } });
  if (build.checkRunId && project.installationId && project.repoFullName) {
    await updateCheckRun(
      { repoFullName: project.repoFullName, installationId: project.installationId },
      build.checkRunId,
      { status: "in_progress", title: "Rendering stories…", summary: "Capturing story screenshots." },
    ).catch((err) => console.error("[render] check update failed:", err));
  }

  const workDir = path.join(os.tmpdir(), "diffchroma", buildId);
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  let browser: Browser | undefined;
  let closeServer: (() => Promise<void>) | undefined;
  try {
    const zipPath = path.join(workDir, "storybook.zip");
    await writeFile(zipPath, await getObjectBuffer(build.storybookZipKey));
    const extractDir = path.join(workDir, "static");
    await extractZip(zipPath, { dir: extractDir });

    const root = await findStorybookRoot(extractDir);
    const stories = parseStoryIndex(await readFile(path.join(root, "index.json"), "utf8"));
    if (stories.length === 0) throw new Error("no stories found in index.json");

    const { serveDir } = await import("./static-server.js");
    const server = await serveDir(root);
    closeServer = server.close;

    // channel "chromium" = full browser in new-headless mode; avoids the
    // separate headless-shell download and matches the pinned Docker image.
    browser = await chromium.launch({ channel: "chromium" });
    const viewports = parseViewports();
    // Audit accessibility once per story (it is viewport-independent), riding
    // the first viewport's page visit so no extra navigation is needed.
    const axeSource = project.a11yEnabled ? loadAxeSource() : null;
    const jobs = stories.flatMap((story) =>
      viewports.map((viewport, vi) => ({ story, viewport, runAxe: vi === 0 })),
    );

    let cursor = 0;
    const workers = Array.from({ length: Math.max(1, config.RENDER_CONCURRENCY) }, async () => {
      while (true) {
        const index = cursor++;
        const job = jobs[index];
        if (!job) return;
        const shot = await screenshotStory(
          browser!,
          server.baseUrl,
          job.story,
          job.viewport,
          job.runAxe ? axeSource : null,
        );
        const vp = viewportKey(job.viewport);
        const key = s3Keys.shot(project.customerId, project.id, build.number, job.story.id, vp);
        await putObject(key, shot.png, "image/png");
        await prisma.snapshot.create({
          data: {
            buildId,
            storyId: job.story.id,
            storyTitle: `${job.story.title} / ${job.story.name}`,
            viewport: vp,
            imageKey: key,
            status: "PENDING",
          },
        });
        if (job.runAxe && axeSource !== null) {
          await persistAudit({
            buildId,
            projectId: project.id,
            branch: build.branch,
            buildNumber: build.number,
            story: job.story,
            viewport: vp,
            violations: shot.violations ?? [],
            error: shot.axeError,
          }).catch((err) => console.error("[render] a11y persist failed:", err));
        }
        console.log(`[render] ${build.id} ${job.story.id} @ ${vp}`);
      }
    });
    await Promise.all(workers);

    await prisma.build.update({
      where: { id: buildId },
      data: { status: "COMPARING", storyCount: jobs.length },
    });
    queue.publish(QUEUES.compare, { buildId });
    console.log(`[render] build ${buildId}: ${jobs.length} snapshots rendered`);
  } finally {
    await browser?.close().catch(() => undefined);
    await closeServer?.().catch(() => undefined);
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Mark a build failed and surface it on the GitHub check, if any. */
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
      { conclusion: "failure", title: "Build errored", summary: message },
    ).catch(() => undefined);
  }
}
