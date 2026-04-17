FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.6.4 --activate

WORKDIR /app

# Install dependencies (monorepo-aware: copy all package manifests first for layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Create upload directories
RUN mkdir -p apps/api/uploads/medical-records apps/api/uploads/avatars

EXPOSE 3001

WORKDIR /app/apps/api

# Run migrations then start the API via tsx (handles TS workspace imports natively)
CMD ["sh", "-c", "pnpm db:migrate && pnpm exec tsx src/index.ts"]
