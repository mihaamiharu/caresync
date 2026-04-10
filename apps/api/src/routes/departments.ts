import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, ilike, asc, sql } from "drizzle-orm";
import { db } from "../db";
import { departments } from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import type { AppEnv } from "../app";

export const departmentsRoute = new OpenAPIHono<AppEnv>();

// Apply requireAuth to all department routes
departmentsRoute.use("/departments/*", requireAuth);
departmentsRoute.use("/departments", requireAuth);

// ─── Shared schemas ────────────────────────────────────────────────────────────

const departmentResponse = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
});

const errorResponse = z.object({ message: z.string() });

// ─── GET /departments ──────────────────────────────────────────────────────────

const listDepartmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
  search: z.string().optional().openapi({ example: "cardio" }),
});

const paginatedDepartmentsResponse = z.object({
  data: z.array(departmentResponse),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const listDepartmentsRoute = createRoute({
  method: "get",
  path: "/departments",
  tags: ["Departments"],
  summary: "List all departments",
  security: [{ bearerAuth: [] }],
  request: { query: listDepartmentsQuerySchema },
  responses: {
    200: {
      description: "Paginated department list",
      content: { "application/json": { schema: paginatedDepartmentsResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

departmentsRoute.openapi(listDepartmentsRoute, async (c) => {
  const { page, limit, search } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const searchCondition = search ? ilike(departments.name, `%${search}%`) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(departments)
    .where(searchCondition);

  const rows = await db
    .select()
    .from(departments)
    .where(searchCondition)
    .orderBy(asc(departments.name))
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

// ─── GET /departments/:id ──────────────────────────────────────────────────────

const getDepartmentRoute = createRoute({
  method: "get",
  path: "/departments/{id}",
  tags: ["Departments"],
  summary: "Get a department by ID",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Department",
      content: { "application/json": { schema: departmentResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Department not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

departmentsRoute.openapi(getDepartmentRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [dept] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);

  if (!dept) {
    return c.json({ message: "Department not found" }, 404);
  }

  return c.json(dept, 200);
});

// ─── POST /departments (admin) ────────────────────────────────────────────────

const createDepartmentBody = z.object({
  name: z.string().min(1).max(100).openapi({ example: "Cardiology" }),
  description: z.string().optional().nullable().openapi({ example: "Heart-related care" }),
  imageUrl: z.string().url().optional().nullable().openapi({ example: "https://example.com/img.png" }),
  isActive: z.boolean().optional().default(true),
});

const createDepartmentRoute = createRoute({
  method: "post",
  path: "/departments",
  tags: ["Departments"],
  summary: "Create a department (admin only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireRole("admin")] as const,
  request: {
    body: {
      content: { "application/json": { schema: createDepartmentBody } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Created department",
      content: { "application/json": { schema: departmentResponse } },
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

departmentsRoute.openapi(createDepartmentRoute, async (c) => {
  const body = c.req.valid("json");

  const [created] = await db
    .insert(departments)
    .values({
      name: body.name,
      description: body.description ?? null,
      imageUrl: body.imageUrl ?? null,
      isActive: body.isActive ?? true,
    })
    .returning();

  return c.json(created, 201);
});

// ─── PUT /departments/:id (admin) ─────────────────────────────────────────────

const updateDepartmentBody = z.object({
  name: z.string().min(1).max(100).openapi({ example: "Cardiology" }),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateDepartmentRoute = createRoute({
  method: "put",
  path: "/departments/{id}",
  tags: ["Departments"],
  summary: "Update a department (admin only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireRole("admin")] as const,
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: updateDepartmentBody } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated department",
      content: { "application/json": { schema: departmentResponse } },
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
      description: "Department not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

departmentsRoute.openapi(updateDepartmentRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const updateData: Partial<typeof departments.$inferInsert> = { name: body.name };
  if (body.description !== undefined) updateData.description = body.description;
  if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const [updated] = await db
    .update(departments)
    .set(updateData)
    .where(eq(departments.id, id))
    .returning();

  if (!updated) {
    return c.json({ message: "Department not found" }, 404);
  }

  return c.json(updated, 200);
});

// ─── DELETE /departments/:id (admin) ─────────────────────────────────────────

const deleteDepartmentRoute = createRoute({
  method: "delete",
  path: "/departments/{id}",
  tags: ["Departments"],
  summary: "Delete a department (admin only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireRole("admin")] as const,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: "Department deleted",
      content: { "application/json": { schema: z.object({ message: z.string() }) } },
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
      description: "Department not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

departmentsRoute.openapi(deleteDepartmentRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(departments)
    .where(eq(departments.id, id))
    .returning();

  if (!deleted) {
    return c.json({ message: "Department not found" }, 404);
  }

  return c.json({ message: "Department deleted successfully" }, 200);
});
