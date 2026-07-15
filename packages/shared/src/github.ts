import { App } from "octokit";
import { config } from "./config.js";

export const CHECK_NAME = "DiffChroma / visual regression";

let cachedApp: App | null | undefined;

function getApp(): App | null {
  if (cachedApp !== undefined) return cachedApp;
  if (config.GITHUB_APP_ID && config.GITHUB_APP_PRIVATE_KEY) {
    cachedApp = new App({
      appId: config.GITHUB_APP_ID,
      // Private keys pasted into .env files usually have literal \n sequences.
      privateKey: config.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ...(config.GITHUB_WEBHOOK_SECRET ? { webhooks: { secret: config.GITHUB_WEBHOOK_SECRET } } : {}),
    });
  } else {
    cachedApp = null;
  }
  return cachedApp;
}

export function githubEnabled(): boolean {
  return getApp() !== null;
}

export interface CheckTarget {
  repoFullName: string;
  installationId: number;
}

function split(repoFullName: string): { owner: string; repo: string } {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repoFullName: ${repoFullName}`);
  return { owner, repo };
}

export async function createCheckRun(
  target: CheckTarget,
  headSha: string,
  detailsUrl: string,
): Promise<number | null> {
  const app = getApp();
  if (!app) return null;
  const octokit = await app.getInstallationOctokit(target.installationId);
  const { owner, repo } = split(target.repoFullName);
  const res = await octokit.rest.checks.create({
    owner,
    repo,
    name: CHECK_NAME,
    head_sha: headSha,
    status: "queued",
    details_url: detailsUrl,
  });
  return res.data.id;
}

export interface CheckUpdate {
  status?: "queued" | "in_progress" | "completed";
  conclusion?: "success" | "failure" | "action_required" | "neutral" | "cancelled";
  title?: string;
  summary?: string;
  detailsUrl?: string;
}

export async function updateCheckRun(
  target: CheckTarget,
  checkRunId: number,
  update: CheckUpdate,
): Promise<void> {
  const app = getApp();
  if (!app) return;
  const octokit = await app.getInstallationOctokit(target.installationId);
  const { owner, repo } = split(target.repoFullName);
  await octokit.rest.checks.update({
    owner,
    repo,
    check_run_id: checkRunId,
    ...(update.status ? { status: update.status } : {}),
    ...(update.conclusion ? { conclusion: update.conclusion, status: "completed" as const } : {}),
    ...(update.detailsUrl ? { details_url: update.detailsUrl } : {}),
    ...(update.title || update.summary
      ? { output: { title: update.title ?? CHECK_NAME, summary: update.summary ?? "" } }
      : {}),
  });
}
