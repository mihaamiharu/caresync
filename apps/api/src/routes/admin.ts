import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { db } from "../db";
import {
  patients,
  doctors,
  appointments,
  invoices,
  departments,
} from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import { adminStatsResponseSchema } from "@caresync/shared";
import type { AppEnv } from "../app";

export const adminRoute = new OpenAPIHono<AppEnv>();

// ─── GET /admin/stats ─────────────────────────────────────────────────────────

const errorResponseSchema = z.object({ message: z.string() });

const getAdminStatsRoute = createRoute({
  method: "get",
  path: "/admin/stats",
  tags: ["Admin"],
  summary: "Get admin dashboard statistics",
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole("admin")] as const,
  responses: {
    200: {
      description: "Admin dashboard stats",
      content: {
        "application/json": { schema: adminStatsResponseSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

adminRoute.openapi(getAdminStatsRoute, async (c) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().substring(0, 10);
    const todayStr = today.toISOString().substring(0, 10);

    const [patientCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .limit(1);

    const [doctorCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(doctors)
      .limit(1);

    const [appointmentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .limit(1);

    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(total AS numeric)), 0)` })
      .from(invoices)
      .where(eq(invoices.status, "paid"))
      .limit(1);

    const timelineRows = await db
      .select({
        date: appointments.appointmentDate,
        count: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, thirtyDaysAgoStr),
          lte(appointments.appointmentDate, todayStr)
        )
      )
      .groupBy(appointments.appointmentDate)
      .orderBy(appointments.appointmentDate);

    const appointmentsTimeline = timelineRows.map((row) => ({
      date: row.date,
      count: row.count,
    }));

    const deptRows = await db
      .select({
        department: departments.name,
        count: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(departments, eq(doctors.departmentId, departments.id))
      .groupBy(departments.name)
      .orderBy(sql`count(*)::int desc`);

    const appointmentsByDepartment = deptRows.map((row) => ({
      department: row.department,
      count: row.count,
    }));

    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setMonth(today.getMonth() - 12);
    const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().substring(0, 7);

    const revenueRows = await db
      .select({
        month: sql<string>`TO_CHAR(paid_at, 'YYYY-MM')`,
        revenue: sql<number>`COALESCE(SUM(CAST(total AS numeric)), 0)`,
      })
      .from(invoices)
      .where(and(
        eq(invoices.status, "paid"),
        gte(sql`TO_CHAR(paid_at, 'YYYY-MM')`, twelveMonthsAgoStr)
      ))
      .groupBy(sql`TO_CHAR(paid_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(paid_at, 'YYYY-MM')`);

    const revenueTimeline = revenueRows.map((row) => ({
      month: row.month,
      revenue: row.revenue,
    }));

    return c.json(
      {
        summary: {
          totalPatients: patientCount.count,
          totalDoctors: doctorCount.count,
          totalAppointments: appointmentCount.count,
          totalRevenue: revenueResult.total,
        },
        appointmentsTimeline,
        appointmentsByDepartment,
        revenueTimeline,
      },
      200
    );
  } catch {
    return c.json({ message: "Failed to load stats" }, 500);
  }
});