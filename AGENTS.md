# CareSync — Agent Notes

## Dev Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @caresync/api db:migrate
pnpm --filter @caresync/api db:seed
pnpm dev
```

Database must be running (`docker compose up -d` or the postgres service).

## Package Commands

| Package               | Key commands                                                        |
| --------------------- | ------------------------------------------------------------------- |
| Root                  | `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm test:e2e` |
| API (`@caresync/api`) | `db:migrate`, `db:seed`, `db:push`, `db:studio`                     |
| Web (`@caresync/web`) | lint is configured here; api has none                               |
| E2E (`@caresync/e2e`) | `test`, `test:ui`                                                   |

E2E tests need the full stack running with seeded database:

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
pnpm --filter @caresync/api db:migrate
pnpm --filter @caresync/api db:seed
ADMIN_EMAIL=admin@caresync.dev ADMIN_PASSWORD=Password123! pnpm test:e2e
```

## Turborepo Task Graph

- `build` depends on `^build` (runs upstream builds first)
- `lint` depends on `^build` — run `pnpm build` before `pnpm lint` locally
- `test` depends on `^build` — unit tests only; e2e is excluded via `--filter=!@caresync/e2e`
- CI runs: lint → test → build (sequential, build needs both lint and test to pass)

## Lint-Staged

Pre-commit hook (Husky) only lints web (`apps/web/src/**`) with ESLint + max-warnings=0.
All other files are only prettier-formatted.

## Shared Package

`packages/shared` exports Zod schemas and types consumed by both API and web.
Its `package.json` has no build script for consumers — workspace resolution handles it.

## Ports

| Service           | URL                            |
| ----------------- | ------------------------------ |
| Web (dev)         | http://localhost:5173          |
| API               | http://localhost:3000          |
| API docs (Scalar) | http://localhost:3000/api/docs |

## Key Files

- `apps/api/src/index.ts` — API entrypoint
- `apps/api/src/db/schema.ts` — Drizzle schema
- `apps/api/src/db/seed.ts` — Seed data
- `docker-compose.yml` — PostgreSQL + API + Web containers
- `turbo.json` — Task pipeline config
- `packages/shared/src/` — Shared schemas and types
