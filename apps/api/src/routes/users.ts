import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../app";

export const usersRoute = new OpenAPIHono<AppEnv>();

const meResponse = z.object({
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

const meRoute = createRoute({
  method: "get",
  path: "/users/me",
  tags: ["Users"],
  summary: "Get current user profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: { "application/json": { schema: meResponse } },
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

  return c.json(
    {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    200
  );
});
