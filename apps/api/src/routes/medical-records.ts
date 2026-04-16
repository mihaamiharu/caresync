import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../db";
import {
  medicalRecords,
  medicalRecordAttachments,
  appointments,
  patients,
  doctors,
  users,
} from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import type { AppEnv } from "../app";

export const medicalRecordsRoute = new OpenAPIHono<AppEnv>();

medicalRecordsRoute.use("/medical-records", requireAuth);
medicalRecordsRoute.use("/medical-records/*", requireAuth);

// ─── Shared schemas ────────────────────────────────────────────────────────────

const errorResponse = z.object({ message: z.string() });

const doctorSummarySchema = z.object({
  id: z.string(),
  specialization: z.string(),
  user: z.object({
    firstName: z.string(),
    lastName: z.string(),
  }),
});

const appointmentSummarySchema = z.object({
  id: z.string(),
  appointmentDate: z.string(),
  startTime: z.string(),
  type: z.string(),
  status: z.string(),
});

const attachmentSchema = z.object({
  id: z.string(),
  medicalRecordId: z.string(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
});

const medicalRecordSchema = z.object({
  id: z.string(),
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  diagnosis: z.string(),
  symptoms: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  appointment: appointmentSummarySchema.optional(),
  doctor: doctorSummarySchema.optional(),
  attachments: z.array(attachmentSchema).optional(),
});

// ─── POST /medical-records (doctor only) ──────────────────────────────────────

const createMedicalRecordBody = z.object({
  appointmentId: z.string().uuid(),
  diagnosis: z.string().min(1).max(2000),
  symptoms: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const createMedicalRecordRoute = createRoute({
  method: "post",
  path: "/medical-records",
  tags: ["Medical Records"],
  summary: "Create a medical record (doctor only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireRole("doctor")] as const,
  request: {
    body: {
      content: { "application/json": { schema: createMedicalRecordBody } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Created medical record",
      content: { "application/json": { schema: medicalRecordSchema } },
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
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Appointment not found",
      content: { "application/json": { schema: errorResponse } },
    },
    409: {
      description: "Medical record already exists for this appointment",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

medicalRecordsRoute.openapi(createMedicalRecordRoute, async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");

  // Resolve requesting doctor
  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.userId, userId))
    .limit(1);

  if (!doctor) {
    return c.json({ message: "Doctor profile not found" }, 403);
  }

  // Fetch appointment
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, body.appointmentId))
    .limit(1);

  if (!appointment) {
    return c.json({ message: "Appointment not found" }, 404);
  }

  if (appointment.status !== "completed") {
    return c.json(
      {
        message:
          "Medical records can only be created for completed appointments",
      },
      400
    );
  }

  if (appointment.doctorId !== doctor.id) {
    return c.json(
      { message: "You can only create records for your own appointments" },
      403
    );
  }

  // Check for existing record (enforce unique constraint at application level for clear error)
  const [existing] = await db
    .select({ id: medicalRecords.id })
    .from(medicalRecords)
    .where(eq(medicalRecords.appointmentId, body.appointmentId))
    .limit(1);

  if (existing) {
    return c.json(
      { message: "A medical record already exists for this appointment" },
      409
    );
  }

  const [created] = await db
    .insert(medicalRecords)
    .values({
      appointmentId: body.appointmentId,
      patientId: appointment.patientId,
      doctorId: doctor.id,
      diagnosis: body.diagnosis,
      symptoms: body.symptoms ?? null,
      notes: body.notes ?? null,
    })
    .returning();

  return c.json(
    {
      ...created,
      createdAt: created.createdAt.toISOString(),
    },
    201
  );
});

// ─── GET /medical-records ──────────────────────────────────────────────────────

const listMedicalRecordsQuery = z.object({
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
});

const listMedicalRecordsRoute = createRoute({
  method: "get",
  path: "/medical-records",
  tags: ["Medical Records"],
  summary: "List medical records (role-filtered)",
  security: [{ bearerAuth: [] }],
  request: { query: listMedicalRecordsQuery },
  responses: {
    200: {
      description: "List of medical records",
      content: { "application/json": { schema: z.array(medicalRecordSchema) } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

medicalRecordsRoute.openapi(listMedicalRecordsRoute, async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const { patientId: queryPatientId, appointmentId: queryAppointmentId } =
    c.req.valid("query");

  let roleCondition;

  if (role === "patient") {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);

    if (!patient) return c.json([], 200);
    roleCondition = eq(medicalRecords.patientId, patient.id);
  } else if (role === "doctor") {
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) return c.json([], 200);
    roleCondition = eq(medicalRecords.doctorId, doctor.id);
  } else if (role === "admin") {
    roleCondition = queryPatientId
      ? eq(medicalRecords.patientId, queryPatientId)
      : undefined;
  } else {
    return c.json({ message: "Insufficient permissions" }, 403);
  }

  const whereCondition = queryAppointmentId
    ? roleCondition
      ? and(roleCondition, eq(medicalRecords.appointmentId, queryAppointmentId))
      : eq(medicalRecords.appointmentId, queryAppointmentId)
    : roleCondition;

  const rows = await db
    .select({
      id: medicalRecords.id,
      appointmentId: medicalRecords.appointmentId,
      patientId: medicalRecords.patientId,
      doctorId: medicalRecords.doctorId,
      diagnosis: medicalRecords.diagnosis,
      symptoms: medicalRecords.symptoms,
      notes: medicalRecords.notes,
      createdAt: medicalRecords.createdAt,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      appointmentType: appointments.type,
      appointmentStatus: appointments.status,
      doctorSpecialization: doctors.specialization,
      doctorFirstName: users.firstName,
      doctorLastName: users.lastName,
    })
    .from(medicalRecords)
    .innerJoin(appointments, eq(appointments.id, medicalRecords.appointmentId))
    .innerJoin(doctors, eq(doctors.id, medicalRecords.doctorId))
    .innerJoin(users, eq(users.id, doctors.userId))
    .where(whereCondition)
    .orderBy(desc(medicalRecords.createdAt));

  return c.json(
    rows.map((r) => ({
      id: r.id,
      appointmentId: r.appointmentId,
      patientId: r.patientId,
      doctorId: r.doctorId,
      diagnosis: r.diagnosis,
      symptoms: r.symptoms,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      appointment: {
        id: r.appointmentId,
        appointmentDate: r.appointmentDate,
        startTime: r.startTime,
        type: r.appointmentType,
        status: r.appointmentStatus,
      },
      doctor: {
        id: r.doctorId,
        specialization: r.doctorSpecialization,
        user: {
          firstName: r.doctorFirstName,
          lastName: r.doctorLastName,
        },
      },
    })),
    200
  );
});

// ─── GET /medical-records/:id ─────────────────────────────────────────────────

const getMedicalRecordRoute = createRoute({
  method: "get",
  path: "/medical-records/{id}",
  tags: ["Medical Records"],
  summary: "Get a medical record by ID (ownership enforced)",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Medical record",
      content: { "application/json": { schema: medicalRecordSchema } },
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
      description: "Medical record not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

medicalRecordsRoute.openapi(getMedicalRecordRoute, async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const { id } = c.req.valid("param");

  const [row] = await db
    .select({
      id: medicalRecords.id,
      appointmentId: medicalRecords.appointmentId,
      patientId: medicalRecords.patientId,
      doctorId: medicalRecords.doctorId,
      diagnosis: medicalRecords.diagnosis,
      symptoms: medicalRecords.symptoms,
      notes: medicalRecords.notes,
      createdAt: medicalRecords.createdAt,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      appointmentType: appointments.type,
      appointmentStatus: appointments.status,
      doctorSpecialization: doctors.specialization,
      doctorFirstName: users.firstName,
      doctorLastName: users.lastName,
    })
    .from(medicalRecords)
    .innerJoin(appointments, eq(appointments.id, medicalRecords.appointmentId))
    .innerJoin(doctors, eq(doctors.id, medicalRecords.doctorId))
    .innerJoin(users, eq(users.id, doctors.userId))
    .where(eq(medicalRecords.id, id))
    .limit(1);

  if (!row) {
    return c.json({ message: "Medical record not found" }, 404);
  }

  // Ownership check
  if (role === "patient") {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);

    if (!patient || patient.id !== row.patientId) {
      return c.json({ message: "Forbidden" }, 403);
    }
  } else if (role === "doctor") {
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor || doctor.id !== row.doctorId) {
      return c.json({ message: "Forbidden" }, 403);
    }
  }
  // admin: no ownership check

  const attachments = await db
    .select()
    .from(medicalRecordAttachments)
    .where(eq(medicalRecordAttachments.medicalRecordId, row.id));

  return c.json(
    {
      id: row.id,
      appointmentId: row.appointmentId,
      patientId: row.patientId,
      doctorId: row.doctorId,
      diagnosis: row.diagnosis,
      symptoms: row.symptoms,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      appointment: {
        id: row.appointmentId,
        appointmentDate: row.appointmentDate,
        startTime: row.startTime,
        type: row.appointmentType,
        status: row.appointmentStatus,
      },
      doctor: {
        id: row.doctorId,
        specialization: row.doctorSpecialization,
        user: {
          firstName: row.doctorFirstName,
          lastName: row.doctorLastName,
        },
      },
      attachments,
    },
    200
  );
});

// ─── POST /medical-records/:id/attachments (doctor only) ──────────────────────

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const uploadAttachmentRoute = createRoute({
  method: "post",
  path: "/medical-records/{id}/attachments",
  tags: ["Medical Records"],
  summary: "Upload a file attachment to a medical record (doctor only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireRole("doctor")] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    201: {
      description: "Uploaded attachment",
      content: { "application/json": { schema: attachmentSchema } },
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
      description: "Medical record not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

medicalRecordsRoute.openapi(uploadAttachmentRoute, async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.valid("param");

  // Resolve doctor
  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.userId, userId))
    .limit(1);

  if (!doctor) {
    return c.json({ message: "Doctor profile not found" }, 403);
  }

  // Fetch record
  const [record] = await db
    .select({ id: medicalRecords.id, doctorId: medicalRecords.doctorId })
    .from(medicalRecords)
    .where(eq(medicalRecords.id, id))
    .limit(1);

  if (!record) {
    return c.json({ message: "Medical record not found" }, 404);
  }

  // Ownership check
  if (record.doctorId !== doctor.id) {
    return c.json({ message: "Forbidden" }, 403);
  }

  // Parse file
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || typeof file === "string") {
    return c.json({ message: "No file provided" }, 400);
  }

  const f = file as File;

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(f.type)) {
    return c.json(
      { message: "Invalid file type. Allowed: pdf, jpg, png" },
      400
    );
  }

  // Validate size
  if (f.size > MAX_FILE_SIZE) {
    return c.json({ message: "File too large. Maximum size is 10MB" }, 400);
  }

  // Write to disk
  const ext = f.name.split(".").pop() ?? "bin";
  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "uploads", "medical-records");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await f.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const fileUrl = `/uploads/medical-records/${filename}`;

  // Insert DB row
  const [attachment] = await db
    .insert(medicalRecordAttachments)
    .values({
      medicalRecordId: record.id,
      fileName: f.name,
      fileUrl,
      fileType: f.type,
      fileSize: f.size,
    })
    .returning();

  return c.json(attachment, 201);
});
