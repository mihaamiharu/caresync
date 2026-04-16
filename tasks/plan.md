# Plan: Issue #18 — File Attachments for Medical Records

## Decisions (locked from grill session)

| Concern             | Decision                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| Storage             | Local disk `./uploads/medical-records/`, protected route                         |
| File naming         | UUID on disk, original name in DB                                                |
| Download            | `GET /medical-records/:id/attachments/:attachmentId/download` — auth + ownership |
| Upload auth         | Doctor only, must own the record                                                 |
| File types          | `pdf`, `jpg`, `png` only                                                         |
| Size limit          | 10MB per file                                                                    |
| Multi-file          | One file per request, frontend loops                                             |
| API response        | Attachments embedded in `GET /medical-records/:id`                               |
| UI placement        | Full-width card at bottom of detail page                                         |
| Post-upload refresh | `useRevalidator()`                                                               |
| Drag-and-drop       | Native HTML5, no library                                                         |
| Error feedback      | Sonner toasts                                                                    |

---

## Dependency Graph

```
[Shared types: MedicalRecord + attachments]
        │
        ├──→ [API T1] Embed attachments in GET /medical-records/:id
        │         └──→ [API T2] POST /medical-records/:id/attachments (upload)
        │         └──→ [API T3] GET /medical-records/:id/attachments/:id/download
        │
        └──→ [Web T4] Update api-client (uploadAttachment fn)
                  └──→ [Web T5] AttachmentsCard UI in detail page
                            └──→ [Test T6] Vitest + Playwright tests
```

No DB migration needed — `medical_record_attachments` table already exists.

---

## Tasks

### CHECKPOINT A — Types & API foundation

#### T1 — Shared types: add `attachments` to `MedicalRecord`

**Files touched:**

- `packages/shared/src/types.ts`

**Changes:**

- Add `attachments?: MedicalRecordAttachment[]` field to `MedicalRecord` interface
- `MedicalRecordAttachment` is already defined in the file — no new interface needed

**Acceptance criteria:**

- `MedicalRecord.attachments` is typed as `MedicalRecordAttachment[] | undefined`
- `pnpm tsc --noEmit` passes across all packages

**Verification:** `pnpm -r tsc --noEmit`

---

#### T2 — API: embed attachments in `GET /medical-records/:id`

**Files touched:**

- `apps/api/src/routes/medical-records.ts`
- `apps/api/src/db/schema.ts` (import `medicalRecordAttachments`)

**Changes:**

- Add `attachmentSchema` to route schemas:
  ```ts
  const attachmentSchema = z.object({
    id: z.string(),
    medicalRecordId: z.string(),
    fileName: z.string(),
    fileUrl: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
  });
  ```
- Extend `medicalRecordSchema` to include `attachments: z.array(attachmentSchema)`
- In `GET /medical-records/:id` handler: after fetching the record row, run a second query to fetch attachments for that record id
- Return `attachments` array in the JSON response (empty array if none)
- Also update `GET /medical-records` list handler — attachments are NOT embedded in the list (too expensive); list returns `attachments: []` or omit the field

**Acceptance criteria:**

- `GET /api/v1/medical-records/:id` returns `{ ...record, attachments: [] }` for a record with no files
- After upload, the same endpoint returns the attachment in the array
- List endpoint is not affected

**Verification:** `curl -H "Authorization: Bearer <token>" /api/v1/medical-records/:id | jq '.attachments'` returns `[]`

---

#### T3 — API: `POST /medical-records/:id/attachments` (upload)

**Files touched:**

- `apps/api/src/routes/medical-records.ts`

**Pattern to follow:** `apps/api/src/routes/users.ts` avatar upload handler

**Changes:**

- New route: `POST /medical-records/{id}/attachments`
- Middleware: `requireAuth`, `requireRole("doctor")`
- Handler logic:
  1. Resolve doctor from `userId`
  2. Fetch medical record by `id`, 404 if not found
  3. Check `record.doctorId === doctor.id`, 403 if not
  4. Parse `c.req.parseBody()`, extract `file` field
  5. Validate MIME type: `application/pdf`, `image/jpeg`, `image/png` → 400 if invalid
  6. Validate file size ≤ 10MB (10 _ 1024 _ 1024 bytes) → 400 if too large
  7. Generate UUID filename: `${crypto.randomUUID()}.${ext}`
  8. `mkdir ./uploads/medical-records/ { recursive: true }`
  9. Write file to disk with `fs/promises`
  10. Insert row into `medical_record_attachments`
  11. Return 201 with created attachment

**Acceptance criteria:**

- 201 on valid pdf/jpg/png ≤ 10MB
- 400 on invalid MIME type
- 400 on file > 10MB
- 403 when doctor doesn't own the record
- 401 when unauthenticated
- File exists on disk at `./uploads/medical-records/{uuid}.ext`
- Row exists in `medical_record_attachments` table

**Verification:** Upload a PDF via curl, check disk + DB

---

#### T4 — API: `GET /medical-records/:id/attachments/:attachmentId/download`

**Files touched:**

- `apps/api/src/routes/medical-records.ts`

**Changes:**

- New route: `GET /medical-records/{id}/attachments/{attachmentId}/download`
- Middleware: `requireAuth`
- Handler logic:
  1. Fetch medical record by `id`, 404 if not found
  2. Role-based ownership check (same pattern as existing GET by id):
  - patient: verify `record.patientId === patient.id`
  - doctor: verify `record.doctorId === doctor.id`
  - admin: no check
  3. Fetch attachment by `attachmentId` where `medicalRecordId === record.id`, 404 if not found
  4. Build file path from `attachment.fileUrl` (strip leading `/` prefix)
  5. Stream file using `readFile` + set headers:
  - `Content-Type: attachment.fileType`
  - `Content-Disposition: attachment; filename="${attachment.fileName}"`
  6. Return 200 with file body

**Acceptance criteria:**

- Doctor who owns record: 200 + file download
- Patient who owns record: 200 + file download
- Wrong doctor/patient: 403
- Unauthenticated: 401
- Non-existent attachment: 404
- `Content-Disposition` header contains the original filename

**Verification:** `curl -H "Authorization: Bearer <token>" /api/v1/medical-records/:id/attachments/:attachmentId/download -o test.pdf`

---

### CHECKPOINT B — Frontend

#### T5 — Frontend: add `uploadAttachment` to `medicalRecordsApi`

**Files touched:**

- `apps/web/src/lib/api-client.ts`

**Changes:**

- Add method to `medicalRecordsApi`:
  ```ts
  uploadAttachment: async (recordId: string, formData: FormData): Promise<MedicalRecordAttachment> => {
    const res = await apiClient.post<MedicalRecordAttachment>(
      `/api/v1/medical-records/${recordId}/attachments`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },
  ```
- Import `MedicalRecordAttachment` from `@caresync/shared`

**Acceptance criteria:**

- TypeScript compiles cleanly
- Method signature matches API contract

**Verification:** `pnpm --filter web tsc --noEmit`

---

#### T6 — Frontend: `AttachmentsCard` in medical record detail page

**Files touched:**

- `apps/web/src/pages/medical-records/detail.tsx`

**Changes:**

1. **Loader** — no change needed. `medicalRecordDetailLoader` calls `medicalRecordsApi.get(id)` which now returns `attachments` embedded. The loader return type widens automatically via the `MedicalRecord` type update in T1.
2. `**AttachmentsCard` component\*\* (inline in detail.tsx, not a separate file — single use):

```
 Props: { record: MedicalRecord, userRole: string }
```

**File list section:**

- Renders `record.attachments` (or empty state "No attachments yet")
- Each item shows: icon (pdf/img), `fileName`, human-readable `fileSize`, download link
- Download link: `<a href="/api/v1/medical-records/:id/attachments/:attachmentId/download">` with `download` attribute — browser handles it natively, no JS needed
  **Upload section (doctor only):**
- Shown only when `userRole === "doctor"`
- Drop zone `<div>` with:
  - `onDragOver`: `e.preventDefault(); setDragging(true)`
  - `onDragLeave`: check `e.relatedTarget` to avoid child-element false triggers, `setDragging(false)`
  - `onDrop`: `e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files)`
  - Click-to-browse: hidden `<input type="file" accept=".pdf,.jpg,.jpeg,.png">`, triggered by button click
- `handleFiles(files: FileList)`:
  - Loop through files
  - For each: create `FormData`, call `medicalRecordsApi.uploadAttachment()`
  - On success: call `revalidator.revalidate()`
  - On error: `toast.error(error.response?.data?.message ?? "Upload failed")`

3. **Revalidator:**

- `const revalidator = useRevalidator()` at page component level
- Pass down to `AttachmentsCard` or lift the handler up

4. **Auth role:**

- Get role from `useAuthStore`: `const role = useAuthStore(s => s.user?.role)`
- Pass to `AttachmentsCard` as `userRole`

5. **Placement:** Below the existing grid, full-width:

```tsx
<div className="mt-6">
  <AttachmentsCard record={record} userRole={role ?? ""} />
</div>
```

**Acceptance criteria:**

- Attachments card renders on detail page
- Empty state shown when no attachments
- File list shows name, size, download link
- Upload zone visible to doctor, hidden from patient
- Drag-and-drop works: drop a PDF, list refreshes without page reload
- Click-to-browse works
- Toast shown on invalid file type or size error from API
- `useEffect` not used anywhere

**Verification:** Manual browser test — doctor uploads file, list updates; patient sees download link only

---

### CHECKPOINT C — Tests

#### T7 — API tests: upload + download endpoints

**Files touched:**

- `apps/api/src/routes/medical-records.test.ts` (new or extend existing)

**Test cases:**

- POST upload: 201 on valid file
- POST upload: 400 on invalid MIME type
- POST upload: 400 on file > 10MB
- POST upload: 403 when doctor doesn't own record
- POST upload: 401 when unauthenticated
- GET download: 200 + correct headers for authorized user
- GET download: 403 for wrong user
- GET download: 401 for unauthenticated

**Verification:** `pnpm --filter api test`

---

#### T8 — E2E: file upload + download flow

**Files touched:**

- `apps/e2e/tests/medical-records-attachments.spec.ts` (new)

**Test cases:**

- Doctor uploads a PDF to a medical record → attachment appears in list
- Patient views medical record → sees attachment in list, can click download link
- Doctor tries to upload an unsupported file type → toast error appears

**Verification:** `pnpm --filter e2e test`

---

## Execution Order

```
T1 (shared types)
  → T2 (embed attachments in GET)
  → T3 (upload endpoint)
  → T4 (download endpoint)
  [CHECKPOINT A: all API endpoints pass manual curl tests]
  → T5 (api-client method)
  → T6 (AttachmentsCard UI)
  [CHECKPOINT B: manual browser test passes]
  → T7 (API unit tests)
  → T8 (E2E tests)
  [CHECKPOINT C: CI green]
```
