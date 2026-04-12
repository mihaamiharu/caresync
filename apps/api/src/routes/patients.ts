import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, ilike, or, sql, and } from "drizzle-orm";
import { db } from "../db";
import { patients, users } from "../db/schema";
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

// ─── GET /patients (admin list) ───────────────────────────────────────────────

const listPatientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ example: 20 }),
  search: z.string().optional().openapi({ example: "john" }),
  gender: z.enum(GENDERS).optional().openapi({ example: "male" }),
  bloodType: z.enum(BLOOD_TYPES).optional().openapi({ example: "A+" }),
});

const patientListItem = z.object({
  id: z.string(),
  userId: z.string(),
  dateOfBirth: z.string().nullable(),
  gender: z.string().nullable(),
  bloodType: z.string().nullable(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
});

const paginatedPatientsResponse = z.object({
  data: z.array(patientListItem),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const listPatientsRoute = createRoute({
  method: "get",
  path: "/patients",
  tags: ["Patients"],
  summary: "List all patients with search and filters (admin only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("admin")] as const,
  request: { query: listPatientsQuerySchema },
  responses: {
    200: {
      description: "Paginated patient list",
      content: { "application/json": { schema: paginatedPatientsResponse } },
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

patientsRoute.openapi(listPatientsRoute, async (c) => {
  const { page, limit, search, gender, bloodType } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(users.firstName, `%${search}%`),
        ilike(users.lastName, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    );
  }
  if (gender) conditions.push(eq(patients.gender, gender));
  if (bloodType) conditions.push(eq(patients.bloodType, bloodType));

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .where(whereCondition);

  const rows = await db
    .select({
      id: patients.id,
      userId: patients.userId,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      bloodType: patients.bloodType,
      user: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .where(whereCondition)
    .orderBy(users.lastName)
    .offset(offset)
    .limit(limit);

  return c.json(
    { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) },
    200
  );
});
