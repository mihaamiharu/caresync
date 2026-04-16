FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.6.4 --activate

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm --filter web build

# ── Serve with nginx ──────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
