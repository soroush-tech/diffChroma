import { createWriteStream } from "node:fs";
import { readFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as core from "@actions/core";
import archiver from "archiver";

async function zipDirectory(dir: string): Promise<Buffer> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "diffchroma-"));
  const zipPath = path.join(tmp, "storybook.zip");
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 6 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(dir, false);
    void archive.finalize();
  });
  return readFile(zipPath);
}

function prNumberFromEnv(): number | undefined {
  // refs/pull/123/merge
  const match = /^refs\/pull\/(\d+)\//.exec(process.env.GITHUB_REF ?? "");
  return match ? Number(match[1]) : undefined;
}

async function apiFetch<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${url} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

const TERMINAL = ["PASSED", "APPROVED", "REJECTED", "ERROR"];

async function main(): Promise<void> {
  const apiUrl = core.getInput("api-url", { required: true }).replace(/\/$/, "");
  const token = core.getInput("project-token", { required: true });
  const storybookDir = core.getInput("storybook-dir") || "storybook-static";
  const wait = core.getBooleanInput("wait");

  const commitSha =
    process.env.GITHUB_EVENT_NAME === "pull_request"
      ? // For PRs, GITHUB_SHA is the merge commit; checks should land on the head SHA.
        (process.env.GITHUB_HEAD_SHA ?? process.env.GITHUB_SHA ?? "unknown")
      : (process.env.GITHUB_SHA ?? "unknown");
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "unknown";

  core.info(`Zipping ${storybookDir}…`);
  const zip = await zipDirectory(storybookDir);
  core.info(`Archive size: ${(zip.length / 1024 / 1024).toFixed(1)} MiB`);

  const created = await apiFetch<{
    buildId: string;
    number: number;
    uploadUrl: string;
    dashboardUrl: string;
  }>(`${apiUrl}/v1/builds`, token, {
    method: "POST",
    body: JSON.stringify({ commitSha, branch, prNumber: prNumberFromEnv() }),
  });

  core.info(`Uploading build #${created.number}…`);
  const put = await fetch(created.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "application/zip" },
    body: new Uint8Array(zip),
  });
  if (!put.ok) throw new Error(`upload failed: ${put.status} ${await put.text()}`);

  await apiFetch(`${apiUrl}/v1/builds/${created.buildId}/uploaded`, token, {
    method: "POST",
    body: JSON.stringify({}),
  });

  core.setOutput("build-id", created.buildId);
  core.setOutput("build-number", String(created.number));
  core.setOutput("dashboard-url", created.dashboardUrl);
  core.info(`Build queued: ${created.dashboardUrl}`);

  if (!wait) return;

  core.info("Waiting for the render/compare pipeline…");
  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    const build = await apiFetch<{ status: string; error?: string }>(
      `${apiUrl}/v1/builds/${created.buildId}`,
      token,
    );
    core.info(`status: ${build.status}`);
    if (build.status === "PENDING_REVIEW") {
      core.setOutput("status", build.status);
      core.notice(`Visual changes need review: ${created.dashboardUrl}`);
      return; // non-blocking: the GitHub check carries the review state
    }
    if (TERMINAL.includes(build.status)) {
      core.setOutput("status", build.status);
      if (build.status === "REJECTED" || build.status === "ERROR") {
        throw new Error(`build ${build.status}${build.error ? `: ${build.error}` : ""}`);
      }
      return;
    }
  }
}

main().catch((err) => core.setFailed(err instanceof Error ? err.message : String(err)));
