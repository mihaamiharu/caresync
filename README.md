# CareSync

A full-stack healthcare management platform built for QA automation practice. It covers the real workflows QA engineers encounter: authentication, role-based access, appointments, medical records, and file attachments.

## Tech Stack

| Layer  | Technology                                         |
| ------ | -------------------------------------------------- |
| API    | Hono + Drizzle ORM + PostgreSQL                    |
| Web    | React 19 + React Router 7 + Zustand + Tailwind CSS |
| Shared | Zod schemas + TypeScript types                     |
| E2E    | Playwright                                         |
| Unit   | Vitest + Testing Library + MSW                     |
| Infra  | Docker + Docker Compose                            |

## Quick Start (Docker)

The fastest way to run the full stack locally:

```bash
docker compose up --build
```

| Service  | URL                        |
| -------- | -------------------------- |
| Web app  | http://localhost           |
| API      | http://localhost:3001      |
| API docs | http://localhost:3001/docs |

## Local Development

**Prerequisites:** Node.js 22+, pnpm 10+, PostgreSQL 16+

```bash
# Install dependencies
pnpm install

# Copy and configure API env
cp apps/api/.env.example apps/api/.env

# Run migrations and seed demo data
pnpm --filter api db:migrate
pnpm --filter api db:seed

# Start everything in parallel
pnpm dev
```

The web app runs on http://localhost:5173 and the API on http://localhost:3001.

## Demo Accounts

Seeded automatically by `pnpm db:seed`:

| Role    | Email                 | Password     |
| ------- | --------------------- | ------------ |
| Admin   | admin@caresync.dev    | Password123! |
| Doctor  | dr.smith@caresync.dev | Password123! |
| Patient | john.doe@caresync.dev | Password123! |

## Project Structure

```
caresync/
├── apps/
│   ├── api/          # Hono REST API
│   ├── web/          # React SPA
│   └── e2e/          # Playwright tests
├── packages/
│   └── shared/       # Zod schemas + shared TypeScript types
├── docker-compose.yml
└── turbo.json
```

## API Overview

Base URL: `/api/v1`  
Interactive docs: `/docs`

| Resource        | Endpoints                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Auth            | `POST /auth/login`, `/auth/register`, `/auth/logout`, `/auth/refresh`                                  |
| Users           | `GET /users/me`, `PUT /users/me`, `PUT /users/me/avatar`                                               |
| Departments     | `GET/POST /departments`, `GET/PUT/DELETE /departments/:id`                                             |
| Doctors         | `GET/POST /doctors`, `GET/PUT/DELETE /doctors/:id`                                                     |
| Schedules       | `GET/PUT /doctors/:id/schedules`, `GET /doctors/:id/available-slots`                                   |
| Patients        | `GET/PUT /patients/me`, `GET /patients`                                                                |
| Appointments    | `POST /appointments`, `GET /appointments`, `GET /appointments/:id`, `PATCH /appointments/:id/status`   |
| Medical Records | `POST /medical-records`, `GET /medical-records`, `GET /medical-records/:id`                            |
| Attachments     | `POST /medical-records/:id/attachments`, `GET /medical-records/:id/attachments/:attachmentId/download` |

## Roles & Permissions

| Action                       | Admin |     Doctor      | Patient |
| ---------------------------- | :---: | :-------------: | :-----: |
| Manage departments & doctors |   ✓   |                 |         |
| Create medical records       |       |  ✓ (own appts)  |         |
| Upload file attachments      |       | ✓ (own records) |         |
| View medical records         |   ✓   |     ✓ (own)     | ✓ (own) |
| Download attachments         |   ✓   |     ✓ (own)     | ✓ (own) |
| Book appointments            |       |                 |    ✓    |
| View all patients            |   ✓   |        ✓        |         |

## Running Tests

```bash
# All unit tests
pnpm test

# API tests only
pnpm --filter api test

# Web tests only
pnpm --filter web test

# E2E (requires running stack + env vars)
ADMIN_EMAIL=admin@caresync.dev \
ADMIN_PASSWORD=Password123! \
API_URL=http://localhost:3001 \
pnpm test:e2e
```

## Environment Variables

### `apps/api/.env`

```env
DATABASE_URL=postgresql://caresync:caresync123@localhost:5432/caresync
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
PORT=3001
```

## Contributing

This project is open source and intended as a practice target for QA automation engineers. Bug reports, additional test scenarios, and pull requests are welcome.
