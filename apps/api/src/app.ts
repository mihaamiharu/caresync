import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { healthRoute } from "./routes/health";
import { authRoute } from "./routes/auth";
import { usersRoute } from "./routes/users";
import { departmentsRoute } from "./routes/departments";
import { doctorsRoute } from "./routes/doctors";
import { patientsRoute } from "./routes/patients";
import { appointmentsRoute } from "./routes/appointments";

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

// Serve uploaded files
app.use("/uploads/*", serveStatic({ root: "./" }));

// Root health check (for load balancers and Task 2 acceptance criteria)
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// Routes
app.route("/api/v1", healthRoute);
app.route("/api/v1", authRoute);
app.route("/api/v1", usersRoute);
app.route("/api/v1", departmentsRoute);
app.route("/api/v1", doctorsRoute);
app.route("/api/v1", patientsRoute);
app.route("/api/v1", appointmentsRoute);

// OpenAPI spec
app.doc("/api/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "caresync API",
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
