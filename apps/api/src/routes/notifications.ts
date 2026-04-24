import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { notifications } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../app";

export const notificationsRoute = new OpenAPIHono<AppEnv>();

const errorResponse = z.object({ message: z.string() });

// ─── GET /notifications ───────────────────────────────────────────────────────

const listNotificationsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  isRead: z.boolean(),
  link: z.string().nullable(),
  createdAt: z.string(),
});

const listNotificationsResponse = z.object({
  data: z.array(notificationSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const listNotificationsRoute = createRoute({
  method: "get",
  path: "/notifications",
  tags: ["Notifications"],
  summary: "List current user's notifications",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { query: listNotificationsQuery },
  responses: {
    200: {
      description: "Paginated notification list",
      content: { "application/json": { schema: listNotificationsResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

notificationsRoute.openapi(listNotificationsRoute, async (c) => {
  const { page, limit } = c.req.valid("query");
  const userId = c.get("userId");

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .limit(1);

  const total = Number(countResult?.count ?? 0);

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const data = rows.map((row) => ({
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
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

// ─── GET /notifications/unread-count ──────────────────────────────────────────

const unreadCountResponse = z.object({
  count: z.number(),
});

const unreadCountRoute = createRoute({
  method: "get",
  path: "/notifications/unread-count",
  tags: ["Notifications"],
  summary: "Get unread notifications count",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Unread count",
      content: { "application/json": { schema: unreadCountResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

notificationsRoute.openapi(unreadCountRoute, async (c) => {
  const userId = c.get("userId");

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .limit(1);

  return c.json({ count: Number(countResult?.count ?? 0) }, 200);
});

// ─── PATCH /notifications/read-all ────────────────────────────────────────────

const readAllRoute = createRoute({
  method: "patch",
  path: "/notifications/read-all",
  tags: ["Notifications"],
  summary: "Mark all notifications as read",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Successfully marked all as read",
      content: { "application/json": { schema: z.object({ success: z.boolean() }) } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

notificationsRoute.openapi(readAllRoute, async (c) => {
  const userId = c.get("userId");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return c.json({ success: true }, 200);
});

// ─── PATCH /notifications/:id/read ────────────────────────────────────────────

const readNotificationRoute = createRoute({
  method: "patch",
  path: "/notifications/{id}/read",
  tags: ["Notifications"],
  summary: "Mark a notification as read",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Notification marked as read",
      content: { "application/json": { schema: notificationSchema } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Notification not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

notificationsRoute.openapi(readNotificationRoute, async (c) => {
  const { id } = c.req.valid("param");
  const userId = c.get("userId");

  const [existing] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .limit(1);

  if (!existing) {
    return c.json({ message: "Notification not found" }, 404);
  }

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id))
    .returning();

  return c.json(
    {
      ...updated,
      createdAt: new Date(updated.createdAt).toISOString(),
    },
    200
  );
});
