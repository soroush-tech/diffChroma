FROM node:22-bookworm-slim

RUN corepack enable

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard

RUN pnpm install --frozen-lockfile --filter "@diffchroma/dashboard..."

# NEXT_PUBLIC_* vars are inlined at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GITHUB_APP_URL=
ENV NEXT_PUBLIC_GITHUB_APP_URL=$NEXT_PUBLIC_GITHUB_APP_URL
RUN pnpm --filter @diffchroma/dashboard build

EXPOSE 3000
CMD ["pnpm", "--filter", "@diffchroma/dashboard", "start"]
