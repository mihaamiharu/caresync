import { z } from "zod";

const timelineEntrySchema = z.object({
  date: z.string(),
  count: z.number().int().nonnegative(),
});

const revenueTimelineEntrySchema = z.object({
  month: z.string(),
  revenue: z.number().nonnegative(),
});

const departmentEntrySchema = z.object({
  department: z.string(),
  count: z.number().int().nonnegative(),
});

export const adminStatsResponseSchema = z.object({
  summary: z.object({
    totalPatients: z.number().int().nonnegative(),
    totalDoctors: z.number().int().nonnegative(),
    totalAppointments: z.number().int().nonnegative(),
    totalRevenue: z.number().nonnegative(),
  }),
  appointmentsTimeline: z.array(timelineEntrySchema),
  appointmentsByDepartment: z.array(departmentEntrySchema),
  revenueTimeline: z.array(revenueTimelineEntrySchema),
});

export type AdminStatsResponse = z.infer<typeof adminStatsResponseSchema>;