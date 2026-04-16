# Todo: Issue #18 — File Attachments for Medical Records

## Phase A — Types & API

- [x] T1: Add `attachments?: MedicalRecordAttachment[]` to `MedicalRecord` in `packages/shared/src/types.ts`
- [x] T2: Embed attachments array in `GET /medical-records/:id` response
- [x] T3: Add `POST /medical-records/:id/attachments` upload endpoint (doctor-only, validation, disk write, DB insert)
- [x] T4: Add `GET /medical-records/:id/attachments/:attachmentId/download` protected download route

**CHECKPOINT A**: curl tests pass for upload + download ✓

## Phase B — Frontend

- [x] T5: Add `uploadAttachment(recordId, formData)` to `medicalRecordsApi` in `apps/web/src/lib/api-client.ts`
- [x] T6: Add `AttachmentsCard` to `apps/web/src/pages/medical-records/detail.tsx` (file list + drag-and-drop upload + `useRevalidator`)

**CHECKPOINT B**: manual browser test — doctor uploads, list refreshes; patient sees download only

## Phase C — Tests

- [ ] T7: Vitest API tests for upload (valid/invalid type/size/ownership) + download (auth/ownership)
- [ ] T8: Playwright E2E — doctor upload flow, patient download view, invalid file type toast
