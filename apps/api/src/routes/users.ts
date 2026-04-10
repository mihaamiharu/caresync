import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, desc, ilike, or, sql } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../db";
import { users } from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import type { AppEnv } from "../app";

export const usersRoute = new OpenAPIHono<AppEnv>();

// ─── Shared schemas ────────────────────────────────────────────────────────────

const userResponse = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const errorResponse = z.object({ message: z.string() });

function serializeUser(user: typeof users.$inferSelect) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// ─── GET /users/me ─────────────────────────────────────────────────────────────

const meRoute = createRoute({
  method: "get",
  path: "/users/me",
  tags: ["Users"],
  summary: "Get current user profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: { "application/json": { schema: userResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

usersRoute.use("/users/me", requireAuth);

usersRoute.openapi(meRoute, async (c) => {
  const userId = c.get("userId");

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return c.json({ message: "User not found" }, 401);
  }

  return c.json(serializeUser(user as typeof users.$inferSelect), 200);
});

// ─── PUT /users/me ─────────────────────────────────────────────────────────────

const updateProfileBody = z.object({
  firstName: z.string().min(1).openapi({ example: "Jane" }),
  lastName: z.string().min(1).openapi({ example: "Smith" }),
  phone: z.string().optional().nullable().openapi({ example: "+1234567890" }),
});

const updateProfileRoute = createRoute({
  method: "put",
  path: "/users/me",
  tags: ["Users"],
  summary: "Update current user profile",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: updateProfileBody } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated user profile",
      content: { "application/json": { schema: userResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

usersRoute.openapi(updateProfileRoute, async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");

  const [updated] = await db
    .update(users)
    .set({
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return c.json(serializeUser(updated as typeof users.$inferSelect), 200);
});

// ─── PUT /users/me/avatar ──────────────────────────────────────────────────────

usersRoute.put("/users/me/avatar", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.parseBody();
  const file = body["avatar"];

  if (!file || typeof file === "string") {
    return c.json({ message: "No avatar file provided" }, 400);
  }

  const ext = (file as File).name.split(".").pop() ?? "jpg";
  const filename = `${userId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "uploads", "avatars");

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await (file as File).arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const avatarUrl = `/uploads/avatars/${filename}`;

  const [updated] = await db
    .update(users)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return c.json(serializeUser(updated as typeof users.$inferSelect), 200);
});

// ─── GET /users (admin) ────────────────────────────────────────────────────────

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({ example: 20 }),
  search: z.string().optional().openapi({ example: "john" }),
});

const paginatedUsersResponse = z.object({
  data: z.array(userResponse),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const listUsersRoute = createRoute({
  method: "get",
  path: "/users",
  tags: ["Users"],
  summary: "List all users (admin only)",
  security: [{ bearerAuth: [] }],
  request: {
    query: listUsersQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated user list",
      content: { "application/json": { schema: paginatedUsersResponse } },
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

usersRoute.use("/users", requireAuth, requireRole("admin"));

usersRoute.openapi(listUsersRoute, async (c) => {
  const { page, limit, search } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const searchCondition = search
    ? or(
        ilike(users.firstName, `%${search}%`),
        ilike(users.lastName, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(searchCondition);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(searchCondition)
    .orderBy(desc(users.createdAt))
    .offset(offset)
    .limit(limit);

  return c.json(
    {
      data: rows.map((u) => serializeUser(u as typeof users.$inferSelect)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    200
  );
});

// ─── PATCH /users/:id/status (admin) ──────────────────────────────────────────

const updateStatusBody = z.object({
  isActive: z.boolean().openapi({ example: false }),
});

const updateStatusRoute = createRoute({
  method: "patch",
  path: "/users/{id}/status",
  tags: ["Users"],
  summary: "Activate or deactivate a user (admin only)",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: updateStatusBody } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated user",
      content: { "application/json": { schema: userResponse } },
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
      description: "User not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

usersRoute.use("/users/:id/status", requireAuth, requireRole("admin"));

usersRoute.openapi(updateStatusRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { isActive } = c.req.valid("json");

  const [updated] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) {
    return c.json({ message: "User not found" }, 404);
  }

  return c.json(serializeUser(updated as typeof users.$inferSelect), 200);
});
