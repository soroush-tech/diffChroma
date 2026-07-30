FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY patches ./patches
COPY packages ./packages
COPY services/api ./services/api

RUN pnpm install --frozen-lockfile --filter "@diffchroma/api..."
RUN pnpm --filter @diffchroma/db db:generate

EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @diffchroma/db db:deploy && pnpm --filter @diffchroma/db db:seed && pnpm --filter @diffchroma/api start"]
