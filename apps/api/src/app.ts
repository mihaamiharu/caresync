import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoute } from "./routes/health";

export type AppEnv = {
  Variables: {
    userId: string;
    userRole: string;
  };
};

export const app = new OpenAPIHono<AppEnv>();

// Middleware
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

// Routes
app.route("/api/v1", healthRoute);

// OpenAPI spec
app.doc("/api/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "MediBook API",
    version: "1.0.0",
    description:
      "Healthcare Clinic Management System API — a practice ground for QA Automation Engineers",
  },
});

// Scalar API docs
app.get(
  "/api/docs",
  apiReference({
    spec: { url: "/api/openapi.json" },
    theme: "kepler",
  })
);
