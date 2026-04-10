/**
 * Database seed script — populates the database with realistic demo data
 * for development and QA testing purposes.
 *
 * Usage: pnpm db:seed
 */
import { db } from "./index";
import {
  users,
  departments,
  doctors,
  patients,
  doctorSchedules,
  appointments,
} from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // --- Users ---
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@caresync.dev",
      passwordHash,
      role: "admin",
      firstName: "Admin",
      lastName: "User",
      phone: "+1-555-000-0001",
      isActive: true,
    })
    .returning();

  const [doctorUser] = await db
    .insert(users)
    .values({
      email: "dr.smith@caresync.dev",
      passwordHash,
      role: "doctor",
      firstName: "John",
      lastName: "Smith",
      phone: "+1-555-000-0002",
      isActive: true,
    })
    .returning();

  const [patientUser] = await db
    .insert(users)
    .values({
      email: "jane.doe@caresync.dev",
      passwordHash,
      role: "patient",
      firstName: "Jane",
      lastName: "Doe",
      phone: "+1-555-000-0003",
      isActive: true,
    })
    .returning();

  console.log("  ✓ Users created");

  // --- Departments ---
  const [generalMed] = await db
    .insert(departments)
    .values({
      name: "General Medicine",
      description: "Primary care and general health consultations",
      isActive: true,
    })
    .returning();

  const [cardiology] = await db
    .insert(departments)
    .values({
      name: "Cardiology",
      description: "Heart and cardiovascular system specialists",
      isActive: true,
    })
    .returning();

  console.log("  ✓ Departments created");

  // --- Doctors ---
  const [doctor] = await db
    .insert(doctors)
    .values({
      userId: doctorUser.id,
      departmentId: generalMed.id,
      specialization: "General Practice",
      bio: "10+ years of experience in primary care.",
      licenseNumber: "LIC-001234",
    })
    .returning();

  console.log("  ✓ Doctors created");

  // --- Doctor schedules (Mon–Fri, 09:00–17:00, 30-min slots) ---
  const weekdays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ] as const;

  await db.insert(doctorSchedules).values(
    weekdays.map((day) => ({
      doctorId: doctor.id,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
      slotDurationMinutes: 30,
    }))
  );

  console.log("  ✓ Doctor schedules created");

  // --- Patients ---
  const [patient] = await db
    .insert(patients)
    .values({
      userId: patientUser.id,
      dateOfBirth: "1990-06-15",
      gender: "female",
      bloodType: "A+",
      emergencyContactName: "John Doe",
      emergencyContactPhone: "+1-555-000-0099",
    })
    .returning();

  console.log("  ✓ Patients created");

  // --- Sample appointment ---
  await db.insert(appointments).values({
    patientId: patient.id,
    doctorId: doctor.id,
    appointmentDate: "2026-04-15",
    startTime: "10:00",
    endTime: "10:30",
    status: "confirmed",
    type: "consultation",
    reason: "Annual checkup",
  });

  console.log("  ✓ Appointments created");
  console.log("");
  console.log("✅ Seed complete!");
  console.log("");
  console.log("Demo accounts (password: Password123!):");
  console.log(`  Admin:   ${admin.email}`);
  console.log(`  Doctor:  ${doctorUser.email}`);
  console.log(`  Patient: ${patientUser.email}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
