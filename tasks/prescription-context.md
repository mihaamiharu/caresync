# Context Summary — Issue #19 / Task 18: Prescriptions

## What Was Working On

Implementing the **Prescriptions feature** (API + Frontend) end-to-end for the CareSync clinic management system. The DB tables (`prescriptions`, `prescription_items`) already exist — no migration needed.

## What Was Completed

1. **Grill session** — 34 questions answered, all design decisions locked
2. **Plan document written** at `tasks/plan.md` — 12 tasks across 4 phases
3. **Task 1** (Shared Zod schemas) — created `packages/shared/src/schemas/prescriptions.ts` with all schemas
4. **Task 2** (API GET routes) — skeleton created but had **broken tests** at time of reset

## What Failed

The `prescriptions.test.ts` had multiple bugs:

- **Duplicate tests outside describe blocks** (lines 307-494) causing parse error `Unexpected "}"`
- **Missing `makeSimpleSelect`** function (only `makeSimpleChain` existed)
- **`mockReturnValueOnce` exhaustion** — tests calling `db.select()` 4+ times needed `mockImplementation` with a per-call counter, not chained `mockReturnValueOnce`
- **Incorrect mock chain order** for role-filtered list queries (patient/doctor need resolve → count → list → items, admin needs count → list → items × 2)

## Key Technical Findings

| Issue                         | Finding                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `.openapi()` method           | Only on `@hono/zod-openapi` Zod types — plain `zod` package doesn't have it                                                     |
| `makeInArrayChain` mock       | Returns `Promise.resolve(result)` directly on `.where()`, no `.limit()`                                                         |
| `db.select()` mock exhaustion | Use `mockImplementation` with counter for 3+ calls                                                                              |
| UUID validation               | `z.string().uuid()` returns **400** (not 404) — use valid-format UUID like `00000000-0000-0000-0000-000000000000` for 404 tests |
| Route mock order (GET by id)  | Join query → user resolve → items query                                                                                         |

## Files That Existed Before Reset

- `apps/api/src/routes/prescriptions.ts` — 320 lines, GET list + GET by id implemented
- `apps/api/src/routes/prescriptions.test.ts` — broken, needed fix
- `packages/shared/src/schemas/prescriptions.ts` — done
- `packages/shared/src/index.ts` — updated

## Plan Document (`tasks/plan.md`) Has Full Details

- 12 tasks: Tasks 1-3 (API), 4-7 (Frontend), 8-10 (Medical record integration), 11-12 (Tests + Seed)
- All API conventions standardized to match existing codebase
- `PUT /prescriptions/:id` (full replacement), `POST /prescriptions` (atomic transaction), no delete

## Next Steps for New Chat

1. Fix `prescriptions.test.ts` — replace broken tests with correct `mockImplementation` approach using `makeSimpleChain` + `makeJoinChain` + `makeInArrayChain`
2. Implement POST create + PUT update (Task 3)
3. Install shadcn Dialog (Task 4)
4. Build frontend pages (Tasks 5-7)
5. Embed in medical records detail (Tasks 8-10)
6. Seed data (Task 12)
