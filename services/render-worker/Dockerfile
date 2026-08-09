# Pinned Playwright image => identical browser + fonts everywhere = deterministic screenshots.
FROM mcr.microsoft.com/playwright:v1.54.0-noble

RUN corepack enable

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY services/render-worker ./services/render-worker

RUN pnpm install --frozen-lockfile --filter "@diffchroma/render-worker..."
RUN pnpm --filter @diffchroma/db db:generate

CMD ["pnpm", "--filter", "@diffchroma/render-worker", "start"]
