import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../app";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

export function clearRateLimitStore() {
  store.clear();
}

export const rateLimitMiddleware: (
  options: { windowMs: number; max: number },
) => MiddlewareHandler<AppEnv> = (options) => {
  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("cf-connecting-ip") ??
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + options.windowMs });
    } else {
      entry.count++;
      store.set(ip, entry);
    }

    if ((store.get(ip)?.count ?? 0) > options.max) {
      return c.json({ message: "Too many requests, please try again later." }, 429);
    }

    await next();
  };
};
