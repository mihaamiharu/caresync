import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, desc, count } from "drizzle-orm";
import { db } from "../db";
import { reviews, appointments, patients, users } from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import type { AppEnv } from "../app";

export const reviewsRoute = new OpenAPIHono<AppEnv>();

const errorResponse = z.object({ message: z.string() });

// ─── Shared schemas ────────────────────────────────────────────────────────────

const reviewResponse = z.object({
  id: z.string(),
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
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

reviewsRoute.openapi(getDoctorReviewsRoute, async (c) => {
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

// ─── POST /reviews ─────────────────────────────────────────────────────────────

const createReviewBody = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
});

const createReviewRoute = createRoute({
  method: "post",
  path: "/reviews",
  tags: ["Reviews"],
  summary: "Submit a review for a completed appointment",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("patient")] as const,
  request: {
    body: {
      content: { "application/json": { schema: createReviewBody } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Review created",
      content: { "application/json": { schema: reviewResponse } },
    },
    400: {
      description: "Validation error or already reviewed",
      content: { "application/json": { schema: errorResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Not your appointment or not completed",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Appointment not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

reviewsRoute.openapi(createReviewRoute, async (c) => {
  const { appointmentId, rating, comment } = c.req.valid("json");
  const userId = c.get("userId");

  // 1. Fetch appointment with patient userId in one join query
  const [row] = await db
    .select({
      appointment: appointments,
      patientUserId: patients.userId,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) {
    return c.json({ message: "Appointment not found" }, 404);
  }

  const { appointment } = row;

  // 2. Check ownership via userId
  if (row.patientUserId !== userId) {
    return c.json(
      { message: "You can only review your own appointments" },
      403
    );
  }

  // 3. Check appointment is completed
  if (appointment.status !== "completed") {
    return c.json(
      { message: "Only completed appointments can be reviewed" },
      403
    );
  }

  // 4. Check no existing review
  const [existingReview] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.appointmentId, appointmentId))
    .limit(1);

  if (existingReview) {
    return c.json(
      { message: "You have already reviewed this appointment" },
      400
    );
  }

  // 5. Create the review
  const [created] = await db
    .insert(reviews)
    .values({
      appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      rating,
      comment: comment ?? null,
    })
    .returning();

  return c.json(
    {
      ...created,
      createdAt: new Date(created.createdAt).toISOString(),
    },
    201
  );
});

// ─── GET /reviews/appointment/:appointmentId ───────────────────────────────────

const getReviewByAppointmentRoute = createRoute({
  method: "get",
  path: "/reviews/appointment/{appointmentId}",
  tags: ["Reviews"],
  summary: "Get review for an appointment",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: z.object({ appointmentId: z.string().uuid() }) },
  responses: {
    200: {
      description: "Review for the appointment",
      content: { "application/json": { schema: reviewResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Review not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

reviewsRoute.openapi(getReviewByAppointmentRoute, async (c) => {
  const { appointmentId } = c.req.valid("param");

  const [review] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.appointmentId, appointmentId))
    .limit(1);

  if (!review) {
    return c.json({ message: "Review not found" }, 404);
  }

  return c.json(
    {
      ...review,
      createdAt: new Date(review.createdAt).toISOString(),
    },
    200
  );
});
