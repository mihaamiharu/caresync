export const USER_ROLES = ["admin", "doctor", "patient"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "in-progress",
  "completed",
  "cancelled",
  "no-show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_TYPES = [
  "consultation",
  "follow-up",
  "emergency",
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const INVOICE_STATUSES = [
  "pending",
  "paid",
  "overdue",
  "cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const GENDERS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_TYPES = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
