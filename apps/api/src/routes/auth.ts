import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { db } from "../db";
import { users, patients } from "../db/schema";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { env } from "../lib/env";
import type { AppEnv } from "../app";

export const authRoute = new OpenAPIHono<AppEnv>();

// Schemas
const registerBody = z.object({
  email: z.string().email().openapi({ example: "patient@caresync.com" }),
  password: z
    .string()
    .min(6)
    .openapi({ example: "password123" }),
  firstName: z.string().min(1).openapi({ example: "John" }),
  lastName: z.string().min(1).openapi({ example: "Doe" }),
  phone: z.string().optional().openapi({ example: "+1234567890" }),
});

const loginBody = z.object({
  email: z.string().email().openapi({ example: "patient@caresync.com" }),
  password: z.string().min(1).openapi({ example: "password123" }),
});

const authResponse = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
});

const errorResponse = z.object({
  message: z.string(),
  errors: z.record(z.array(z.string())).optional(),
});

// Register
const registerRoute = createRoute({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new patient account",
  request: {
    body: { content: { "application/json": { schema: registerBody } } },
  },
  responses: {
    201: {
      description: "Account created",
      content: { "application/json": { schema: authResponse } },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: errorResponse } },
    },
    409: {
      description: "Email already taken",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

authRoute.openapi(registerRoute, async (c) => {
  const body = c.req.valid("json");

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ message: "Email already registered" }, 409);
  }

  const passwordHash = await hashPassword(body.password);

  const [user] = await db
    .insert(users)
    .values({
      email: body.email,
      passwordHash,
      role: "patient",
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
    })
    .returning();

  // Auto-create patient profile
  await db.insert(patients).values({ userId: user.id });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.IS_PRODUCTION,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return c.json(
    {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    },
    201
  );
});

// Login
const loginRoute = createRoute({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login with email and password",
  request: {
    body: { content: { "application/json": { schema: loginBody } } },
  },
  responses: {
    200: {
      description: "Login successful",
      content: { "application/json": { schema: authResponse } },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: errorResponse } },
    },
    401: {
      description: "Invalid credentials",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

authRoute.openapi(loginRoute, async (c) => {
  const body = c.req.valid("json");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (!user) {
    return c.json({ message: "Invalid email or password" }, 401);
  }

  if (!user.isActive) {
    return c.json({ message: "Account is deactivated" }, 401);
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    return c.json({ message: "Invalid email or password" }, 401);
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

  setCookie(c, "refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.IS_PRODUCTION,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return c.json(
    {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    },
    200
  );
});

// Refresh
const refreshRoute = createRoute({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh access token using refresh cookie",
  responses: {
    200: {
      description: "New access token",
      content: {
        "application/json": {
          schema: z.object({ accessToken: z.string() }),
        },
      },
    },
    401: {
      description: "Invalid or expired refresh token",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

authRoute.openapi(refreshRoute, async (c) => {
  const refreshToken = getCookie(c, "refreshToken");
  if (!refreshToken) {
    return c.json({ message: "No refresh token" }, 401);
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    const [user] = await db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return c.json({ message: "Invalid refresh token" }, 401);
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    return c.json({ accessToken }, 200);
  } catch {
    return c.json({ message: "Invalid refresh token" }, 401);
  }
});

// Logout
const logoutRoute = createRoute({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Logout and clear refresh token",
  responses: {
    200: {
      description: "Logged out",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

authRoute.openapi(logoutRoute, (c) => {
  deleteCookie(c, "refreshToken", { path: "/" });
  return c.json({ message: "Logged out" });
});
