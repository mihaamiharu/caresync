import { describe, it, expect } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  users,
  departments,
  doctors,
  doctorSchedules,
  patients,
  appointments,
  medicalRecords,
  medicalRecordAttachments,
  prescriptions,
  prescriptionItems,
  invoices,
  reviews,
  notifications,
  userRoleEnum,
  appointmentStatusEnum,
  appointmentTypeEnum,
  invoiceStatusEnum,
  genderEnum,
  dayOfWeekEnum,
} from "./schema";

describe("Schema: table exports", () => {
  it("exports all 13 required tables", () => {
    expect(users).toBeDefined();
    expect(departments).toBeDefined();
    expect(doctors).toBeDefined();
    expect(doctorSchedules).toBeDefined();
    expect(patients).toBeDefined();
    expect(appointments).toBeDefined();
    expect(medicalRecords).toBeDefined();
    expect(medicalRecordAttachments).toBeDefined();
    expect(prescriptions).toBeDefined();
    expect(prescriptionItems).toBeDefined();
    expect(invoices).toBeDefined();
    expect(reviews).toBeDefined();
    expect(notifications).toBeDefined();
  });

  it("exports all 6 required enums", () => {
    expect(userRoleEnum).toBeDefined();
    expect(appointmentStatusEnum).toBeDefined();
    expect(appointmentTypeEnum).toBeDefined();
    expect(invoiceStatusEnum).toBeDefined();
    expect(genderEnum).toBeDefined();
    expect(dayOfWeekEnum).toBeDefined();
  });
});

describe("Schema: table names", () => {
  it.each([
    [users, "users"],
    [departments, "departments"],
    [doctors, "doctors"],
    [doctorSchedules, "doctor_schedules"],
    [patients, "patients"],
    [appointments, "appointments"],
    [medicalRecords, "medical_records"],
    [medicalRecordAttachments, "medical_record_attachments"],
    [prescriptions, "prescriptions"],
    [prescriptionItems, "prescription_items"],
    [invoices, "invoices"],
    [reviews, "reviews"],
    [notifications, "notifications"],
  ] as const)("table name is correct", (table, expectedName) => {
    expect(getTableName(table)).toBe(expectedName);
  });
});

describe("Schema: enum values", () => {
  it("userRoleEnum has correct values", () => {
    expect(userRoleEnum.enumValues).toEqual(["admin", "doctor", "patient"]);
  });

  it("appointmentStatusEnum has correct values", () => {
    expect(appointmentStatusEnum.enumValues).toEqual([
      "pending",
      "confirmed",
      "in-progress",
      "completed",
      "cancelled",
      "no-show",
    ]);
  });

  it("appointmentTypeEnum has correct values", () => {
    expect(appointmentTypeEnum.enumValues).toEqual([
      "consultation",
      "follow-up",
      "emergency",
    ]);
  });

  it("invoiceStatusEnum has correct values", () => {
    expect(invoiceStatusEnum.enumValues).toEqual([
      "pending",
      "paid",
      "overdue",
      "cancelled",
    ]);
  });

  it("genderEnum has correct values", () => {
    expect(genderEnum.enumValues).toEqual(["male", "female", "other"]);
  });

  it("dayOfWeekEnum has correct values", () => {
    expect(dayOfWeekEnum.enumValues).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);
  });
});

describe("Schema: column definitions", () => {
  it("users table has all required columns", () => {
    const cols = getTableColumns(users);
    expect(cols.id).toBeDefined();
    expect(cols.email).toBeDefined();
    expect(cols.passwordHash).toBeDefined();
    expect(cols.role).toBeDefined();
    expect(cols.firstName).toBeDefined();
    expect(cols.lastName).toBeDefined();
    expect(cols.phone).toBeDefined();
    expect(cols.avatarUrl).toBeDefined();
    expect(cols.isActive).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("users.id is a primary key uuid with default random", () => {
    const cols = getTableColumns(users);
    expect(cols.id.primary).toBe(true);
    expect(cols.id.hasDefault).toBe(true);
  });

  it("users.email is not-null and unique", () => {
    const cols = getTableColumns(users);
    expect(cols.email.notNull).toBe(true);
    expect(cols.email.isUnique).toBe(true);
  });

  it("users.isActive defaults to true", () => {
    const cols = getTableColumns(users);
    expect(cols.isActive.hasDefault).toBe(true);
    expect(cols.isActive.default).toBe(true);
  });

  it("departments table has all required columns", () => {
    const cols = getTableColumns(departments);
    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.description).toBeDefined();
    expect(cols.imageUrl).toBeDefined();
    expect(cols.isActive).toBeDefined();
  });

  it("doctors table has all required columns", () => {
    const cols = getTableColumns(doctors);
    expect(cols.id).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.departmentId).toBeDefined();
    expect(cols.specialization).toBeDefined();
    expect(cols.bio).toBeDefined();
    expect(cols.licenseNumber).toBeDefined();
  });

  it("doctors.userId is unique (one doctor profile per user)", () => {
    const cols = getTableColumns(doctors);
    expect(cols.userId.isUnique).toBe(true);
  });

  it("doctors.licenseNumber is unique", () => {
    const cols = getTableColumns(doctors);
    expect(cols.licenseNumber.isUnique).toBe(true);
  });

  it("doctorSchedules table has all required columns", () => {
    const cols = getTableColumns(doctorSchedules);
    expect(cols.id).toBeDefined();
    expect(cols.doctorId).toBeDefined();
    expect(cols.dayOfWeek).toBeDefined();
    expect(cols.startTime).toBeDefined();
    expect(cols.endTime).toBeDefined();
    expect(cols.slotDurationMinutes).toBeDefined();
  });

  it("doctorSchedules.slotDurationMinutes defaults to 30", () => {
    const cols = getTableColumns(doctorSchedules);
    expect(cols.slotDurationMinutes.hasDefault).toBe(true);
    expect(cols.slotDurationMinutes.default).toBe(30);
  });

  it("patients table has all required columns", () => {
    const cols = getTableColumns(patients);
    expect(cols.id).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.dateOfBirth).toBeDefined();
    expect(cols.gender).toBeDefined();
    expect(cols.bloodType).toBeDefined();
    expect(cols.allergies).toBeDefined();
    expect(cols.emergencyContactName).toBeDefined();
    expect(cols.emergencyContactPhone).toBeDefined();
  });

  it("patients.userId is unique (one patient profile per user)", () => {
    const cols = getTableColumns(patients);
    expect(cols.userId.isUnique).toBe(true);
  });

  it("appointments table has all required columns", () => {
    const cols = getTableColumns(appointments);
    expect(cols.id).toBeDefined();
    expect(cols.patientId).toBeDefined();
    expect(cols.doctorId).toBeDefined();
    expect(cols.appointmentDate).toBeDefined();
    expect(cols.startTime).toBeDefined();
    expect(cols.endTime).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.reason).toBeDefined();
    expect(cols.notes).toBeDefined();
    expect(cols.createdAt).toBeDefined();
    expect(cols.updatedAt).toBeDefined();
  });

  it("appointments.status defaults to pending", () => {
    const cols = getTableColumns(appointments);
    expect(cols.status.hasDefault).toBe(true);
    expect(cols.status.default).toBe("pending");
  });

  it("appointments.type defaults to consultation", () => {
    const cols = getTableColumns(appointments);
    expect(cols.type.hasDefault).toBe(true);
    expect(cols.type.default).toBe("consultation");
  });

  it("medicalRecords table has all required columns", () => {
    const cols = getTableColumns(medicalRecords);
    expect(cols.id).toBeDefined();
    expect(cols.appointmentId).toBeDefined();
    expect(cols.patientId).toBeDefined();
    expect(cols.doctorId).toBeDefined();
    expect(cols.diagnosis).toBeDefined();
    expect(cols.symptoms).toBeDefined();
    expect(cols.notes).toBeDefined();
    expect(cols.createdAt).toBeDefined();
  });

  it("medicalRecords.appointmentId is unique (one record per appointment)", () => {
    const cols = getTableColumns(medicalRecords);
    expect(cols.appointmentId.isUnique).toBe(true);
  });

  it("medicalRecordAttachments table has all required columns", () => {
    const cols = getTableColumns(medicalRecordAttachments);
    expect(cols.id).toBeDefined();
    expect(cols.medicalRecordId).toBeDefined();
    expect(cols.fileName).toBeDefined();
    expect(cols.fileUrl).toBeDefined();
    expect(cols.fileType).toBeDefined();
    expect(cols.fileSize).toBeDefined();
  });

  it("prescriptions table has all required columns", () => {
    const cols = getTableColumns(prescriptions);
    expect(cols.id).toBeDefined();
    expect(cols.medicalRecordId).toBeDefined();
    expect(cols.notes).toBeDefined();
    expect(cols.createdAt).toBeDefined();
  });

  it("prescriptionItems table has all required columns", () => {
    const cols = getTableColumns(prescriptionItems);
    expect(cols.id).toBeDefined();
    expect(cols.prescriptionId).toBeDefined();
    expect(cols.medicationName).toBeDefined();
    expect(cols.dosage).toBeDefined();
    expect(cols.frequency).toBeDefined();
    expect(cols.duration).toBeDefined();
    expect(cols.instructions).toBeDefined();
  });

  it("invoices table has all required columns", () => {
    const cols = getTableColumns(invoices);
    expect(cols.id).toBeDefined();
    expect(cols.appointmentId).toBeDefined();
    expect(cols.patientId).toBeDefined();
    expect(cols.amount).toBeDefined();
    expect(cols.tax).toBeDefined();
    expect(cols.total).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.dueDate).toBeDefined();
    expect(cols.paidAt).toBeDefined();
    expect(cols.createdAt).toBeDefined();
  });

  it("invoices.appointmentId is unique (one invoice per appointment)", () => {
    const cols = getTableColumns(invoices);
    expect(cols.appointmentId.isUnique).toBe(true);
  });

  it("invoices.status defaults to pending", () => {
    const cols = getTableColumns(invoices);
    expect(cols.status.hasDefault).toBe(true);
    expect(cols.status.default).toBe("pending");
  });

  it("reviews table has all required columns", () => {
    const cols = getTableColumns(reviews);
    expect(cols.id).toBeDefined();
    expect(cols.appointmentId).toBeDefined();
    expect(cols.patientId).toBeDefined();
    expect(cols.doctorId).toBeDefined();
    expect(cols.rating).toBeDefined();
    expect(cols.comment).toBeDefined();
    expect(cols.createdAt).toBeDefined();
  });

  it("reviews.appointmentId is unique (one review per appointment)", () => {
    const cols = getTableColumns(reviews);
    expect(cols.appointmentId.isUnique).toBe(true);
  });

  it("notifications table has all required columns", () => {
    const cols = getTableColumns(notifications);
    expect(cols.id).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.title).toBeDefined();
    expect(cols.message).toBeDefined();
    expect(cols.type).toBeDefined();
    expect(cols.isRead).toBeDefined();
    expect(cols.link).toBeDefined();
    expect(cols.createdAt).toBeDefined();
  });

  it("notifications.isRead defaults to false", () => {
    const cols = getTableColumns(notifications);
    expect(cols.isRead.hasDefault).toBe(true);
    expect(cols.isRead.default).toBe(false);
  });
});

function getFkForColumn(table: Parameters<typeof getTableConfig>[0], columnName: string) {
  const config = getTableConfig(table);
  return config.foreignKeys.find((fk) =>
    fk.reference().columns.some((col) => col.name === columnName)
  );
}

function getFkTarget(table: Parameters<typeof getTableConfig>[0], columnName: string) {
  const config = getTableConfig(table);
  const fk = config.foreignKeys.find((fk) =>
    fk.reference().columns.some((col) => col.name === columnName)
  );
  return fk ? fk.reference() : undefined;
}

describe("Schema: foreign key references", () => {
  it("doctors.userId references users.id", () => {
    const fk = getFkForColumn(doctors, "user_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("users");
  });

  it("doctors.departmentId references departments.id", () => {
    const fk = getFkForColumn(doctors, "department_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("departments");
  });

  it("doctorSchedules.doctorId references doctors.id", () => {
    const fk = getFkForColumn(doctorSchedules, "doctor_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("doctors");
  });

  it("patients.userId references users.id with cascade delete", () => {
    const fk = getFkForColumn(patients, "user_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("users");
  });

  it("appointments.patientId references patients.id", () => {
    const fk = getFkForColumn(appointments, "patient_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("patients");
  });

  it("appointments.doctorId references doctors.id", () => {
    const fk = getFkForColumn(appointments, "doctor_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("doctors");
  });

  it("medicalRecords.appointmentId references appointments.id", () => {
    const fk = getFkForColumn(medicalRecords, "appointment_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("appointments");
  });

  it("medicalRecordAttachments.medicalRecordId references medicalRecords.id", () => {
    const fk = getFkForColumn(medicalRecordAttachments, "medical_record_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("medical_records");
  });

  it("prescriptions.medicalRecordId references medicalRecords.id", () => {
    const fk = getFkForColumn(prescriptions, "medical_record_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("medical_records");
  });

  it("prescriptionItems.prescriptionId references prescriptions.id", () => {
    const fk = getFkForColumn(prescriptionItems, "prescription_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("prescriptions");
  });

  it("invoices.appointmentId references appointments.id", () => {
    const fk = getFkForColumn(invoices, "appointment_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("appointments");
  });

  it("invoices.patientId references patients.id", () => {
    const fk = getFkForColumn(invoices, "patient_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("patients");
  });

  it("reviews.appointmentId references appointments.id", () => {
    const fk = getFkForColumn(reviews, "appointment_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("appointments");
  });

  it("reviews.patientId references patients.id", () => {
    const fk = getFkForColumn(reviews, "patient_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("patients");
  });

  it("reviews.doctorId references doctors.id", () => {
    const fk = getFkForColumn(reviews, "doctor_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("doctors");
  });

  it("notifications.userId references users.id with cascade delete", () => {
    const fk = getFkForColumn(notifications, "user_id");
    expect(fk).toBeDefined();
    expect(getTableName(fk!.reference().foreignTable)).toBe("users");
  });
});
