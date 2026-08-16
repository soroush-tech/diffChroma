/** Vitest setup: load the repo-root .env BEFORE any test module imports
 *  @prisma/client — the generated client snapshots env at module load, so a
 *  later dotenv call inside the import graph is too late. */
import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

let dir = process.cwd();
for (let i = 0; i < 6; i++) {
  const candidate = path.join(dir, ".env");
  if (existsSync(candidate)) {
    loadDotenv({ path: candidate });
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
