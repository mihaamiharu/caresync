import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { appointments, patients, doctors, doctorSchedules } from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import { computeAvailableSlots } from "../lib/schedule-service";
import { APPOINTMENT_TYPES } from "@caresync/shared";
import type { AppEnv } from "../app";

export const appointmentsRoute = new OpenAPIHono<AppEnv>();

const errorResponse = z.object({ message: z.string() });

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
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateJakarta = maxDate.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Jakarta",
  });

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
  } catch (error: any) {
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
