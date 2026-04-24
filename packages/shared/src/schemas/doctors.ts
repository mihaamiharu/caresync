import { z } from "zod";

export const doctorMeStatsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  departmentId: z.string(),
  specialization: z.string(),
  bio: z.string().nullable(),
  licenseNumber: z.string(),
  averageRating: z.number().nullable(),
  reviewCount: z.number(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  department: z.object({
    id: z.string(),
    name: z.string(),
  }),
  stats: z.object({
    totalAppointments: z.number(),
    uniquePatients: z.number(),
    todayAppointments: z.number(),
  }),
});

export type DoctorMeStatsResponse = z.infer<typeof doctorMeStatsSchema>;
