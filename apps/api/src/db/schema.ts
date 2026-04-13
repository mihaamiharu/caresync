import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  time,
  integer,
  decimal,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "doctor", "patient"]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "in-progress",
  "completed",
  "cancelled",
  "no-show",
]);
export const appointmentTypeEnum = pgEnum("appointment_type", [
  "consultation",
  "follow-up",
  "emergency",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending",
  "paid",
  "overdue",
  "cancelled",
]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const dayOfWeekEnum = pgEnum("day_of_week", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

// Tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("patient"),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id),
  specialization: varchar("specialization", { length: 200 }).notNull(),
  bio: text("bio"),
  licenseNumber: varchar("license_number", { length: 50 }).notNull().unique(),
});

export const doctorSchedules = pgTable("doctor_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  slotDurationMinutes: integer("slot_duration_minutes").notNull().default(30),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  dateOfBirth: date("date_of_birth"),
  gender: genderEnum("gender"),
  bloodType: varchar("blood_type", { length: 5 }),
  allergies: text("allergies"),
  emergencyContactName: varchar("emergency_contact_name", { length: 100 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
});

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id),
    appointmentDate: date("appointment_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    status: appointmentStatusEnum("status").notNull().default("pending"),
    type: appointmentTypeEnum("type").notNull().default("consultation"),
    reason: text("reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_appointments_doctor_date_time").on(
      table.doctorId,
      table.appointmentDate,
      table.startTime
    ),
  ]
);

export const medicalRecords = pgTable("medical_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .unique()
    .references(() => appointments.id),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id),
  diagnosis: text("diagnosis").notNull(),
  symptoms: text("symptoms"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const medicalRecordAttachments = pgTable("medical_record_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  medicalRecordId: uuid("medical_record_id")
    .notNull()
    .references(() => medicalRecords.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size").notNull(),
});

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  medicalRecordId: uuid("medical_record_id")
    .notNull()
    .references(() => medicalRecords.id, { onDelete: "cascade" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const prescriptionItems = pgTable("prescription_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  prescriptionId: uuid("prescription_id")
    .notNull()
    .references(() => prescriptions.id, { onDelete: "cascade" }),
  medicationName: varchar("medication_name", { length: 200 }).notNull(),
  dosage: varchar("dosage", { length: 100 }).notNull(),
  frequency: varchar("frequency", { length: 100 }).notNull(),
  duration: varchar("duration", { length: 100 }).notNull(),
  instructions: text("instructions"),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .unique()
    .references(() => appointments.id),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("pending"),
  dueDate: date("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .unique()
    .references(() => appointments.id),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
