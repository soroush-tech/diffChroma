FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY services/mcp ./services/mcp

RUN pnpm install --frozen-lockfile --filter "@diffchroma/mcp..."
RUN pnpm --filter @diffchroma/db db:generate

EXPOSE 4100
CMD ["pnpm", "--filter", "@diffchroma/mcp", "start"]
