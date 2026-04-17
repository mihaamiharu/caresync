# Plan: Task 18 — Prescriptions (API + Frontend)

## Overview

Build the prescriptions feature end-to-end: doctor creates prescriptions with medication items from medical record detail pages, patients and doctors view their own prescriptions via a list page and detail page, with print support. One prescription per medical record maximum.

**Dependencies:** Task 17 (File attachments) — complete
**No DB migration needed** — `prescriptions` and `prescription_items` tables already in schema.

---

## Architecture Decisions

| Concern                 | Decision                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Page architecture       | Standalone pages (`/prescriptions`, `/prescriptions/:id`) + modal on medical record detail                                        |
| Navigation              | Sidebar link for all roles (doctor, patient, admin)                                                                               |
| Creation flow           | Doctor clicks "Add Prescription" on medical record detail → modal form                                                            |
| Create request          | Single `POST /prescriptions` with `{ medicalRecordId, notes, items[] }`                                                           |
| Access control          | Standard role-filtered: doctor create, all roles read own, admin read all                                                         |
| Print                   | `/prescriptions/:id` with `window.print()` + `@media print` CSS hiding all chrome                                                 |
| Dynamic form            | `useFieldArray` (react-hook-form)                                                                                                 |
| Field validation        | medicationName, dosage, frequency, duration: required. instructions: optional. Min 1 item.                                        |
| Appointment gate        | "Add Prescription" shown only when `appointment.status` is `confirmed`, `in-progress`, or `completed`, and no prescription exists |
| Embed in medical record | Yes — `GET /medical-records/:id` returns `{ ...record, prescription }`                                                            |
| Schema location         | `packages/shared/src/schemas/prescriptions.ts`                                                                                    |
| List filters            | `medicalRecordId` + `patientId` + `doctorId` + `page` + `limit` + `search`                                                        |
| Pagination              | Standard paginated response `{ data, total, page, limit, totalPages }`                                                            |
| Edit                    | `PUT /prescriptions/:id` — full replacement of notes + items array                                                                |
| Delete                  | No delete endpoint                                                                                                                |
| DB transaction          | All create/update operations atomic — `db.transaction()` with full rollback on partial failure                                    |
| Role-filter security    | Strict 403 on any filter crossing ownership boundaries                                                                            |
| Seed data               | Comprehensive — 5-10 prescriptions across patients/doctors, 2+ pages for pagination testing                                       |

---

## API Conventions (Standardized)

These decisions align with the existing codebase conventions and the `api-and-interface-design` skill:

| Convention              | Decision                                          | Rationale                                                                      |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Error response shape    | `{ message: string }`                             | Matches existing codebase throughout — don't introduce a new shape             |
| Update method           | `PUT` (full replacement)                          | Prescription update is always full array replacement — no partial PATCH needed |
| Pagination params       | `page` + `limit`                                  | Matches existing codebase (`departments.ts`, `doctors.ts`, `patients.ts`)      |
| Paginated envelope      | Flat `{ data, total, page, limit, totalPages }`   | Matches existing list endpoints                                                |
| Route prefix            | `/api/v1/prescriptions`                           | Applied at `app.ts` registration level, matching all other routes              |
| HTTP verbs              | POST=201, PUT=200, GET=200                        | Matches existing API convention                                                |
| Input/Output separation | `createPrescriptionSchema` / `prescriptionSchema` | Input schemas for bodies, output schemas for responses                         |

---

## Dependency Graph

```
packages/shared/src/schemas/prescriptions.ts
        │
        ├──→ apps/api/src/routes/prescriptions.ts
        │         ├──→ apps/api/src/app.ts (register route)
        │         └──→ apps/api/src/db/seed.ts (prescription seed)
        │
        ├──→ apps/web/src/lib/api-client.ts (prescriptionsApi)
        │
        └──→ apps/web/src/pages/prescriptions/index.tsx (list page)
                  └──→ apps/web/src/pages/prescriptions/detail.tsx (detail page)
                            └──→ apps/web/src/pages/medical-records/detail.tsx (PrescriptionCard + modal)
                                      └──→ apps/web/src/components/sidebar.tsx (nav link)

shadcn dialog — install first before any frontend UI code
```

---

## Task List

### Phase A — Schema Foundation

#### Task 1: Shared prescription Zod schemas

**Files:**

- `packages/shared/src/schemas/prescriptions.ts` (new)
- `packages/shared/src/index.ts` (update exports)

**What:**

- `prescriptionItemSchema` — `{ medicationName, dosage, frequency, duration, instructions }` with validation matching the rules above
- `prescriptionSchema` — `{ id, medicalRecordId, notes, createdAt, items? }`
- `createPrescriptionSchema` — `{ medicalRecordId, notes, items }` for POST body
- `updatePrescriptionSchema` — same as create, for PUT body
- `listPrescriptionsQuerySchema` — `{ page, limit, search?, medicalRecordId?, patientId?, doctorId? }`
- `prescriptionResponseSchema` — full response with embedded medicalRecord summary
- Export all types inferred via `z.infer`

**Verification:** `pnpm -r tsc --noEmit`

---

#### Task 2: API route — GET list + GET by id

**Files:**

- `apps/api/src/routes/prescriptions.ts` (new)
- `apps/api/src/app.ts` (register route)

**What:**

`GET /prescriptions` — paginated list:

- Middleware: `requireAuth`
- Role-filtered queries: patient → their `patientId`, doctor → their `doctorId`, admin → all
- Strict 403 if patientId query param doesn't match resolved patient id, or doctorId doesn't match resolved doctor id
- Joins: prescriptions → medicalRecords → appointments → patients → users (for patient name search), prescriptions → doctors → users (for doctor name)
- `search` param searches patient full name (`ilike`) and doctor full name
- Standard paginated response: `{ data: [...], total, page, limit, totalPages }`

`GET /prescriptions/:id` — single prescription:

- Middleware: `requireAuth`
- Ownership check: patient → their patientId, doctor → their doctorId, admin → no check
- Fetches prescription + items + embedded `medicalRecord` summary (id, diagnosis, appointmentDate, type, status)
- 404 if not found, 403 if ownership check fails

**Verification:** `pnpm --filter api test`

---

#### Task 3: API route — POST create + PUT update

**Files:**

- `apps/api/src/routes/prescriptions.ts` (add to existing)

**What:**

`POST /prescriptions`:

- Middleware: `requireAuth`, `requireRole("doctor")`
- Validate `createPrescriptionSchema`
- Fetch medical record by `medicalRecordId` — 404 if not found
- Check `record.doctorId === doctor.id` — 403 if not
- Check no existing prescription for this `medicalRecordId` — 409 if exists
- Check appointment status is `confirmed`, `in-progress`, or `completed` — 400 if not eligible
- All inserts in `db.transaction()`: insert into `prescriptions`, then batch insert `prescription_items`
- Return 201 with full prescription + items

`PUT /prescriptions/:id`:

- Middleware: `requireAuth`, `requireRole("doctor")`
- Fetch existing prescription — 404 if not found
- Check `prescription.doctorId === doctor.id` — 403 if not
- Validate `updatePrescriptionSchema`
- `db.transaction()`: delete existing `prescription_items`, then batch insert new ones, then update `prescriptions.notes`
- Full rollback on any failure
- Return 200 with updated prescription + items

**Verification:** `pnpm --filter api test`

---

### Checkpoint A: API complete

- [ ] `GET /prescriptions` returns paginated list, role-filtered, search works
- [ ] `GET /prescriptions/:id` returns full prescription with medical record embedded
- [ ] `POST /prescriptions` creates prescription + items atomically, 409 on duplicate, 403 on wrong doctor
- [ ] `PUT /prescriptions/:id` replaces items atomically, full rollback on failure
- [ ] Strict 403 on ownership-crossing filters
- [ ] Seed data inserted (5-10 prescriptions)
- [ ] `pnpm --filter api test` passes

---

### Phase B — Frontend Foundation

#### Task 4: Install shadcn Dialog

**Command:** `pnpm dlx shadcn@latest add dialog`

**Verification:** `pnpm --filter web build` succeeds

---

#### Task 5: `prescriptionsApi` in api-client

**Files:**

- `apps/web/src/lib/api-client.ts`

**What:**

- `list(params)` — `GET /api/v1/prescriptions?page=&limit=&search=&...`
- `get(id)` — `GET /api/v1/prescriptions/:id`
- `create(data)` — `POST /api/v1/prescriptions`
- `update(id, data)` — `PUT /api/v1/prescriptions/:id`

**Verification:** `pnpm --filter web tsc --noEmit`

---

#### Task 6: Prescription list page

**Files:**

- `apps/web/src/pages/prescriptions/index.tsx` (new)
- `apps/web/src/app.tsx` (add route)
- `apps/web/src/components/sidebar.tsx` (add nav link — all roles)

**What:**

- Loader: calls `prescriptionsApi.list()` with params from URLSearchParams
- Role-filtered params: patient → no patientId param (server filters), doctor → no doctorId param, admin → optionally pass patientId/doctorId from UI filters
- Search input (patient name search)
- Pagination controls
- Table/list showing: prescription date, patient name (doctor/admin view), doctor name (patient view), medication count, notes excerpt
- "Print" link on each row → `/prescriptions/:id`
- Empty state

**Verification:** Page renders, list loads, pagination controls work

---

#### Task 7: Prescription detail page

**Files:**

- `apps/web/src/pages/prescriptions/detail.tsx` (new)
- `apps/web/src/app.tsx` (add route)

**What:**

- Loader: calls `prescriptionsApi.get(id)`
- Displays: patient name, doctor name, date, diagnosis (from embedded medicalRecord), appointment date/type
- Medication items table: medication name, dosage, frequency, duration, instructions
- Notes section
- "Print" button: `window.print()`
- Print CSS: `@media print` hides sidebar, header, back link, print button — only prescription card visible
- Edit button (doctor only, if they own the prescription) → opens modal
- Embedded medical record link

**Verification:** Page renders, print button works cleanly, `@media print` hides chrome

---

### Checkpoint B: Frontend pages complete

- [ ] `/prescriptions` list page loads with seed data, pagination works
- [ ] `/prescriptions/:id` detail page renders full prescription with print
- [ ] Print output shows only prescription card, no sidebar/chrome
- [ ] Sidebar shows "Prescriptions" link for all roles
- [ ] `pnpm --filter web build` succeeds

---

### Phase C — Prescription UI on Medical Record Detail

#### Task 8: Embed prescription in `GET /medical-records/:id`

**Files:**

- `apps/api/src/routes/medical-records.ts`
- `packages/shared/src/schemas/medical-records.ts` (or inline schemas if no separate file)

**What:**

- In `GET /medical-records/:id` handler: after fetching record, query `prescriptions` table for matching `medicalRecordId`
- If found: fetch `prescription_items` for that prescription
- Add `prescription: { id, notes, createdAt, items } | null` to response
- Update response schema to include `prescription` field

**Verification:** `GET /api/v1/medical-records/:id` returns `prescription` key

---

#### Task 9: PrescriptionCard component on medical record detail

**Files:**

- `apps/web/src/pages/medical-records/detail.tsx`

**What:**

- Add `PrescriptionCard` sub-component (inline, following `AttachmentsCard` pattern)
- Shows existing prescription if `record.prescription` exists: medication count, notes excerpt, "View Prescription" link to `/prescriptions/:id`
- If no prescription and doctor + appointment status eligible: "Add Prescription" button
- If prescription exists: "View Prescription" button
- "Add Prescription" opens `PrescriptionModal` dialog

---

#### Task 10: PrescriptionModal with dynamic form

**Files:**

- `apps/web/src/pages/medical-records/detail.tsx` (add inline)
- `packages/shared/src/schemas/prescriptions.ts` (consume create schema for zod validation)

**What:**

- `<Dialog>` from shadcn wrapping prescription form
- `useForm` with `useFieldArray` for medication rows
- Each row: medicationName, dosage, frequency, duration, instructions inputs
- Add row / remove row buttons
- Min 1 item validation — cannot submit empty
- All clinical fields required, instructions optional
- On submit: `prescriptionsApi.create({ medicalRecordId: record.id, notes, items })`
- Success: close modal, `revalidator.revalidate()` to refresh page data
- Error: `toast.error()` with API message
- Pre-populate notes if editing (`PUT` via same modal, different mode)

**Verification:** Doctor can add prescription via modal, list refreshes, page updates without reload

---

### Checkpoint C: Medical record integration complete

- [ ] Medical record detail page shows prescription section
- [ ] Doctor can add prescription via modal, sees it appear after submit
- [ ] Patient sees prescription card with "View" link
- [ ] `pnpm --filter web build` succeeds

---

### Phase D — Tests

#### Task 11: API tests for prescriptions route

**Files:**

- `apps/api/src/routes/prescriptions.test.ts` (new)

**Test cases:**

- `GET /prescriptions`: 401 without auth, returns paginated list
- `GET /prescriptions`: patient sees only own, doctor sees only own
- `GET /prescriptions`: patient cannot pass `doctorId` filter (403)
- `GET /prescriptions`: `search` filters by patient name
- `GET /prescriptions/:id`: 401 without auth, 403 for wrong ownership, 200 for owner
- `GET /prescriptions/:id`: includes embedded medical record
- `POST /prescriptions`: 401 without auth, 403 for non-doctor, 400 for invalid body
- `POST /prescriptions`: 409 if record already has prescription
- `POST /prescriptions`: 400 if appointment status not eligible
- `POST /prescriptions`: 201 creates prescription + items atomically
- `PUT /prescriptions/:id`: 403 for non-owner
- `PUT /prescriptions/:id`: full replacement of items

**Verification:** `pnpm --filter api test`

---

#### Task 12: Seed data for prescriptions

**Files:**

- `apps/api/src/db/seed.ts`

**What:**

- Seed 8-10 prescriptions linked to existing medical records in seed
- Mix of: different patient ids, different doctor ids
- Each prescription: 1-5 medication items
- Vary: some with notes, some without
- At least 2 prescriptions share the same patient (for "my prescriptions" list)
- At least 2 prescriptions share the same doctor (for doctor's list)
- Ensure at least 2 pages worth when using `limit=5`

**Verification:** `pnpm --filter api db:seed && GET /prescriptions` returns paginated results

---

## Open Questions

All decisions resolved in grill session. No open questions.

---

## Files Summary

| File                                            | Action                                  |
| ----------------------------------------------- | --------------------------------------- |
| `packages/shared/src/schemas/prescriptions.ts`  | Create                                  |
| `packages/shared/src/index.ts`                  | Update exports                          |
| `apps/api/src/routes/prescriptions.ts`          | Create                                  |
| `apps/api/src/app.ts`                           | Add route registration                  |
| `apps/api/src/routes/medical-records.ts`        | Add prescription embedding in GET by id |
| `apps/api/src/db/seed.ts`                       | Add prescription seed data              |
| `apps/api/src/routes/prescriptions.test.ts`     | Create                                  |
| `apps/web/src/lib/api-client.ts`                | Add prescriptionsApi                    |
| `apps/web/src/pages/prescriptions/index.tsx`    | Create                                  |
| `apps/web/src/pages/prescriptions/detail.tsx`   | Create                                  |
| `apps/web/src/pages/medical-records/detail.tsx` | Add PrescriptionCard + modal            |
| `apps/web/src/components/sidebar.tsx`           | Add nav link                            |
| `apps/web/src/app.tsx`                          | Add routes                              |
