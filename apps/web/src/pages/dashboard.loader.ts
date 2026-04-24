import type { AppointmentListItem } from "@/lib/api-client";
import type { MedicalRecord } from "@caresync/shared";
import type { Invoice } from "@caresync/shared";

export interface DashboardData {
  appointments: AppointmentListItem[];
  medicalRecords: MedicalRecord[];
  invoices: Invoice[];
}

export type Route = DashboardData;
