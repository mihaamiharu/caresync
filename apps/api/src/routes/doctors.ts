import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  eq,
  ilike,
  or,
  sql,
  and,
  asc,
  inArray,
  avg,
  count,
  desc,
} from "drizzle-orm";
import { db } from "../db";
import {
  users,
  doctors,
  departments,
  appointments,
  medicalRecords,
  doctorSchedules,
  reviews,
  patients,
} from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword } from "../lib/password";
import { computeAvailableSlots } from "../lib/schedule-service";
import type { AppEnv } from "../app";

export const doctorsRoute = new OpenAPIHono<AppEnv>();

// ─── Shared schemas ────────────────────────────────────────────────────────────

const userResponse = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

const departmentResponse = z.object({
  id: z.string(),
  name: z.string(),
});

const doctorResponse = z.object({
  id: z.string(),
  userId: z.string(),
  departmentId: z.string(),
  specialization: z.string(),
  bio: z.string().nullable(),
  licenseNumber: z.string(),
  user: userResponse.optional(),
  department: departmentResponse.optional(),
  averageRating: z.number().nullable().optional(),
  reviewCount: z.number().nullable().optional(),
});

const errorResponse = z.object({ message: z.string() });

// ─── GET /doctors ─────────────────────────────────────────────────────────────

const listDoctorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ example: 20 }),
  search: z.string().optional().openapi({ example: "smith" }),
  departmentId: z.string().optional().openapi({ example: "uuid" }),
});

const paginatedDoctorsResponse = z.object({
  data: z.array(doctorResponse),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const listDoctorsRoute = createRoute({
  method: "get",
  path: "/doctors",
  tags: ["Doctors"],
  summary: "List all doctors",
  request: { query: listDoctorsQuerySchema },
  responses: {
    200: {
      description: "Paginated doctor list",
      content: { "application/json": { schema: paginatedDoctorsResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

doctorsRoute.openapi(listDoctorsRoute, async (c) => {
  const { page, limit, search, departmentId } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const conditions = [];
  // Filter for active users only by default
  conditions.push(eq(users.isActive, true));

  if (departmentId) {
    conditions.push(eq(doctors.departmentId, departmentId));
  }
  if (search) {
    conditions.push(
      or(
        ilike(users.firstName, `%${search}%`),
        ilike(users.lastName, `%${search}%`),
        ilike(doctors.specialization, `%${search}%`)
      )
    );
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(whereCondition);

  const rows = await db
    .select({
      id: doctors.id,
      userId: doctors.userId,
      departmentId: doctors.departmentId,
      specialization: doctors.specialization,
      bio: doctors.bio,
      licenseNumber: doctors.licenseNumber,
      user: {
        id: users.id,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
      },
      department: {
        id: departments.id,
        name: departments.name,
      },
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .innerJoin(departments, eq(doctors.departmentId, departments.id))
    .where(whereCondition)
    .orderBy(asc(users.lastName))
    .offset(offset)
    .limit(limit);

  return c.json(
    {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    200
  );
});

// ─── GET /doctors/:id ──────────────────────────────────────────────────────────

const getDoctorRoute = createRoute({
  method: "get",
  path: "/doctors/{id}",
  tags: ["Doctors"],
  summary: "Get a doctor by ID",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Doctor details",
      content: { "application/json": { schema: doctorResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Doctor not found",
      content: { "application/json": { schema: errorResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

doctorsRoute.openapi(getDoctorRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [doctor] = await db
    .select({
      id: doctors.id,
      userId: doctors.userId,
      departmentId: doctors.departmentId,
      specialization: doctors.specialization,
      bio: doctors.bio,
      licenseNumber: doctors.licenseNumber,
      user: {
        id: users.id,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
      },
      department: {
        id: departments.id,
        name: departments.name,
      },
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .innerJoin(departments, eq(doctors.departmentId, departments.id))
    .where(eq(doctors.id, id))
    .limit(1);

  if (!doctor) {
    return c.json({ message: "Doctor not found" }, 404);
  }

  const [stats] = await db
    .select({
      averageRating: sql<number | null>`avg(rating)::float`,
      reviewCount: count(reviews.id),
    })
    .from(reviews)
    .where(eq(reviews.doctorId, id));

  return c.json(
    {
      ...doctor,
      averageRating: stats?.averageRating ?? null,
      reviewCount: Number(stats?.reviewCount) ?? 0,
    },
    200
  );
});

// ─── GET /doctors/:id/reviews ────────────────────────────────────────────────

const getDoctorReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(5)
    .openapi({ example: 5 }),
});

const doctorReviewItem = z.object({
  id: z.string(),
  appointmentId: z.string(),
  doctorId: z.string(),
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
  patientFirstName: z.string(),
  patientLastName: z.string(),
});

const paginatedDoctorReviewsResponse = z.object({
  data: z.array(doctorReviewItem),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const getDoctorReviewsRoute = createRoute({
  method: "get",
  path: "/doctors/{id}/reviews",
  tags: ["Doctors"],
  summary: "Get paginated reviews for a doctor",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: z.object({ id: z.string() }),
    query: getDoctorReviewsQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated doctor reviews",
      content: {
        "application/json": { schema: paginatedDoctorReviewsResponse },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

doctorsRoute.openapi(getDoctorReviewsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const [countRow] = await db
    .select({ count: count(reviews.id) })
    .from(reviews)
    .where(eq(reviews.doctorId, id));

  const total = countRow?.count ?? 0;

  const rows = await db
    .select({
      id: reviews.id,
      appointmentId: reviews.appointmentId,
      doctorId: reviews.doctorId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      patientFirstName: users.firstName,
      patientLastName: users.lastName,
    })
    .from(reviews)
    .innerJoin(patients, eq(reviews.patientId, patients.id))
    .innerJoin(users, eq(patients.userId, users.id))
    .where(eq(reviews.doctorId, id))
    .orderBy(desc(reviews.createdAt))
    .offset(offset)
    .limit(limit);

  return c.json(
    {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    200
  );
});

// ─── POST /doctors (admin) ───────────────────────────────────────────────────

const createDoctorBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().nullable().optional(),
  departmentId: z.string().uuid(),
  specialization: z.string().min(1),
  bio: z.string().nullable().optional(),
  licenseNumber: z.string().min(1),
});

const createDoctorRoute = createRoute({
  method: "post",
  path: "/doctors",
  tags: ["Doctors"],
  summary: "Create a new doctor (admin only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("admin")] as const,
  request: {
    body: {
      content: { "application/json": { schema: createDoctorBody } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Doctor created",
      content: { "application/json": { schema: doctorResponse } },
    },
    400: {
      description: "Validation error or email/license already exists",
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
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

doctorsRoute.openapi(createDoctorRoute, async (c) => {
  const body = c.req.valid("json");

  // Check if email already exists
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (existingUser) {
    return c.json({ message: "Email already exists" }, 400);
  }

  // Check if license number already exists
  const [existingDoctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.licenseNumber, body.licenseNumber))
    .limit(1);

  if (existingDoctor) {
    return c.json({ message: "License number already exists" }, 400);
  }

  const passwordHash = await hashPassword(body.password);

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: body.email,
          passwordHash,
          role: "doctor",
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone ?? null,
        })
        .returning();

      const [doctor] = await tx
        .insert(doctors)
        .values({
          userId: user.id,
          departmentId: body.departmentId,
          specialization: body.specialization,
          bio: body.bio ?? null,
          licenseNumber: body.licenseNumber,
        })
        .returning();

      const [department] = await tx
        .select()
        .from(departments)
        .where(eq(departments.id, body.departmentId))
        .limit(1);

      return { ...doctor, user, department };
    });

    return c.json(result, 201);
  } catch (error) {
    console.error("Failed to create doctor:", error);
    return c.json({ message: "Failed to create doctor" }, 500);
  }
});

// ─── PUT /doctors/:id (admin or doctor themselves) ───────────────────────────

const updateDoctorBody = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  specialization: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
  departmentId: z.string().uuid().optional(),
});

const updateDoctorRoute = createRoute({
  method: "put",
  path: "/doctors/{id}",
  tags: ["Doctors"],
  summary: "Update doctor profile",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: updateDoctorBody } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Doctor updated",
      content: { "application/json": { schema: doctorResponse } },
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
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

doctorsRoute.openapi(updateDoctorRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const authUserId = c.get("userId");
  const authUserRole = c.get("userRole");

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!doctor) {
    return c.json({ message: "Doctor not found" }, 404);
  }

  // Check permissions: admin or the doctor themselves
  if (authUserRole !== "admin" && authUserId !== doctor.userId) {
    return c.json({ message: "Insufficient permissions" }, 403);
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Update user info if provided
      if (body.firstName || body.lastName || body.phone !== undefined) {
        await tx
          .update(users)
          .set({
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone ?? null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, doctor.userId));
      }

      // Update doctor info
      const updateData: Partial<typeof doctors.$inferInsert> = {};
      if (body.bio !== undefined) updateData.bio = body.bio;

      // Only admins can change department or specialization
      if (authUserRole === "admin") {
        if (body.specialization)
          updateData.specialization = body.specialization;
        if (body.departmentId) updateData.departmentId = body.departmentId;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.update(doctors).set(updateData).where(eq(doctors.id, id));
      }

      // Fetch full updated doctor with user and department
      const [fullDoctor] = await tx
        .select({
          id: doctors.id,
          userId: doctors.userId,
          departmentId: doctors.departmentId,
          specialization: doctors.specialization,
          bio: doctors.bio,
          licenseNumber: doctors.licenseNumber,
          user: {
            id: users.id,
            email: users.email,
            role: users.role,
            firstName: users.firstName,
            lastName: users.lastName,
            phone: users.phone,
            avatarUrl: users.avatarUrl,
          },
          department: {
            id: departments.id,
            name: departments.name,
          },
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .innerJoin(departments, eq(doctors.departmentId, departments.id))
        .where(eq(doctors.id, id))
        .limit(1);

      return fullDoctor;
    });

    return c.json(result, 200);
  } catch (error) {
    console.error("Failed to update doctor:", error);
    return c.json({ message: "Failed to update doctor" }, 500);
  }
});

// ─── DELETE /doctors/:id (admin only) ────────────────────────────────────────

const deleteDoctorRoute = createRoute({
  method: "delete",
  path: "/doctors/{id}",
  tags: ["Doctors"],
  summary: "Delete a doctor profile and associated user (admin only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("admin")] as const,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Doctor deleted",
      content: {
        "application/json": { schema: z.object({ message: z.string() }) },
      },
    },
    400: {
      description: "Bad request (e.g. has active records)",
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
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

doctorsRoute.openapi(deleteDoctorRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!doctor) {
    return c.json({ message: "Doctor not found" }, 404);
  }

  // Check for active records (appointments or medical records)
  const [existingAppointment] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.doctorId, id))
    .limit(1);

  if (existingAppointment) {
    return c.json(
      {
        message:
          "Cannot delete doctor with existing appointments. Deactivate them instead.",
      },
      400
    );
  }

  const [existingRecord] = await db
    .select({ id: medicalRecords.id })
    .from(medicalRecords)
    .where(eq(medicalRecords.doctorId, id))
    .limit(1);

  if (existingRecord) {
    return c.json(
      {
        message:
          "Cannot delete doctor with medical records. Deactivate them instead.",
      },
      400
    );
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(doctors).where(eq(doctors.id, id));
      await tx.delete(users).where(eq(users.id, doctor.userId));
    });

    return c.json({ message: "Doctor deleted successfully" }, 200);
  } catch (error) {
    console.error("Failed to delete doctor:", error);
    return c.json({ message: "Failed to delete doctor" }, 500);
  }
});

// ─── GET /doctors/:id/schedules ───────────────────────────────────────────────

const scheduleRowResponse = z.object({
  id: z.string(),
  doctorId: z.string(),
  dayOfWeek: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  slotDurationMinutes: z.number(),
});

const getScheduleRoute = createRoute({
  method: "get",
  path: "/doctors/{id}/schedules",
  tags: ["Doctors"],
  summary: "Get doctor weekly schedule",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Doctor schedule",
      content: { "application/json": { schema: z.array(scheduleRowResponse) } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Doctor not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

doctorsRoute.openapi(getScheduleRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!doctor) {
    return c.json({ message: "Doctor not found" }, 404);
  }

  const schedule = await db
    .select()
    .from(doctorSchedules)
    .where(eq(doctorSchedules.doctorId, id));

  return c.json(schedule, 200);
});

// ─── PUT /doctors/:id/schedules ───────────────────────────────────────────────

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const putScheduleBody = z.object({
  slotDurationMinutes: z.number().int().min(5).max(120),
  days: z
    .array(
      z.object({
        dayOfWeek: z.enum([
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ]),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .max(7),
});

const putScheduleRoute = createRoute({
  method: "put",
  path: "/doctors/{id}/schedules",
  tags: ["Doctors"],
  summary: "Replace doctor weekly schedule (doctor only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: putScheduleBody } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated schedule",
      content: { "application/json": { schema: z.array(scheduleRowResponse) } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Not the owning doctor",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Doctor not found",
      content: { "application/json": { schema: errorResponse } },
    },
    409: {
      description: "Conflicts with existing confirmed appointments",
      content: { "application/json": { schema: errorResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

doctorsRoute.openapi(putScheduleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const authUserId = c.get("userId");

  // 1. Find doctor
  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!doctor) {
    return c.json({ message: "Doctor not found" }, 404);
  }

  // 2. Only the owning doctor may update their schedule
  if (authUserId !== doctor.userId) {
    return c.json({ message: "Insufficient permissions" }, 403);
  }

  // 3. Conflict check — fetch all future confirmed/in-progress appointments
  const futureAppts = await db
    .select({
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      appointmentDate: appointments.appointmentDate,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, id),
        inArray(appointments.status, ["confirmed", "in-progress"]),
        sql`${appointments.appointmentDate} >= CURRENT_DATE`
      )
    );

  const newScheduleMap = new Map(body.days.map((d) => [d.dayOfWeek, d]));

  const normalizeTime = (t: string) => t.substring(0, 5); // "09:00:00" → "09:00"

  for (const appt of futureAppts) {
    const dayName = DAY_NAMES[new Date(appt.appointmentDate).getUTCDay()];
    const newDay = newScheduleMap.get(dayName);

    if (
      !newDay ||
      normalizeTime(appt.startTime) < newDay.startTime ||
      normalizeTime(appt.endTime) > newDay.endTime
    ) {
      return c.json(
        {
          message:
            "Schedule update would conflict with existing confirmed appointments",
        },
        409
      );
    }
  }

  // 4. Full replace in transaction
  try {
    const newSchedule = await db.transaction(async (tx) => {
      await tx.delete(doctorSchedules).where(eq(doctorSchedules.doctorId, id));

      if (body.days.length > 0) {
        await tx
          .insert(doctorSchedules)
          .values(
            body.days.map((day) => ({
              doctorId: id,
              dayOfWeek: day.dayOfWeek,
              startTime: day.startTime,
              endTime: day.endTime,
              slotDurationMinutes: body.slotDurationMinutes,
            }))
          )
          .returning();
      }

      return await tx
        .select()
        .from(doctorSchedules)
        .where(eq(doctorSchedules.doctorId, id));
    });

    return c.json(newSchedule, 200);
  } catch (error) {
    console.error("Failed to update schedule:", error);
    return c.json({ message: "Failed to update schedule" }, 500);
  }
});

// ─── GET /doctors/:id/available-slots ────────────────────────────────────────

const getAvailableSlotsQuery = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .openapi({ example: "2026-05-04" }),
});

const getAvailableSlotsRoute = createRoute({
  method: "get",
  path: "/doctors/{id}/available-slots",
  tags: ["Doctors"],
  summary: "Get available booking slots for a doctor on a given date",
  request: {
    params: z.object({ id: z.string() }),
    query: getAvailableSlotsQuery,
  },
  responses: {
    200: {
      description: "Array of available slot ISO UTC datetimes",
      content: { "application/json": { schema: z.array(z.string()) } },
    },
    400: {
      description: "Invalid date format",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Doctor not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

doctorsRoute.openapi(getAvailableSlotsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { date } = c.req.valid("query");

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!doctor) {
    return c.json({ message: "Doctor not found" }, 404);
  }

  const slots = await computeAvailableSlots(id, date, db);

  return c.json(slots, 200);
});
