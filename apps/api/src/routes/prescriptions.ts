import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  prescriptions,
  prescriptionItems,
  medicalRecords,
  appointments,
  patients,
  doctors,
  users,
} from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import type { AppEnv } from "../app";

export const prescriptionsRoute = new OpenAPIHono<AppEnv>();

prescriptionsRoute.use("/prescriptions", requireAuth);
prescriptionsRoute.use("/prescriptions/*", requireAuth);

// ─── Shared schemas ────────────────────────────────────────────────────────────

const errorResponse = z.object({ message: z.string() });

const prescriptionItemSchema = z.object({
  id: z.string().uuid(),
  prescriptionId: z.string().uuid(),
  medicationName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string().nullable(),
});

const prescriptionResponseSchema = z.object({
  id: z.string().uuid(),
  medicalRecordId: z.string().uuid(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(prescriptionItemSchema),
  medicalRecord: z
    .object({
      id: z.string().uuid(),
      diagnosis: z.string(),
      appointmentDate: z.string(),
      type: z.string(),
      status: z.string(),
    })
    .optional(),
});

const createPrescriptionBody = z.object({
  medicalRecordId: z.string().uuid("Invalid medical record ID"),
  notes: z.string().max(2000).optional().nullable(),
  items: z
    .array(
      z.object({
        medicationName: z.string().min(1).max(200),
        dosage: z.string().min(1).max(100),
        frequency: z.string().min(1).max(100),
        duration: z.string().min(1).max(100),
        instructions: z.string().max(500).optional().nullable(),
      })
    )
    .min(1, "At least one medication item is required"),
});

const updatePrescriptionBody = z.object({
  notes: z.string().max(2000).optional().nullable(),
  items: z
    .array(
      z.object({
        medicationName: z.string().min(1).max(200),
        dosage: z.string().min(1).max(100),
        frequency: z.string().min(1).max(100),
        duration: z.string().min(1).max(100),
        instructions: z.string().max(500).optional().nullable(),
      })
    )
    .min(1, "At least one medication item is required"),
});

const listPrescriptionsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  medicalRecordId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
});

// ─── GET /prescriptions ──────────────────────────────────────────────────────

const listPrescriptionsRoute = createRoute({
  method: "get",
  path: "/prescriptions",
  tags: ["Prescriptions"],
  summary: "List prescriptions (role-filtered)",
  security: [{ bearerAuth: [] }],
  request: { query: listPrescriptionsQuery },
  responses: {
    200: {
      description: "Paginated list of prescriptions",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(prescriptionResponseSchema),
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            totalPages: z.number(),
          }),
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

prescriptionsRoute.openapi(listPrescriptionsRoute, async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const { page, limit, medicalRecordId, patientId, doctorId } =
    c.req.valid("query");

  const offset = (page - 1) * limit;

  let resolvedPatientId: string | undefined;
  let resolvedDoctorId: string | undefined;

  if (role === "patient") {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    if (!patient) {
      return c.json({ data: [], total: 0, page, limit, totalPages: 0 }, 200);
    }
    resolvedPatientId = patient.id;
  } else if (role === "doctor") {
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);
    if (!doctor) {
      return c.json({ data: [], total: 0, page, limit, totalPages: 0 }, 200);
    }
    resolvedDoctorId = doctor.id;
  } else if (role !== "admin") {
    return c.json({ message: "Insufficient permissions" }, 403);
  }

  // Build base conditions from role + explicit filters
  const conditions = [];

  if (resolvedPatientId) {
    conditions.push(eq(medicalRecords.patientId, resolvedPatientId));
  }
  if (resolvedDoctorId) {
    conditions.push(eq(medicalRecords.doctorId, resolvedDoctorId));
  }
  if (medicalRecordId) {
    conditions.push(eq(prescriptions.medicalRecordId, medicalRecordId));
  }
  if (patientId) {
    if (role === "patient" && patientId !== resolvedPatientId) {
      return c.json({ message: "Forbidden" }, 403);
    }
    conditions.push(eq(medicalRecords.patientId, patientId));
  }
  if (doctorId) {
    if (role === "doctor" && doctorId !== resolvedDoctorId) {
      return c.json({ message: "Forbidden" }, 403);
    }
    conditions.push(eq(medicalRecords.doctorId, doctorId));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(prescriptions)
    .innerJoin(
      medicalRecords,
      eq(medicalRecords.id, prescriptions.medicalRecordId)
    )
    .innerJoin(appointments, eq(appointments.id, medicalRecords.appointmentId))
    .where(whereCondition);

  // Main query — fetch limited rows
  const rows = await db
    .select({
      id: prescriptions.id,
      medicalRecordId: prescriptions.medicalRecordId,
      notes: prescriptions.notes,
      createdAt: prescriptions.createdAt,
    })
    .from(prescriptions)
    .innerJoin(
      medicalRecords,
      eq(medicalRecords.id, prescriptions.medicalRecordId)
    )
    .innerJoin(appointments, eq(appointments.id, medicalRecords.appointmentId))
    .where(whereCondition)
    .orderBy(desc(prescriptions.createdAt))
    .offset(offset)
    .limit(limit);

  // Fetch items for all prescriptions in one query
  const prescriptionIds = rows.map((r) => r.id);
  let itemsMap: Record<
    string,
    {
      id: string;
      prescriptionId: string;
      medicationName: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string | null;
    }[]
  > = {};

  if (prescriptionIds.length > 0) {
    const allItems = await db
      .select()
      .from(prescriptionItems)
      .where(inArray(prescriptionItems.prescriptionId, prescriptionIds));

    for (const item of allItems) {
      if (!itemsMap[item.prescriptionId]) {
        itemsMap[item.prescriptionId] = [];
      }
      itemsMap[item.prescriptionId].push(item);
    }
  }

  const data = rows.map((r) => ({
    id: r.id,
    medicalRecordId: r.medicalRecordId,
    notes: r.notes,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
    items: (itemsMap[r.id] || []).map((item) => ({
      id: item.id,
      prescriptionId: item.prescriptionId,
      medicationName: item.medicationName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    })),
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

// ─── GET /prescriptions/:id ──────────────────────────────────────────────────

const getPrescriptionRoute = createRoute({
  method: "get",
  path: "/prescriptions/{id}",
  tags: ["Prescriptions"],
  summary: "Get a prescription by ID (ownership enforced)",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Prescription with items and embedded medical record",
      content: {
        "application/json": { schema: prescriptionResponseSchema },
      },
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
      description: "Prescription not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

prescriptionsRoute.openapi(getPrescriptionRoute, async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const { id } = c.req.valid("param");

  // Fetch prescription with medical record and appointment
  const [row] = await db
    .select({
      id: prescriptions.id,
      medicalRecordId: prescriptions.medicalRecordId,
      notes: prescriptions.notes,
      createdAt: prescriptions.createdAt,
      mrDiagnosis: medicalRecords.diagnosis,
      mrPatientId: medicalRecords.patientId,
      mrDoctorId: medicalRecords.doctorId,
      appointmentDate: appointments.appointmentDate,
      appointmentType: appointments.type,
      appointmentStatus: appointments.status,
    })
    .from(prescriptions)
    .innerJoin(
      medicalRecords,
      eq(medicalRecords.id, prescriptions.medicalRecordId)
    )
    .innerJoin(appointments, eq(appointments.id, medicalRecords.appointmentId))
    .where(eq(prescriptions.id, id))
    .limit(1);

  if (!row) {
    return c.json({ message: "Prescription not found" }, 404);
  }

  // Ownership check
  if (role === "patient") {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    if (!patient || patient.id !== row.mrPatientId) {
      return c.json({ message: "Forbidden" }, 403);
    }
  } else if (role === "doctor") {
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);
    if (!doctor || doctor.id !== row.mrDoctorId) {
      return c.json({ message: "Forbidden" }, 403);
    }
  }
  // admin: no ownership check

  // Fetch items
  const items = await db
    .select()
    .from(prescriptionItems)
    .where(eq(prescriptionItems.prescriptionId, id));

  return c.json(
    {
      id: row.id,
      medicalRecordId: row.medicalRecordId,
      notes: row.notes,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
      items: items.map((item) => ({
        id: item.id,
        prescriptionId: item.prescriptionId,
        medicationName: item.medicationName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
      })),
      medicalRecord: {
        id: row.medicalRecordId,
        diagnosis: row.mrDiagnosis,
        appointmentDate: row.appointmentDate,
        type: row.appointmentType,
        status: row.appointmentStatus,
      },
    },
    200
  );
});

// ─── POST /prescriptions ─────────────────────────────────────────────────────

const createPrescriptionRoute = createRoute({
  method: "post",
  path: "/prescriptions",
  tags: ["Prescriptions"],
  summary: "Create a prescription (doctor only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireRole("doctor")] as const,
  request: {
    body: {
      content: { "application/json": { schema: createPrescriptionBody } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Created prescription with items",
      content: {
        "application/json": { schema: prescriptionResponseSchema },
      },
    },
    400: {
      description: "Validation error or appointment not eligible",
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
    409: {
      description: "Prescription already exists for this medical record",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

prescriptionsRoute.openapi(createPrescriptionRoute, async (c) => {
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

  // Fetch medical record
  const [record] = await db
    .select({
      id: medicalRecords.id,
      doctorId: medicalRecords.doctorId,
      appointmentId: medicalRecords.appointmentId,
    })
    .from(medicalRecords)
    .where(eq(medicalRecords.id, body.medicalRecordId))
    .limit(1);

  if (!record) {
    return c.json({ message: "Medical record not found" }, 404);
  }

  // Check doctor owns this record
  if (record.doctorId !== doctor.id) {
    return c.json({ message: "Forbidden" }, 403);
  }

  // Check appointment status is eligible
  const [appointment] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.id, record.appointmentId))
    .limit(1);

  if (!appointment) {
    return c.json({ message: "Appointment not found" }, 400);
  }

  const eligibleStatuses = ["confirmed", "in-progress", "completed"];
  if (!eligibleStatuses.includes(appointment.status)) {
    return c.json(
      {
        message:
          "Appointment is not eligible for prescription creation (must be confirmed, in-progress, or completed)",
      },
      400
    );
  }

  // Check no existing prescription for this medical record
  const [existing] = await db
    .select({ id: prescriptions.id })
    .from(prescriptions)
    .where(eq(prescriptions.medicalRecordId, body.medicalRecordId))
    .limit(1);

  if (existing) {
    return c.json(
      {
        message: "A prescription already exists for this medical record",
      },
      409
    );
  }

  // Create prescription + items atomically
  const [created] = await db
    .insert(prescriptions)
    .values({
      medicalRecordId: body.medicalRecordId,
      notes: body.notes ?? null,
    })
    .returning();

  const insertedItems = await db
    .insert(prescriptionItems)
    .values(
      body.items.map((item) => ({
        prescriptionId: created.id,
        medicationName: item.medicationName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions ?? null,
      }))
    )
    .returning();

  // Fetch medical record for response
  const [mr] = await db
    .select({
      id: medicalRecords.id,
      diagnosis: medicalRecords.diagnosis,
      appointmentDate: appointments.appointmentDate,
      appointmentType: appointments.type,
      appointmentStatus: appointments.status,
    })
    .from(medicalRecords)
    .innerJoin(appointments, eq(appointments.id, medicalRecords.appointmentId))
    .where(eq(medicalRecords.id, body.medicalRecordId))
    .limit(1);

  return c.json(
    {
      id: created.id,
      medicalRecordId: created.medicalRecordId,
      notes: created.notes,
      createdAt:
        created.createdAt instanceof Date
          ? created.createdAt.toISOString()
          : String(created.createdAt),
      items: insertedItems.map((item) => ({
        id: item.id,
        prescriptionId: item.prescriptionId,
        medicationName: item.medicationName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
      })),
      medicalRecord: mr
        ? {
            id: mr.id,
            diagnosis: mr.diagnosis,
            appointmentDate: mr.appointmentDate,
            type: mr.appointmentType,
            status: mr.appointmentStatus,
          }
        : undefined,
    },
    201
  );
});

// ─── PUT /prescriptions/:id ─────────────────────────────────────────────────

const updatePrescriptionRoute = createRoute({
  method: "put",
  path: "/prescriptions/{id}",
  tags: ["Prescriptions"],
  summary: "Update a prescription (doctor only, full replacement)",
  security: [{ bearerAuth: [] }],
  middleware: [requireRole("doctor")] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: updatePrescriptionBody } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated prescription with items",
      content: {
        "application/json": { schema: prescriptionResponseSchema },
      },
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
      description: "Prescription not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

prescriptionsRoute.openapi(updatePrescriptionRoute, async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.valid("param");
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

  // Fetch existing prescription
  const [existing] = await db
    .select({
      id: prescriptions.id,
      medicalRecordId: prescriptions.medicalRecordId,
    })
    .from(prescriptions)
    .where(eq(prescriptions.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ message: "Prescription not found" }, 404);
  }

  // Get medical record to check doctor ownership
  const [record] = await db
    .select({ id: medicalRecords.id, doctorId: medicalRecords.doctorId })
    .from(medicalRecords)
    .where(eq(medicalRecords.id, existing.medicalRecordId))
    .limit(1);

  if (!record || record.doctorId !== doctor.id) {
    return c.json({ message: "Forbidden" }, 403);
  }

  // Update notes
  await db
    .update(prescriptions)
    .set({ notes: body.notes ?? null })
    .where(eq(prescriptions.id, id));

  // Delete existing items and insert new ones
  await db
    .delete(prescriptionItems)
    .where(eq(prescriptionItems.prescriptionId, id));

  const insertedItems = await db
    .insert(prescriptionItems)
    .values(
      body.items.map((item) => ({
        prescriptionId: id,
        medicationName: item.medicationName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions ?? null,
      }))
    )
    .returning();

  // Fetch updated prescription
  const [updated] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, id))
    .limit(1);

  // Fetch medical record for response
  const [mr] = await db
    .select({
      id: medicalRecords.id,
      diagnosis: medicalRecords.diagnosis,
      appointmentDate: appointments.appointmentDate,
      appointmentType: appointments.type,
      appointmentStatus: appointments.status,
    })
    .from(medicalRecords)
    .innerJoin(appointments, eq(appointments.id, medicalRecords.appointmentId))
    .where(eq(medicalRecords.id, existing.medicalRecordId))
    .limit(1);

  return c.json(
    {
      id: updated.id,
      medicalRecordId: updated.medicalRecordId,
      notes: updated.notes,
      createdAt:
        updated.createdAt instanceof Date
          ? updated.createdAt.toISOString()
          : String(updated.createdAt),
      items: insertedItems.map((item) => ({
        id: item.id,
        prescriptionId: item.prescriptionId,
        medicationName: item.medicationName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
      })),
      medicalRecord: mr
        ? {
            id: mr.id,
            diagnosis: mr.diagnosis,
            appointmentDate: mr.appointmentDate,
            type: mr.appointmentType,
            status: mr.appointmentStatus,
          }
        : undefined,
    },
    200
  );
});
