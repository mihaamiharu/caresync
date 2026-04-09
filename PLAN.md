        1 # CareSync — Healthcare Clinic Management System
        2
        3 > A fully functional practice website for QA Automation Engineers to sharpen e2e testing skills (web + API) with Playwright or any testing framework.
        4
        5 ## Overview
        6
        7 CareSync simulates a real healthcare clinic management product with realistic flows: patient registration, appointment booking, medical records, prescriptions, billing, and admin dashboards. It provides rich testing surfac
          e — forms, tables, modals, search, pagination, date pickers, file uploads, role-based access, and a standalone REST API with OpenAPI docs.
        8
        9 ---
       10
       11 ## Tech Stack
       12
       13 | Layer | Technology |
       14 |-------|-----------|
       15 | **Monorepo** | Turborepo + pnpm workspaces |
       16 | **Frontend** | React 19 + Vite + React Router v7 + TailwindCSS v4 + shadcn/ui + zustand |
       17 | **Backend** | Hono (Node.js) + `@hono/zod-openapi` |
       18 | **Database** | PostgreSQL + Drizzle ORM |
       19 | **Shared** | Zod schemas in `packages/shared` (`@caresync/shared`) |
       20 | **Auth** | JWT (access token 15min + refresh token 7d), httpOnly cookies |
       21 | **API Docs** | Scalar (served at `/api/docs`) |
       22 | **Package manager** | pnpm |
       23
       24 ---
       25
       26 ## Monorepo Structure
       27
       28 ```
       29 caresync/
       30 ├── apps/
       31 │   ├── web/                    # React + Vite frontend
       32 │   │   └── src/
       33 │   │       ├── components/     # Reusable UI components
       34 │   │       ├── pages/          # Route pages
       35 │   │       ├── hooks/          # Custom React hooks
       36 │   │       ├── lib/            # API client, utils
       37 │   │       ├── stores/         # State management (zustand)
       38 │   │       └── layouts/        # Layout components
       39 │   └── api/                    # Hono REST API
       40 │       └── src/
       41 │           ├── routes/         # Route handlers
       42 │           ├── middleware/     # Auth, CORS, error handling
       43 │           ├── db/            # Drizzle schema, migrations, seed
       44 │           └── lib/           # Utilities
       45 ├── packages/
       46 │   └── shared/                # Shared Zod schemas, types, constants
       47 ├── turbo.json
       48 ├── package.json
       49 ├── pnpm-workspace.yaml
       50 └── docker-compose.yml         # PostgreSQL for local dev
       51 ```
       52
       53 ---
       54
       55 ## User Roles
       56
       57 | Role | Capabilities |
       58 |------|-------------|
       59 | **Admin** | Manage users, doctors, departments, view system stats |
       60 | **Doctor** | Manage own schedule, view appointments, create medical records & prescriptions |
       61 | **Patient** | Self-register, book appointments, view own records, pay invoices, review doctors |
       62
       63 ---
       64
       65 ## Database Schema
       66
       67 | Table | Key Columns |
       68 |-------|------------|
       69 | `users` | id, email, password_hash, role (admin/doctor/patient), first_name, last_name, phone, avatar_url, is_active |
       70 | `departments` | id, name, description, image_url, is_active |
       71 | `doctors` | id, user_id FK, department_id FK, specialization, bio, license_number |
       72 | `doctor_schedules` | id, doctor_id FK, day_of_week, start_time, end_time, slot_duration_minutes |
       73 | `patients` | id, user_id FK, date_of_birth, gender, blood_type, allergies, emergency_contact_name, emergency_contact_phone |
       74 | `appointments` | id, patient_id FK, doctor_id FK, appointment_date, start_time, end_time, status, type, reason, notes |
       75 | `medical_records` | id, appointment_id FK, patient_id FK, doctor_id FK, diagnosis, symptoms, notes |
       76 | `medical_record_attachments` | id, medical_record_id FK, file_name, file_url, file_type, file_size |
       77 | `prescriptions` | id, medical_record_id FK, notes |
       78 | `prescription_items` | id, prescription_id FK, medication_name, dosage, frequency, duration, instructions |
       79 | `invoices` | id, appointment_id FK, patient_id FK, amount, tax, total, status, due_date, paid_at |
       80 | `reviews` | id, appointment_id FK, patient_id FK, doctor_id FK, rating (1-5), comment |
       81 | `notifications` | id, user_id FK, title, message, type, is_read, link |
       82
       83 **Appointment statuses:** pending → confirmed → in-progress → completed / cancelled / no-show
       84 **Invoice statuses:** pending → paid / overdue / cancelled
       85
       86 ---
       87
       88 ## API Routes (REST, prefix `/api/v1`)
       89
       90 | Group | Endpoints |
       91 |-------|----------|
       92 | **Auth** | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh` |
       93 | **Users** | `GET /users/me`, `PUT /users/me`, `PUT /users/me/avatar`, `GET /users` (admin), `PATCH /users/:id/status` (admin) |
       94 | **Departments** | `GET /departments`, `GET /departments/:id`, `POST /departments`, `PUT /departments/:id`, `DELETE /departments/:id` |
       95 | **Doctors** | `GET /doctors`, `GET /doctors/:id`, `POST /doctors`, `PUT /doctors/:id`, `DELETE /doctors/:id`, `GET /doctors/:id/schedules`, `PUT /doctors/:id/schedules`, `GET /doctors/:id/available-slots?date=` |
       96 | **Patients** | `GET /patients`, `GET /patients/:id`, `POST /patients`, `PUT /patients/:id`, `DELETE /patients/:id` |
       97 | **Appointments** | `GET /appointments`, `GET /appointments/:id`, `POST /appointments`, `PUT /appointments/:id`, `DELETE /appointments/:id`, `PATCH /appointments/:id/status` |
       98 | **Medical Records** | `GET /medical-records`, `GET /medical-records/:id`, `POST /medical-records`, `PUT /medical-records/:id`, `DELETE /medical-records/:id`, `POST /medical-records/:id/attachments` |
       99 | **Prescriptions** | `GET /prescriptions`, `GET /prescriptions/:id`, `POST /prescriptions`, `PUT /prescriptions/:id`, `DELETE /prescriptions/:id` |
      100 | **Invoices** | `GET /invoices`, `GET /invoices/:id`, `PATCH /invoices/:id/pay` |
      101 | **Reviews** | `GET /reviews`, `GET /reviews/:id`, `POST /reviews`, `PUT /reviews/:id`, `DELETE /reviews/:id` |
      102 | **Notifications** | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` |
      103 | **Admin** | `GET /admin/stats` |
      104
      105 ---
      106
      107 ## Implementation Plan
      108
      109 ### Phase 1: Project Setup & Foundation
      110
      111 #### Task 1: Initialize Turborepo monorepo
      112 Set up the Turborepo monorepo with pnpm workspaces, configure `turbo.json` with build/dev/lint pipelines, create root `package.json` and `pnpm-workspace.yaml`.
      113
      114 **Acceptance criteria:**
      115 - [ ] `pnpm install` works from root
      116 - [ ] `pnpm dev` starts all apps
      117 - [ ] Workspace packages resolve correctly
      118
      119 **Dependencies:** None — **Scope:** Small
      120
      121 ---
      122
      123 #### Task 2: Set up the API app (Hono)
      124 Create `apps/api` with Hono, TypeScript, `@hono/zod-openapi`, Scalar for API docs. Configure dev server with hot reload (tsx watch). Set up base route structure and health check endpoint.
      125
      126 **Acceptance criteria:**
      127 - [ ] `pnpm dev --filter api` starts Hono server on port 3000
      128 - [ ] `GET /health` returns 200
      129 - [ ] `GET /api/docs` shows Scalar API documentation UI
      130 - [ ] TypeScript compiles cleanly
      131
      132 **Dependencies:** Task 1 — **Scope:** Small
      133
      134 ---
      135
      136 #### Task 3: Set up the Web app (React + Vite)
      137 Create `apps/web` with React, Vite, TailwindCSS v4, shadcn/ui, React Router v7, and zustand. Configure proxy to API in Vite dev server. Create basic app shell with sidebar layout.
      138
      139 **Acceptance criteria:**
      140 - [ ] `pnpm dev --filter web` starts on port 5173
      141 - [ ] TailwindCSS works (utility classes render)
      142 - [ ] shadcn/ui components can be added
      143 - [ ] API proxy forwards `/api/*` to backend
      144 - [ ] Basic layout shell renders (sidebar + main content area)
      145
      146 **Dependencies:** Task 1 — **Scope:** Medium
      147
      148 ---
      149
      150 #### Task 4: Set up shared package
      151 Create `packages/shared` with Zod schemas, TypeScript types, and shared constants (roles, appointment statuses, etc). Configure package exports for consumption by both apps.
      152
      153 **Acceptance criteria:**
      154 - [ ] Both `apps/api` and `apps/web` can import from `@caresync/shared`
      155 - [ ] Zod schemas export correctly
      156 - [ ] TypeScript types infer from Zod schemas
      157
      158 **Dependencies:** Task 1 — **Scope:** Small
      159
      160 ---
      161
      162 #### Task 5: Database setup with Drizzle ORM
      163 Add `docker-compose.yml` for PostgreSQL. Set up Drizzle ORM in `apps/api` with all schema tables. Create initial migration. Add `drizzle-kit` scripts for migrate/push/studio.
      164
      165 **Acceptance criteria:**
      166 - [ ] `docker compose up -d` starts PostgreSQL
      167 - [ ] All tables defined in Drizzle schema match the database design
      168 - [ ] `pnpm db:push` applies schema to database
      169 - [ ] `pnpm db:studio` opens Drizzle Studio
      170 - [ ] Foreign key relationships are correct
      171
      172 **Dependencies:** Task 2 — **Scope:** Medium
      173
      174 ---
      175
      176 ### Checkpoint: Foundation
      177 - [ ] `pnpm dev` starts both frontend and backend
      178 - [ ] Database is running with all tables
      179 - [ ] API docs page renders
      180 - [ ] Frontend app shell loads and proxies to API
      181
      182 ---
      183
      184 ### Phase 2: Auth & User Management
      185
      186 #### Task 6: Implement auth API routes
      187 Build registration, login, logout, and refresh token endpoints. Hash passwords with bcrypt. Issue JWT access + refresh tokens. Store refresh tokens in httpOnly cookies. Add Zod validation schemas in shared package.
      188
      189 **Acceptance criteria:**
      190 - [ ] `POST /auth/register` creates user, returns access token
      191 - [ ] `POST /auth/login` validates credentials, returns access token + sets refresh cookie
      192 - [ ] `POST /auth/refresh` issues new access token from refresh cookie
      193 - [ ] `POST /auth/logout` clears refresh cookie
      194 - [ ] Validation errors return proper 400 responses with field-level errors
      195 - [ ] All routes documented in OpenAPI spec
      196
      197 **Dependencies:** Task 4, Task 5 — **Scope:** Medium
      198
      199 ---
      200
      201 #### Task 7: Auth middleware & role-based access
      202 Create Hono middleware that verifies JWT access tokens, attaches user to context. Create role-guard middleware that restricts routes by role. Add `GET /users/me` endpoint.
      203
      204 **Acceptance criteria:**
      205 - [ ] Protected routes return 401 without token
      206 - [ ] Protected routes return 403 for wrong role
      207 - [ ] `GET /users/me` returns current user profile
      208 - [ ] Expired tokens return 401
      209
      210 **Dependencies:** Task 6 — **Scope:** Small
      211
      212 ---
      213
      214 #### Task 8: Frontend auth pages (Login & Register)
      215 Build login and registration pages with form validation. Create auth store (zustand) for token management. Set up axios/fetch client with interceptors for auto-refresh. Add protected route wrapper.
      216
      217 **Acceptance criteria:**
      218 - [ ] Login page with email/password, validation, error display
      219 - [ ] Register page with role selection (patient only for self-register), full form validation
      220 - [ ] Tokens stored in memory (access) and cookies (refresh)
      221 - [ ] Auto-redirect to login when unauthorized
      222 - [ ] Auto-redirect to dashboard when already authenticated
      223 - [ ] Loading states during auth requests
      224
      225 **Dependencies:** Task 6, Task 7, Task 3 — **Scope:** Medium
      226
      227 ---
      228
      229 #### Task 9: User profile management
      230 Build `PUT /users/me` endpoint and profile page. Avatar upload with `PUT /users/me/avatar` (store locally in `/uploads`). Admin endpoints: `GET /users` (list with pagination), `PATCH /users/:id/status` (activate/deactivate
          ).
      231
      232 **Acceptance criteria:**
      233 - [ ] Users can update their profile (name, phone, etc.)
      234 - [ ] Avatar upload works (file stored, URL returned)
      235 - [ ] Admin can list all users with pagination and search
      236 - [ ] Admin can activate/deactivate users
      237 - [ ] Profile page displays and edits user info
      238
      239 **Dependencies:** Task 7, Task 8 — **Scope:** Medium
      240
      241 ---
      242
      243 ### Checkpoint: Auth
      244 - [ ] Full register → login → profile update flow works
      245 - [ ] Role-based access control works (admin/doctor/patient)
      246 - [ ] Token refresh works transparently
      247 - [ ] API docs show all auth endpoints
      248
      249 ---
      250
      251 ### Phase 3: Departments & Doctors
      252
      253 #### Task 10: Department CRUD (API + Frontend)
      254 Build department API endpoints (CRUD) and frontend pages: department list (with search), department detail/edit form. Admin-only write operations. Public read.
      255
      256 **Acceptance criteria:**
      257 - [ ] Admin can create/edit/delete departments
      258 - [ ] Anyone authenticated can view department list and detail
      259 - [ ] Department list supports search by name
      260 - [ ] Frontend shows department cards/list with images
      261 - [ ] Form validation on create/edit
      262
      263 **Dependencies:** Task 7, Task 8 — **Scope:** Medium
      264
      265 ---
      266
      267 #### Task 11: Doctor CRUD & profiles (API + Frontend)
      268 Build doctor API endpoints and frontend. Admin creates doctor accounts (with user account). Doctor profile pages showing specialization, bio, department. Doctor directory page with search/filter by department and specializ
          ation.
      269
      270 **Acceptance criteria:**
      271 - [ ] Admin can create doctor profiles (creates user + doctor record)
      272 - [ ] Doctor directory page with search, filter by department
      273 - [ ] Doctor detail page showing full profile
      274 - [ ] Pagination on doctor list
      275 - [ ] Doctors can edit their own bio/specialization
      276
      277 **Dependencies:** Task 10 — **Scope:** Medium
      278
      279 ---
      280
      281 #### Task 12: Doctor schedule management
      282 Build schedule API: `GET/PUT /doctors/:id/schedules` for weekly availability, `GET /doctors/:id/available-slots?date=` to compute available time slots for a given date. Frontend: schedule management form for doctors, slot
          viewer for patients.
      283
      284 **Acceptance criteria:**
      285 - [ ] Doctors can set weekly schedule (day, start/end time, slot duration)
      286 - [ ] Available slots endpoint computes open slots excluding booked appointments
      287 - [ ] Schedule UI shows weekly grid
      288 - [ ] Patients can view available slots when booking
      289
      290 **Dependencies:** Task 11 — **Scope:** Medium
      291
      292 ---
      293
      294 ### Checkpoint: Departments & Doctors
      295 - [ ] Department and doctor management works end-to-end
      296 - [ ] Doctor directory with search/filter works
      297 - [ ] Schedule management and slot availability works
      298 - [ ] All endpoints documented in OpenAPI
      299
      300 ---
      301
      302 ### Phase 4: Patients & Appointments
      303
      304 #### Task 13: Patient profile management
      305 Build patient API and frontend. Patients complete their profile after registration (date of birth, gender, blood type, allergies, emergency contact). Admin can view all patients with search/pagination.
      306
      307 **Acceptance criteria:**
      308 - [ ] Patient profile form with all medical fields
      309 - [ ] Admin can view patient list with search and pagination
      310 - [ ] Patient can view/edit their own profile
      311 - [ ] Validation on all medical fields
      312
      313 **Dependencies:** Task 9 — **Scope:** Medium
      314
      315 ---
      316
      317 #### Task 14: Appointment booking flow
      318 Build the multi-step appointment booking: Step 1 — select department, Step 2 — select doctor (filtered), Step 3 — select date + time slot, Step 4 — enter reason + confirm. API: `POST /appointments`. Frontend: booking wizar
          d with step indicator.
      319
      320 **Acceptance criteria:**
      321 - [ ] Multi-step booking wizard UI with progress indicator
      322 - [ ] Department selection filters available doctors
      323 - [ ] Date picker shows only future dates
      324 - [ ] Time slots fetched from available-slots API
      325 - [ ] Booked slots not shown as available
      326 - [ ] Confirmation step shows booking summary
      327 - [ ] Successful booking creates appointment with "pending" status
      328
      329 **Dependencies:** Task 12, Task 13 — **Scope:** Large
      330
      331 ---
      332
      333 #### Task 15: Appointment management
      334 Build appointment list/detail views and status management. Patients see own appointments. Doctors see their assigned appointments. Admin sees all. Status transitions: pending → confirmed → in-progress → completed (or cance
          lled/no-show at various stages).
      335
      336 **Acceptance criteria:**
      337 - [ ] Appointment list with filter by status, date range, pagination
      338 - [ ] Appointment detail view showing all info
      339 - [ ] Doctors can confirm/start/complete appointments
      340 - [ ] Patients can cancel pending/confirmed appointments
      341 - [ ] Admin can update any appointment status
      342 - [ ] Status change reflected immediately in UI
      343 - [ ] Status badge with color coding
      344
      345 **Dependencies:** Task 14 — **Scope:** Medium
      346
      347 ---
      348
      349 ### Checkpoint: Appointments
      350 - [ ] Full booking wizard works
      351 - [ ] Appointment lifecycle (book → confirm → complete) works
      352 - [ ] Role-specific views work correctly
      353 - [ ] Schedule conflicts prevented
      354
      355 ---
      356
      357 ### Phase 5: Medical Records & Prescriptions
      358
      359 #### Task 16: Medical records (API + Frontend)
      360 After completing an appointment, doctors can create medical records with diagnosis, symptoms, and notes. Patients can view their own records.
      361
      362 **Acceptance criteria:**
      363 - [ ] Doctor can create medical record linked to completed appointment
      364 - [ ] Record includes diagnosis, symptoms, notes
      365 - [ ] Patient can view their medical history (list + detail)
      366 - [ ] Admin can view any patient's records
      367 - [ ] Only one record per appointment
      368
      369 **Dependencies:** Task 15 — **Scope:** Medium
      370
      371 ---
      372
      373 #### Task 17: File attachments for medical records
      374 Add file upload to medical records (lab results, X-rays, etc). API: `POST /medical-records/:id/attachments`. Frontend: drag-and-drop file upload area, file list with download links.
      375
      376 **Acceptance criteria:**
      377 - [ ] Doctor can upload files to a medical record
      378 - [ ] Multiple file uploads supported
      379 - [ ] File type validation (pdf, jpg, png, dicom)
      380 - [ ] File size limit (10MB)
      381 - [ ] Files downloadable by patient and doctor
      382 - [ ] Drag-and-drop upload UI
      383
      384 **Dependencies:** Task 16 — **Scope:** Small
      385
      386 ---
      387
      388 #### Task 18: Prescriptions (API + Frontend)
      389 Doctors can add prescriptions to medical records with line items (medication, dosage, frequency, duration). Patients can view prescriptions.
      390
      391 **Acceptance criteria:**
      392 - [ ] Doctor can create prescription with multiple medication items
      393 - [ ] Dynamic form (add/remove medication rows)
      394 - [ ] Patient can view prescriptions linked to their records
      395 - [ ] Print-friendly prescription view
      396 - [ ] Validation on all medication fields
      397
      398 **Dependencies:** Task 16 — **Scope:** Medium
      399
      400 ---
      401
      402 ### Checkpoint: Medical Records
      403 - [ ] Post-appointment workflow: record → attachments → prescription
      404 - [ ] Patient medical history accessible
      405 - [ ] File uploads work correctly
      406 - [ ] Print-friendly views render
      407
      408 ---
      409
      410 ### Phase 6: Billing & Reviews
      411
      412 #### Task 19: Invoice management
      413 Auto-generate invoice when appointment is completed. Frontend: invoice list, invoice detail with payment simulation, overdue badge logic.
      414
      415 **Acceptance criteria:**
      416 - [ ] Invoice auto-created when appointment status → completed
      417 - [ ] Invoice shows amount, tax, total, due date
      418 - [ ] Patient can view own invoices
      419 - [ ] Patient can "pay" invoice (simulated — just changes status)
      420 - [ ] Overdue invoices flagged automatically (past due_date)
      421 - [ ] Admin can view all invoices with filters
      422
      423 **Dependencies:** Task 15 — **Scope:** Medium
      424
      425 ---
      426
      427 #### Task 20: Doctor reviews
      428 Patients can review doctors after completed appointments. Star rating + comment. Doctor profile shows reviews with average rating.
      429
      430 **Acceptance criteria:**
      431 - [ ] Patient can leave review after completed appointment
      432 - [ ] Star rating component (1-5)
      433 - [ ] Comment text area with character limit
      434 - [ ] One review per appointment
      435 - [ ] Doctor profile shows average rating and review list
      436 - [ ] Pagination on reviews
      437
      438 **Dependencies:** Task 15, Task 11 — **Scope:** Small
      439
      440 ---
      441
      442 ### Checkpoint: Billing & Reviews
      443 - [ ] Invoice lifecycle works
      444 - [ ] Review system works with ratings
      445 - [ ] Doctor profiles show reviews
      446
      447 ---
      448
      449 ### Phase 7: Notifications & Admin Dashboard
      450
      451 #### Task 21: Notification system
      452 In-app notifications for key events (appointment confirmed, status changed, new invoice). Notification bell in header with dropdown, unread count badge, notification list page.
      453
      454 **Acceptance criteria:**
      455 - [ ] Notifications created on key events (appointment status change, new invoice)
      456 - [ ] Notification bell shows unread count
      457 - [ ] Dropdown shows recent notifications
      458 - [ ] Click notification navigates to relevant page
      459 - [ ] Mark as read (individual and all)
      460 - [ ] Full notification list page with pagination
      461
      462 **Dependencies:** Task 15, Task 19 — **Scope:** Medium
      463
      464 ---
      465
      466 #### Task 22: Admin dashboard with statistics
      467 Admin dashboard page with summary cards and charts (appointments over time, department distribution, revenue trends).
      468
      469 **Acceptance criteria:**
      470 - [ ] Dashboard with stat cards (patients, doctors, appointments, revenue)
      471 - [ ] Line chart: appointments over last 30 days
      472 - [ ] Pie/bar chart: appointments by department
      473 - [ ] Revenue chart: monthly revenue trend
      474 - [ ] Admin-only access
      475 - [ ] Data fetched from `GET /admin/stats`
      476
      477 **Dependencies:** Task 19 — **Scope:** Medium
      478
      479 ---
      480
      481 ### Checkpoint: Notifications & Dashboard
      482 - [ ] Notifications work end-to-end
      483 - [ ] Admin dashboard shows meaningful charts
      484 - [ ] All roles have complete workflows
      485
      486 ---
      487
      488 ### Phase 8: Seed Data & QA-Friendly Polish
      489
      490 #### Task 23: Seed data script
      491 Comprehensive seed script with realistic test data: multiple users per role, departments, doctors with schedules, patients, appointments across all statuses, medical records, prescriptions, invoices, reviews, notifications
          .
      492
      493 **Acceptance criteria:**
      494 - [ ] `pnpm db:seed` populates database with realistic data
      495 - [ ] At least: 3 admins, 10 doctors, 30 patients, 5 departments
      496 - [ ] Appointments in all status states
      497 - [ ] Invoices in all status states
      498 - [ ] Known test credentials documented (e.g., `patient@caresync.com` / `password123`)
      499 - [ ] Seed is idempotent (can re-run safely)
      500
      501 **Dependencies:** All previous tasks — **Scope:** Medium
      502
      503 ---
      504
      505 #### Task 24: Error states, loading states, and empty states
      506 Ensure all pages handle: loading (skeleton/spinner), empty (no data message + CTA), and error (error boundary + retry). Add toast notifications for all mutations.
      507
      508 **Acceptance criteria:**
      509 - [ ] Every data-fetching page shows skeleton/loading state
      510 - [ ] Every list page shows empty state when no data
      511 - [ ] API errors show user-friendly toast messages
      512 - [ ] Success actions show confirmation toast
      513 - [ ] Global error boundary catches unhandled errors
      514 - [ ] Network error handling (offline state)
      515
      516 **Dependencies:** All previous tasks — **Scope:** Medium
      517
      518 ---
      519
      520 #### Task 25: Role-based navigation & dashboards
      521 Each role gets a tailored sidebar and dashboard. Patient: my appointments, my records, my invoices. Doctor: my schedule, my appointments, my patients. Admin: all management + stats.
      522
      523 **Acceptance criteria:**
      524 - [ ] Sidebar shows only relevant links per role
      525 - [ ] Each role has own dashboard landing page
      526 - [ ] Role-specific quick actions on dashboard
      527 - [ ] Clean redirect after login
      528
      529 **Dependencies:** Task 22, Task 8 — **Scope:** Medium
      530
      531 ---
      532
      533 #### Task 26: Final polish — accessibility, responsive, and test-friendly attributes
      534 Add `data-testid` attributes to key interactive elements (for Playwright selectors). ARIA labels on all form inputs. Basic responsive design. Meaningful page titles.
      535
      536 **Acceptance criteria:**
      537 - [ ] `data-testid` on all buttons, form inputs, navigation items, table rows
      538 - [ ] ARIA labels on all form fields
      539 - [ ] Sidebar collapses on mobile
      540 - [ ] All pages have descriptive `<title>`
      541 - [ ] Tab navigation works on forms
      542
      543 **Dependencies:** All previous tasks — **Scope:** Medium
      544
      545 ---
      546
      547 ### Checkpoint: Final
      548 - [ ] App is fully functional with seed data
      549 - [ ] All three roles have complete workflows
      550 - [ ] API docs are complete and accurate
      551 - [ ] Loading/error/empty states handled everywhere
      552 - [ ] `data-testid` attributes present for automation
      553
      554 ---
      555
      556 ## Seed Data Strategy
      557
      558 | Entity | Count | Notes |
      559 |--------|-------|-------|
      560 | Admin users | 3 | `admin@caresync.com` / `password123` |
      561 | Doctors | 10 | `doctor@caresync.com` / `password123` (spread across departments) |
      562 | Patients | 30 | `patient@caresync.com` / `password123` |
      563 | Departments | 5 | Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology |
      564 | Appointments | 50+ | All statuses represented, past and future dates |
      565 | Medical Records | 20+ | Linked to completed appointments |
      566 | Prescriptions | 15+ | With multiple medication items |
      567 | Invoices | 20+ | Mix of pending, paid, overdue |
      568 | Reviews | 15+ | Various ratings |
      569 | Notifications | 30+ | Mix of read/unread |
      570
      571 ---
      572
      573 ## Risks & Mitigations
      574
      575 | Risk | Impact | Mitigation |
      576 |------|--------|------------|
      577 | Scope creep | High | Stick to defined features. Phase 8 is the cutoff. |
      578 | Complex booking flow bugs | Medium | Build incrementally, test each step |
      579 | File upload complexity | Low | Use simple local storage, not cloud |
      580 | PostgreSQL setup friction | Medium | docker-compose makes it one command |
      581
      582 ---
      583
      584 ## QA Testing Surface
      585
      586 This app is specifically designed to give QA engineers rich, diverse testing scenarios:
      587
      588 - **Forms:** Registration, login, profile, booking wizard, medical records, prescriptions (dynamic rows), reviews
      589 - **Tables:** Paginated lists with server-side sort, filter, and search
      590 - **Auth flows:** Register, login, logout, token refresh, role-based access
      591 - **CRUD:** Full create/read/update/delete on all entities
      592 - **File upload:** Drag-and-drop with type/size validation
      593 - **Date/time:** Date pickers, time slot selection, calendar views
      594 - **Multi-step flows:** Appointment booking wizard (4 steps)
      595 - **Status machines:** Appointment lifecycle, invoice lifecycle
      596 - **Modals & dialogs:** Confirmations, forms in modals
      597 - **Toasts & notifications:** Success/error feedback, notification bell
      598 - **Charts:** Admin dashboard with recharts
      599 - **Responsive:** Mobile sidebar collapse
      600 - **API testing:** Full REST API with OpenAPI/Scalar docs
      601 - **`data-testid`:** All interactive elements labeled for automation selectors
