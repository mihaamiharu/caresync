import { createMiddleware } from "hono/factory";
import { verifyAccessToken } from "../lib/jwt";
import type { AppEnv } from "../app";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ message: "Missing or invalid authorization header" }, 401);
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    c.set("userId", payload.userId);
    c.set("userRole", payload.role);
    await next();
  } catch {
    return c.json({ message: "Invalid or expired token" }, 401);
  }
});

export function requireRole(...roles: string[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const role = c.get("userRole");
    if (!roles.includes(role)) {
      return c.json({ message: "Insufficient permissions" }, 403);
    }
    await next();
  });
}
