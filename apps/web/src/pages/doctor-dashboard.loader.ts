import type { DoctorMeStatsResponse } from "@caresync/shared";
import type { AppointmentListItem } from "@/lib/api-client";

export interface DoctorDashboardData {
  doctorData: DoctorMeStatsResponse;
  appointments: AppointmentListItem[];
}

export type Route = DoctorDashboardData;
