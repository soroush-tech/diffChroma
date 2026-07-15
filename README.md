# DiffChroma

Self-hosted visual regression testing for Storybook — screenshot every story, diff against a
baseline, review and approve changes. A self-owned replacement for Chromatic
(see [soroush-tech/core#261](https://github.com/soroush-tech/core/issues/261)).

## How it works

```
GitHub Action ──zip storybook-static──▶ API ──▶ RabbitMQ ──▶ render-worker (Playwright, pinned image)
                                        │                        │  screenshots per story → S3
                                        │                        ▼
   GitHub Check Run ◀───────────────── compare-worker (pixelmatch vs baseline) ──▶ diff report
                                        ▲
                        Dashboard ──────┘  review / approve / reject / comment
```

- **API** (`services/api`) — Fastify + Prisma/Postgres. Ingest endpoints (project-token auth),
  dashboard endpoints (JWT auth), GitHub App webhook.
- **render-worker** (`services/render-worker`) — consumes the `render` queue, extracts the uploaded
  `storybook-static`, screenshots every story from `index.json` with Playwright. Runs in the pinned
  `mcr.microsoft.com/playwright` image so rendering is deterministic.
- **compare-worker** (`services/compare-worker`) — consumes the `compare` queue, diffs each snapshot
  against the project baseline with pixelmatch, stores diff images, updates the GitHub Check Run.
- **dashboard** (`apps/dashboard`) — Next.js review UI: baseline / current / diff, approve, reject,
  comment. Approving a build promotes its snapshots to the new baseline.
- **action** (`packages/action`) — GitHub Action that zips and uploads `storybook-static`.
- Storage is any S3-compatible service (MinIO locally, AWS S3 or Cloudflare R2 in production).
  Screenshots are stored per customer/project/build: `c/{customer}/p/{project}/b/{build}/…`.

Build lifecycle: `QUEUED → RENDERING → COMPARING → PASSED | PENDING_REVIEW → APPROVED | REJECTED`.
The first build of a project is auto-accepted as the initial baseline.

## Quickstart (local dev)

```sh
cp .env.example .env
pnpm install
pnpm dev:infra          # rabbitmq + postgres + minio via docker compose
pnpm db:migrate         # create schema (first run: name the migration "init")
pnpm db:seed            # admin user + demo project (prints the project token)

# in separate terminals:
pnpm dev:api
pnpm dev:render         # needs: pnpm --filter @diffchroma/render-worker exec playwright install chromium
pnpm dev:compare
pnpm dev:dashboard      # http://localhost:3000 — login: admin@example.com / admin123

# push a build through the pipeline:
pnpm simulate           # uploads fixtures/storybook-static as a build
```

First `pnpm simulate` auto-baselines every story (build `PASSED`). Change something in
`fixtures/storybook-static/iframe.html`, run `pnpm simulate` again, and the build lands in
`PENDING_REVIEW` with diffs to approve in the dashboard.

Full containerized run instead: `docker compose --profile app up --build`.

> Local rendering happens on your host browser; production rendering happens in the pinned
> Playwright image. Baselines are environment-specific — don't mix host-rendered and
> container-rendered baselines in one project.

## GitHub integration

1. Create a GitHub App (Settings → Developer settings → GitHub Apps):
   - Permissions: **Checks: read & write**, **Metadata: read**.
   - Subscribe to events: **Installation**, **Installation repositories**.
   - Webhook URL: `https://<your-api>/webhooks/github`, with a webhook secret.
2. Set `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_WEBHOOK_SECRET` in the API/worker env.
3. Install the app on the customer repo; the webhook stores the installation id on the matching
   project (`repoFullName` must be set on the project in the dashboard).
4. Add the action to the repo's workflow:

```yaml
- run: pnpm build:storybook
- uses: soroush-tech/diffChroma/packages/action@main
  with:
    api-url: https://diffchroma.example.com
    project-token: ${{ secrets.DIFFCHROMA_PROJECT_TOKEN }}
    storybook-dir: storybook-static
    # wait: "true"   # fail the step on rejected/errored builds
```

Every build posts a **DiffChroma / visual regression** check on the commit: success when nothing
changed, `action_required` with a dashboard link when changes need review, and it flips to
success/failure when a reviewer approves/rejects in the dashboard.

The action's `dist/` must be built (`pnpm --filter @diffchroma/action build`) and committed for
`uses:` to work.

## Production notes

- Point `S3_*` at AWS S3 or Cloudflare R2 (set `S3_FORCE_PATH_STYLE=false` for AWS).
- Run one or more `render-worker` replicas — always the same pinned Playwright image version;
  bumping the image version invalidates baselines (re-baseline after upgrading).
- `VIEWPORTS=1280x720,375x667` renders every story at multiple viewports.
- Per-project diff tolerance: `Project.maxDiffPixelRatio` (default 0 = any pixel change flags).
