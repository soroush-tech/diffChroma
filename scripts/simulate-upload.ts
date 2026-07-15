/**
 * Acts like the GitHub Action: zips a storybook-static directory, uploads it
 * to the local DiffChroma API with the seeded project token, and follows the
 * build through the pipeline.
 *
 * Usage: pnpm simulate [path-to-storybook-static] [branch]
 */
import { createWriteStream, existsSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import archiver from "archiver";
import { prisma } from "@diffchroma/db";
import { config } from "@diffchroma/shared";

const dir = path.resolve(process.argv[2] ?? "../fixtures/storybook-static");
const branch = process.argv[3] ?? "main";

if (!existsSync(dir)) {
  console.error(`error: directory not found: ${dir}`);
  process.exit(1);
}
if (!existsSync(path.join(dir, "index.json"))) {
  console.error(
    `error: no index.json in ${dir} — is this a storybook-static build? (run \`storybook build\` first)`,
  );
  process.exit(1);
}
const apiUrl = config.API_PUBLIC_URL;

async function zipDirectory(source: string): Promise<Buffer> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "diffchroma-sim-"));
  const zipPath = path.join(tmp, "storybook.zip");
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 6 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(source, false);
    void archive.finalize();
  });
  return readFile(zipPath);
}

async function main() {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) throw new Error("no project found — run `pnpm db:seed` first");
  const token = project.projectToken;
  console.log(`project: ${project.name}, storybook: ${dir}`);

  const zip = await zipDirectory(dir);
  console.log(`zip: ${(zip.length / 1024).toFixed(1)} KiB`);

  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const createRes = await fetch(`${apiUrl}/v1/builds`, {
    method: "POST",
    headers,
    body: JSON.stringify({ commitSha: randomBytes(20).toString("hex"), branch }),
  });
  if (!createRes.ok) throw new Error(`create failed: ${createRes.status} ${await createRes.text()}`);
  const created = (await createRes.json()) as {
    buildId: string;
    number: number;
    uploadUrl: string;
    dashboardUrl: string;
  };
  console.log(`build #${created.number} (${created.buildId})`);

  const put = await fetch(created.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "application/zip" },
    body: new Uint8Array(zip),
  });
  if (!put.ok) throw new Error(`upload failed: ${put.status} ${await put.text()}`);

  const done = await fetch(`${apiUrl}/v1/builds/${created.buildId}/uploaded`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  if (!done.ok) throw new Error(`uploaded failed: ${done.status} ${await done.text()}`);

  const terminal = ["PASSED", "APPROVED", "REJECTED", "ERROR", "PENDING_REVIEW"];
  for (;;) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${apiUrl}/v1/builds/${created.buildId}`, { headers });
    const build = (await res.json()) as {
      status: string;
      storyCount: number;
      changedCount: number;
      newCount: number;
      error?: string;
    };
    console.log(
      `status: ${build.status} (${build.changedCount} changed / ${build.newCount} new / ${build.storyCount} total)`,
    );
    if (terminal.includes(build.status)) {
      if (build.error) console.error(`error: ${build.error}`);
      console.log(`review: ${created.dashboardUrl}`);
      break;
    }
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
