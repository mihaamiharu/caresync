import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import {
  invoices,
  patients,
  users,
  appointments,
  notifications,
} from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import type { AppEnv } from "../app";

export const invoicesRoute = new OpenAPIHono<AppEnv>();

// ─── Shared schemas ───────────────────────────────────────────────────────────

const invoiceResponse = z.object({
  id: z.string(),
  appointmentId: z.string(),
  patientId: z.string(),
  amount: z.string(),
  tax: z.string(),
  total: z.string(),
  status: z.string(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});

const errorResponse = z.object({ message: z.string() });

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── POST /invoices ───────────────────────────────────────────────────────────

const createInvoiceBody = z.object({
  appointmentId: z.string().uuid("Invalid appointment ID"),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number"),
  tax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Tax must be a valid number")
    .optional(),
});

const createInvoiceRoute = createRoute({
  method: "post",
  path: "/invoices",
  tags: ["Invoices"],
  summary: "Create a new invoice (admin only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("admin")] as const,
  request: {
    body: {
      content: { "application/json": { schema: createInvoiceBody } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Invoice created",
      content: { "application/json": { schema: invoiceResponse } },
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
      description: "Invoice already exists for this appointment",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

invoicesRoute.openapi(createInvoiceRoute, async (c) => {
  const body = c.req.valid("json");

  // Check appointment exists
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, body.appointmentId))
    .limit(1);

  if (!appointment) {
    return c.json({ message: "Appointment not found" }, 404);
  }

  // Get patient for this appointment
  const patientId = appointment.patientId;

  // Check no invoice already exists for this appointment
  const [existingInvoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.appointmentId, body.appointmentId))
    .limit(1);

  if (existingInvoice) {
    return c.json(
      { message: "Invoice already exists for this appointment" },
      409
    );
  }

  // Calculate total
  const amount = parseFloat(body.amount);
  const tax = body.tax ? parseFloat(body.tax) : 0;
  const total = (amount + tax).toFixed(2);

  // Set due date to 14 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const [inserted] = await db
    .insert(invoices)
    .values({
      appointmentId: body.appointmentId,
      patientId,
      amount: body.amount,
      tax: body.tax ?? "0",
      total,
      status: "pending",
      dueDate: dueDate.toISOString().substring(0, 10),
    })
    .returning();

  const [patientUserRow] = await db
    .select({ userId: patients.userId })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (patientUserRow) {
    await db.insert(notifications).values({
      userId: patientUserRow.userId,
      title: "New Invoice Generated",
      message: `An invoice of Rp ${total} has been generated for your appointment.`,
      type: "invoice",
      link: `/patient/invoices/${inserted.id}`,
    });
  }

  return c.json(inserted, 201);
});

// ─── GET /invoices ───────────────────────────────────────────────────────────

const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ example: 20 }),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
});

const invoiceListItem = z.object({
  id: z.string(),
  appointmentId: z.string(),
  patientId: z.string(),
  amount: z.string(),
  tax: z.string(),
  total: z.string(),
  status: z.string(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
  patientName: z.string(),
  appointmentDate: z.string(),
});

const paginatedInvoicesResponse = z.object({
  data: z.array(invoiceListItem),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const listInvoicesRoute = createRoute({
  method: "get",
  path: "/invoices",
  tags: ["Invoices"],
  summary: "List all invoices (admin sees all, patient sees own)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { query: listInvoicesQuerySchema },
  responses: {
    200: {
      description: "Paginated invoice list",
      content: { "application/json": { schema: paginatedInvoicesResponse } },
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

invoicesRoute.openapi(listInvoicesRoute, async (c) => {
  const { page, limit, status } = c.req.valid("query");
  const offset = (page - 1) * limit;
  const userId = c.get("userId");
  const role = c.get("userRole");

  // Only admin and patient can list
  if (role !== "admin" && role !== "patient") {
    return c.json({ message: "Insufficient permissions" }, 403);
  }

  const conditions = [];

  if (role === "patient") {
    // Find patient by userId
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    if (patient) {
      conditions.push(eq(invoices.patientId, patient.id));
    } else {
      // No patient record, return empty
      return c.json({ data: [], total: 0, page, limit, totalPages: 0 }, 200);
    }
  }

  if (status) {
    conditions.push(eq(invoices.status, status));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: invoices.id,
      appointmentId: invoices.appointmentId,
      patientId: invoices.patientId,
      amount: invoices.amount,
      tax: invoices.tax,
      total: invoices.total,
      status: invoices.status,
      dueDate: invoices.dueDate,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
      patientFirstName: users.firstName,
      patientLastName: users.lastName,
      appointmentDate: appointments.appointmentDate,
    })
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .innerJoin(users, eq(patients.userId, users.id))
    .innerJoin(appointments, eq(invoices.appointmentId, appointments.id));

  const countQuery = db
    .select({ total: sql<number>`count(*)::int` })
    .from(invoices);

  let rows: Awaited<typeof baseQuery>;
  let total: number;

  if (whereCondition) {
    const [countRow] = await countQuery.where(whereCondition).limit(1);
    total = countRow.total;
    rows = await baseQuery
      .where(whereCondition)
      .orderBy(invoices.createdAt)
      .offset(offset)
      .limit(limit);
  } else {
    const [countRow] = await countQuery.limit(1);
    total = countRow.total;
    rows = await baseQuery
      .orderBy(invoices.createdAt)
      .offset(offset)
      .limit(limit);
  }

  const data = rows.map((row) => ({
    ...row,
    patientName: `${row.patientFirstName} ${row.patientLastName}`,
  }));

  return c.json(
    { data, total, page, limit, totalPages: Math.ceil(total / limit) },
    200
  );
});

// ─── GET /invoices/:id ───────────────────────────────────────────────────────

const getInvoiceRoute = createRoute({
  method: "get",
  path: "/invoices/{id}",
  tags: ["Invoices"],
  summary: "Get invoice by ID",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: z.object({
      id: z.string().uuid("Invalid invoice ID"),
    }),
  },
  responses: {
    200: {
      description: "Invoice detail",
      content: { "application/json": { schema: invoiceResponse } },
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
      description: "Invoice not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

invoicesRoute.openapi(getInvoiceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const role = c.get("userRole");

  const [row] = await db
    .select({
      invoice: invoices,
      patient: patients,
      patientUser: users,
      appointment: appointments,
    })
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .innerJoin(users, eq(patients.userId, users.id))
    .innerJoin(appointments, eq(invoices.appointmentId, appointments.id))
    .where(eq(invoices.id, id))
    .limit(1);

  if (!row) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  // Access check
  if (role === "patient") {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    if (!patient || row.invoice.patientId !== patient.id) {
      return c.json({ message: "Insufficient permissions" }, 403);
    }
  }

  if (role === "doctor") {
    return c.json({ message: "Insufficient permissions" }, 403);
  }

  return c.json(
    {
      ...row.invoice,
      patientName: `${row.patientUser.firstName} ${row.patientUser.lastName}`,
      patientEmail: row.patientUser.email,
      appointmentDate: row.appointment.appointmentDate,
      appointmentStartTime: row.appointment.startTime,
      appointmentEndTime: row.appointment.endTime,
      appointmentType: row.appointment.type,
    },
    200
  );
});

// ─── PATCH /invoices/:id/pay ────────────────────────────────────────────────

const payInvoiceRoute = createRoute({
  method: "patch",
  path: "/invoices/{id}/pay",
  tags: ["Invoices"],
  summary: "Mark invoice as paid",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: z.object({
      id: z.string().uuid("Invalid invoice ID"),
    }),
  },
  responses: {
    200: {
      description: "Invoice marked as paid",
      content: { "application/json": { schema: invoiceResponse } },
    },
    400: {
      description: "Invoice already paid or cancelled",
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
      description: "Invoice not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

invoicesRoute.openapi(payInvoiceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");
  const role = c.get("userRole");

  if (role === "doctor") {
    return c.json({ message: "Insufficient permissions" }, 403);
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (!invoice) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  if (invoice.status === "paid") {
    return c.json({ message: "Invoice is already paid" }, 400);
  }

  if (invoice.status === "cancelled") {
    return c.json({ message: "Cannot pay a cancelled invoice" }, 400);
  }

  // Patient can only pay their own
  if (role === "patient") {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    if (!patient || invoice.patientId !== patient.id) {
      return c.json({ message: "Insufficient permissions" }, 403);
    }
  }

  const [updated] = await db
    .update(invoices)
    .set({
      status: "paid",
      paidAt: new Date(),
    })
    .where(eq(invoices.id, id))
    .returning();

  return c.json(updated, 200);
});

// ─── PATCH /invoices/:id/cancel ─────────────────────────────────────────────

const cancelInvoiceRoute = createRoute({
  method: "patch",
  path: "/invoices/{id}/cancel",
  tags: ["Invoices"],
  summary: "Cancel an invoice (admin only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("admin")] as const,
  request: {
    params: z.object({
      id: z.string().uuid("Invalid invoice ID"),
    }),
  },
  responses: {
    200: {
      description: "Invoice cancelled",
      content: { "application/json": { schema: invoiceResponse } },
    },
    400: {
      description: "Invoice already paid or cancelled",
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
      description: "Invoice not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

invoicesRoute.openapi(cancelInvoiceRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (!invoice) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  if (invoice.status === "paid") {
    return c.json({ message: "Cannot cancel a paid invoice" }, 400);
  }

  if (invoice.status === "cancelled") {
    return c.json({ message: "Invoice is already cancelled" }, 400);
  }

  const [updated] = await db
    .update(invoices)
    .set({
      status: "cancelled",
    })
    .where(eq(invoices.id, id))
    .returning();

  return c.json(updated, 200);
});
