import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

export const healthRoute = new OpenAPIHono();

const healthCheck = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      description: "API is healthy",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
  },
});

healthRoute.openapi(healthCheck, (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});
