import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { patients } from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import { BLOOD_TYPES, GENDERS } from "@caresync/shared";
import type { AppEnv } from "../app";

export const patientsRoute = new OpenAPIHono<AppEnv>();

// ─── Shared schemas ────────────────────────────────────────────────────────────

const patientResponse = z.object({
  id: z.string(),
  userId: z.string(),
  dateOfBirth: z.string().nullable(),
  gender: z.string().nullable(),
  bloodType: z.string().nullable(),
  allergies: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
});

const errorResponse = z.object({ message: z.string() });

// ─── GET /patients/me ─────────────────────────────────────────────────────────

const getMyPatientRoute = createRoute({
  method: "get",
  path: "/patients/me",
  tags: ["Patients"],
  summary: "Get current patient profile (null if not yet created)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("patient")] as const,
  responses: {
    200: {
      description: "Patient profile or null",
      content: { "application/json": { schema: patientResponse.nullable() } },
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

patientsRoute.openapi(getMyPatientRoute, async (c) => {
  const userId = c.get("userId");

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, userId))
    .limit(1);

  return c.json(patient ?? null, 200);
});

// ─── PUT /patients/me ─────────────────────────────────────────────────────────

const upsertPatientBody = z.object({
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((val) => new Date(val) < new Date(), {
      message: "Date of birth must be in the past",
    })
    .nullable()
    .optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  bloodType: z.enum(BLOOD_TYPES).nullable().optional(),
  allergies: z.string().max(1000).nullable().optional(),
  emergencyContactName: z.string().max(100).nullable().optional(),
  emergencyContactPhone: z.string().min(1).nullable().optional(),
});

const upsertPatientRoute = createRoute({
  method: "put",
  path: "/patients/me",
  tags: ["Patients"],
  summary: "Create or update current patient medical profile",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("patient")] as const,
  request: {
    body: {
      content: { "application/json": { schema: upsertPatientBody } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Upserted patient profile",
      content: { "application/json": { schema: patientResponse } },
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
  },
});

patientsRoute.openapi(upsertPatientRoute, async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, userId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(patients)
      .set({
        dateOfBirth: body.dateOfBirth ?? null,
        gender: body.gender ?? null,
        bloodType: body.bloodType ?? null,
        allergies: body.allergies ?? null,
        emergencyContactName: body.emergencyContactName ?? null,
        emergencyContactPhone: body.emergencyContactPhone ?? null,
      })
      .where(eq(patients.userId, userId))
      .returning();

    return c.json(updated, 200);
  }

  const [inserted] = await db
    .insert(patients)
    .values({
      userId,
      dateOfBirth: body.dateOfBirth ?? null,
      gender: body.gender ?? null,
      bloodType: body.bloodType ?? null,
      allergies: body.allergies ?? null,
      emergencyContactName: body.emergencyContactName ?? null,
      emergencyContactPhone: body.emergencyContactPhone ?? null,
    })
    .returning();

  return c.json(inserted, 200);
});
