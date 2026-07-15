import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Load the repo-root .env regardless of which workspace package the process
// was started from (pnpm --filter sets cwd to the package directory).
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

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://diffchroma:diffchroma@localhost:5432/diffchroma"),
  AMQP_URL: z.string().default("amqp://diffchroma:diffchroma@localhost:5672"),

  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_PUBLIC_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("diffchroma"),
  S3_ACCESS_KEY: z.string().default("diffchroma"),
  S3_SECRET_KEY: z.string().default("diffchroma123"),
  S3_FORCE_PATH_STYLE: z.string().default("true"),

  API_PORT: z.coerce.number().default(4000),
  API_PUBLIC_URL: z.string().default("http://localhost:4000"),
  DASHBOARD_URL: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().default("dev-secret-change-me"),

  SEED_ADMIN_EMAIL: z.string().default("admin@example.com"),
  SEED_ADMIN_PASSWORD: z.string().default("admin123"),
  SEED_CUSTOMER_NAME: z.string().default("Acme"),
  SEED_PROJECT_NAME: z.string().default("web"),

  RENDER_CONCURRENCY: z.coerce.number().default(4),
  VIEWPORTS: z.string().default("1280x720"),

  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export const config: AppConfig = envSchema.parse(process.env);

export interface Viewport {
  width: number;
  height: number;
}

export function parseViewports(spec: string = config.VIEWPORTS): Viewport[] {
  return spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [w, h] = s.split("x");
      const width = Number(w);
      const height = Number(h);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        throw new Error(`Invalid viewport spec: "${s}" (expected e.g. 1280x720)`);
      }
      return { width, height };
    });
}

export function viewportKey(v: Viewport): string {
  return `${v.width}x${v.height}`;
}
