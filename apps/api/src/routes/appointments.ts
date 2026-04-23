import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import {
  appointments,
  patients,
  doctors,
  doctorSchedules,
  users,
  invoices,
  notifications,
} from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import { computeAvailableSlots } from "../lib/schedule-service";
import { APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from "@caresync/shared";
import type { AppEnv } from "../app";

export const appointmentsRoute = new OpenAPIHono<AppEnv>();

const errorResponse = z.object({ message: z.string() });

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const userInApptSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
});

const patientInApptSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dateOfBirth: z.string().nullable(),
  gender: z.string().nullable(),
  bloodType: z.string().nullable(),
  allergies: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  user: userInApptSchema,
});

const doctorInApptSchema = z.object({
  id: z.string(),
  userId: z.string(),
  departmentId: z.string(),
  specialization: z.string(),
  bio: z.string().nullable(),
  licenseNumber: z.string(),
  user: userInApptSchema,
});

// ─── GET /appointments ────────────────────────────────────────────────────────

const listAppointmentsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const listAppointmentItemSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  appointmentDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  type: z.string(),
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  patientName: z.string(),
  doctorName: z.string(),
  doctorSpecialization: z.string(),
});

const listAppointmentsResponse = z.object({
  data: z.array(listAppointmentItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const listAppointmentsRoute = createRoute({
  method: "get",
  path: "/appointments",
  tags: ["Appointments"],
  summary: "List appointments (role-filtered)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { query: listAppointmentsQuery },
  responses: {
    200: {
      description: "Paginated appointment list",
      content: { "application/json": { schema: listAppointmentsResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

appointmentsRoute.openapi(listAppointmentsRoute, async (c) => {
  const { page, limit, status, from, to } = c.req.valid("query");
  const userId = c.get("userId");
  const userRole = c.get("userRole");

  const patientUser = alias(users, "patient_user");
  const doctorUser = alias(users, "doctor_user");

  const conditions: SQL[] = [];
  if (userRole === "patient") conditions.push(eq(patients.userId, userId));
  if (userRole === "doctor") conditions.push(eq(doctors.userId, userId));
  if (status) conditions.push(eq(appointments.status, status));
  if (from) conditions.push(gte(appointments.appointmentDate, from));
  if (to) conditions.push(lte(appointments.appointmentDate, to));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(patientUser, eq(patients.userId, patientUser.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(doctorUser, eq(doctors.userId, doctorUser.id))
    .where(whereClause)
    .limit(1);

  const total = Number(countResult?.count ?? 0);

  const rows = await db
    .select({
      appointment: appointments,
      patientFirstName: patientUser.firstName,
      patientLastName: patientUser.lastName,
      patientUserId: patients.userId,
      doctorFirstName: doctorUser.firstName,
      doctorLastName: doctorUser.lastName,
      doctorUserId: doctors.userId,
      doctorSpecialization: doctors.specialization,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(patientUser, eq(patients.userId, patientUser.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(doctorUser, eq(doctors.userId, doctorUser.id))
    .where(whereClause)
    .orderBy(desc(appointments.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const data = rows.map((row) => ({
    ...row.appointment,
    createdAt: new Date(row.appointment.createdAt).toISOString(),
    updatedAt: new Date(row.appointment.updatedAt).toISOString(),
    patientName: `${row.patientFirstName} ${row.patientLastName}`,
    doctorName: `${row.doctorFirstName} ${row.doctorLastName}`,
    doctorSpecialization: row.doctorSpecialization,
  }));

  return c.json(
    {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    200
  );
});

// ─── GET /appointments/:id ────────────────────────────────────────────────────

const appointmentDetailResponse = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  appointmentDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  type: z.string(),
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  patient: patientInApptSchema,
  doctor: doctorInApptSchema,
});

const getAppointmentRoute = createRoute({
  method: "get",
  path: "/appointments/{id}",
  tags: ["Appointments"],
  summary: "Get appointment detail",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Appointment detail",
      content: { "application/json": { schema: appointmentDetailResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

appointmentsRoute.openapi(getAppointmentRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const userRole = c.get("userRole");

  const patientUser = alias(users, "patient_user");
  const doctorUser = alias(users, "doctor_user");

  const rows = await db
    .select({
      appointment: appointments,
      patient: patients,
      patientUser: patientUser,
      doctor: doctors,
      doctorUser: doctorUser,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(patientUser, eq(patients.userId, patientUser.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(doctorUser, eq(doctors.userId, doctorUser.id))
    .where(eq(appointments.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return c.json({ message: "Appointment not found" }, 404);

  if (userRole === "patient" && row.patient.userId !== userId) {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (userRole === "doctor" && row.doctor.userId !== userId) {
    return c.json({ message: "Forbidden" }, 403);
  }

  const {
    passwordHash: _ph1,
    createdAt: _pc,
    updatedAt: _pu,
    ...patientUserSafe
  } = row.patientUser;
  const {
    passwordHash: _ph2,
    createdAt: _dc,
    updatedAt: _du,
    ...doctorUserSafe
  } = row.doctorUser;

  return c.json(
    {
      ...row.appointment,
      createdAt: new Date(row.appointment.createdAt).toISOString(),
      updatedAt: new Date(row.appointment.updatedAt).toISOString(),
      patient: { ...row.patient, user: patientUserSafe },
      doctor: { ...row.doctor, user: doctorUserSafe },
    },
    200
  );
});

// ─── PATCH /appointments/:id/status ──────────────────────────────────────────

// Valid next statuses for each current status
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in-progress", "cancelled"],
  "in-progress": ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  "no-show": [],
};

// What statuses each role may set (regardless of current status)
const ROLE_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  patient: ["cancelled"],
  doctor: ["confirmed", "in-progress", "completed"],
  admin: ["confirmed", "in-progress", "completed", "cancelled", "no-show"],
};

const patchStatusBody = z.object({ status: z.enum(APPOINTMENT_STATUSES) });

const statusUpdateResponse = z.object({
  appointment: appointmentDetailResponse,
});

const patchStatusRoute = createRoute({
  method: "patch",
  path: "/appointments/{id}/status",
  tags: ["Appointments"],
  summary: "Update appointment status",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: patchStatusBody } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Status updated",
      content: { "application/json": { schema: statusUpdateResponse } },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: errorResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: errorResponse } },
    },
    422: {
      description: "Invalid status transition",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

appointmentsRoute.openapi(patchStatusRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { status: newStatus } = c.req.valid("json");
  const userId = c.get("userId");
  const userRole = c.get("userRole");

  const patientUser = alias(users, "patient_user");
  const doctorUser = alias(users, "doctor_user");

  // 1. Fetch appointment with ownership info
  const rows = await db
    .select({
      appointment: appointments,
      patient: patients,
      patientUser: patientUser,
      doctor: doctors,
      doctorUser: doctorUser,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(patientUser, eq(patients.userId, patientUser.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(doctorUser, eq(doctors.userId, doctorUser.id))
    .where(eq(appointments.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return c.json({ message: "Appointment not found" }, 404);

  // 2. Ownership check
  if (userRole === "patient" && row.patient.userId !== userId) {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (userRole === "doctor" && row.doctor.userId !== userId) {
    return c.json({ message: "Forbidden" }, 403);
  }

  // 3. Role-based allowed transitions
  const roleAllowed = ROLE_ALLOWED_TRANSITIONS[userRole] ?? [];
  if (!roleAllowed.includes(newStatus)) {
    return c.json({ message: "Forbidden" }, 403);
  }

  // 4. Validate transition in matrix
  const currentStatus = row.appointment.status;
  const validNext = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!validNext.includes(newStatus)) {
    return c.json(
      { message: `Invalid status transition: ${currentStatus} → ${newStatus}` },
      422
    );
  }

  // 5. Apply the update
  await db
    .update(appointments)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(appointments.id, id))
    .returning();

  // Create notification for appointment status change
  await db.insert(notifications).values({
    userId: row.patient.userId,
    title: "Appointment Status Updated",
    message: `Your appointment with Dr. ${row.doctorUser.lastName} is now ${newStatus}.`,
    type: "appointment",
    link: `/patient/appointments/${id}`,
  });

  // 5b. Auto-generate invoice when appointment is completed
  if (newStatus === "completed") {
    const [existingInvoice] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.appointmentId, id))
      .limit(1);

    if (!existingInvoice) {
      // Default fee: 150000 IDR (consultation), 80000 (follow-up), 250000 (emergency)
      const feeMap: Record<string, string> = {
        consultation: "150000.00",
        "follow-up": "80000.00",
        emergency: "250000.00",
      };
      const amount = feeMap[row.appointment.type] ?? "100000.00";
      const taxRate = 0.11; // 11% PPN
      const taxAmount = (parseFloat(amount) * taxRate).toFixed(2);
      const totalAmount = (parseFloat(amount) + parseFloat(taxAmount)).toFixed(2);

      // Due date: 7 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const dueDateStr = dueDate.toISOString().substring(0, 10);

      const [newInvoice] = await db.insert(invoices).values({
        appointmentId: id,
        patientId: row.appointment.patientId,
        amount,
        tax: taxAmount,
        total: totalAmount,
        status: "pending",
        dueDate: dueDateStr,
      }).returning();

      await db.insert(notifications).values({
        userId: row.patient.userId,
        title: "New Invoice Generated",
        message: `An invoice of Rp ${totalAmount} has been generated for your appointment.`,
        type: "invoice",
        link: `/patient/invoices/${newInvoice.id}`,
      });
    }
  }

  // 6. Re-fetch full detail
  const updatedRows = await db
    .select({
      appointment: appointments,
      patient: patients,
      patientUser: patientUser,
      doctor: doctors,
      doctorUser: doctorUser,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(patientUser, eq(patients.userId, patientUser.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(doctorUser, eq(doctors.userId, doctorUser.id))
    .where(eq(appointments.id, id))
    .limit(1);

  const updated = updatedRows[0]!;

  const {
    passwordHash: _ph1,
    createdAt: _pc,
    updatedAt: _pu,
    ...patientUserSafe
  } = updated.patientUser;
  const {
    passwordHash: _ph2,
    createdAt: _dc,
    updatedAt: _du,
    ...doctorUserSafe
  } = updated.doctorUser;

  return c.json(
    {
      appointment: {
        ...updated.appointment,
        createdAt: new Date(updated.appointment.createdAt).toISOString(),
        updatedAt: new Date(updated.appointment.updatedAt).toISOString(),
        patient: { ...updated.patient, user: patientUserSafe },
        doctor: { ...updated.doctor, user: doctorUserSafe },
      },
    },
    200
  );
});

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

// ─── POST /appointments ───────────────────────────────────────────────────────

const createAppointmentBody = z.object({
  doctorId: z.string().uuid(),
  appointmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().min(1, "startTime is required"),
  type: z.enum(APPOINTMENT_TYPES),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const appointmentResponse = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  appointmentDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  type: z.string(),
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const createAppointmentRoute = createRoute({
  method: "post",
  path: "/appointments",
  tags: ["Appointments"],
  summary: "Book an appointment (patient only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("patient")] as const,
  request: {
    body: {
      content: { "application/json": { schema: createAppointmentBody } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Appointment created",
      content: { "application/json": { schema: appointmentResponse } },
    },
    400: {
      description: "Validation error or slot not available",
      content: { "application/json": { schema: errorResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Doctor not found",
      content: { "application/json": { schema: errorResponse } },
    },
    409: {
      description: "Slot conflict — already booked",
      content: { "application/json": { schema: errorResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

appointmentsRoute.openapi(createAppointmentRoute, async (c) => {
  const { doctorId, appointmentDate, startTime, type, reason, notes } =
    c.req.valid("json");
  const userId = c.get("userId");

  // 1. Validate date is today–60 days from now (Jakarta time, UTC+7)
  const todayJakarta = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Jakarta",
  });
  // Derive max date from the Jakarta-local today so the +60 day arithmetic is
  // never skewed by a UTC/Jakarta day boundary (happens between 17:00–00:00 UTC).
  const maxDateObj = new Date(todayJakarta);
  maxDateObj.setUTCDate(maxDateObj.getUTCDate() + 60);
  const maxDateJakarta = maxDateObj.toISOString().substring(0, 10);

  if (appointmentDate < todayJakarta) {
    return c.json(
      { message: "Appointment date must be today or in the future" },
      400
    );
  }
  if (appointmentDate > maxDateJakarta) {
    return c.json(
      { message: "Appointment date must be within 60 days from today" },
      400
    );
  }

  // 2. Look up or auto-create patient record
  let [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, userId))
    .limit(1);

  if (!patient) {
    [patient] = await db.insert(patients).values({ userId }).returning();
  }

  // 3. Validate doctor exists
  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!doctor) {
    return c.json({ message: "Doctor not found" }, 404);
  }

  // 4. Validate the requested slot is currently available
  const normalizedStartTime = new Date(startTime).toISOString();
  const startDate = new Date(normalizedStartTime);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startUtcTime = `${pad(startDate.getUTCHours())}:${pad(startDate.getUTCMinutes())}`;

  // Check for an existing appointment at the same slot first (→ 409, not 400)
  const [existingAppt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.appointmentDate, appointmentDate),
        eq(appointments.startTime, startUtcTime)
      )
    )
    .limit(1);

  if (existingAppt) {
    return c.json(
      { message: "This slot was just booked — please select another" },
      409
    );
  }

  const availableSlots = await computeAvailableSlots(
    doctorId,
    appointmentDate,
    db
  );
  if (!availableSlots.includes(normalizedStartTime)) {
    return c.json({ message: "This time slot is not available" }, 400);
  }

  // 5. Compute endTime from slot duration in the doctor's schedule
  const dayIndex = new Date(`${appointmentDate}T12:00:00Z`).getUTCDay();
  const dayName = DAY_NAMES[dayIndex];

  const [scheduleRow] = await db
    .select({ slotDurationMinutes: doctorSchedules.slotDurationMinutes })
    .from(doctorSchedules)
    .where(
      and(
        eq(doctorSchedules.doctorId, doctorId),
        eq(doctorSchedules.dayOfWeek, dayName)
      )
    )
    .limit(1);

  const slotDuration = scheduleRow?.slotDurationMinutes ?? 30;
  const endDate = new Date(startDate.getTime() + slotDuration * 60 * 1000);

  const endUtcTime = `${pad(endDate.getUTCHours())}:${pad(endDate.getUTCMinutes())}`;

  // 6. Insert the appointment; catch unique slot conflict
  try {
    const [appointment] = await db
      .insert(appointments)
      .values({
        patientId: patient.id,
        doctorId,
        appointmentDate,
        startTime: startUtcTime,
        endTime: endUtcTime,
        status: "pending",
        type,
        reason: reason ?? null,
        notes: notes ?? null,
      })
      .returning();

    return c.json(appointment, 201);
  } catch (error) {
    if (error?.code === "23505") {
      return c.json(
        { message: "This slot was just booked — please select another" },
        409
      );
    }
    console.error("Failed to create appointment:", error);
    return c.json({ message: "Failed to create appointment" }, 500);
  }
});
