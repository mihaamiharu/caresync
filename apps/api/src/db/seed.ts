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
  medicalRecords,
  prescriptions,
  prescriptionItems,
  invoices,
  reviews,
  notifications,
} from "./schema";
import bcrypt from "bcryptjs";

const passwordHash = await bcrypt.hash("Password123!", 10);

// ─── Profile Data ─────────────────────────────────────────────────────────────

const departmentProfiles = [
  { name: "General Medicine", description: "Primary care and general health consultations" },
  { name: "Cardiology", description: "Heart and cardiovascular system specialists" },
  { name: "Orthopedics", description: "Bone, joint, and musculoskeletal system care" },
  { name: "Pediatrics", description: "Medical care for infants, children, and adolescents" },
  { name: "Dermatology", description: "Skin, hair, and nail conditions" },
];

const adminProfiles = [
  { email: "admin@caresync.dev", firstName: "Admin", lastName: "User", phone: "+1-555-000-0001" },
  { email: "admin2@caresync.dev", firstName: "Sarah", lastName: "Johnson", phone: "+1-555-000-0011" },
  { email: "admin3@caresync.dev", firstName: "Michael", lastName: "Chen", phone: "+1-555-000-0012" },
];

const doctorProfiles = [
  // General Medicine (2)
  {
    email: "dr.smith@caresync.dev",
    firstName: "John",
    lastName: "Smith",
    phone: "+1-555-000-0002",
    specialization: "Family Medicine",
    bio: "15 years of experience in family and community medicine.",
    licenseNumber: "LIC-001234",
    departmentIndex: 0,
    schedule: [
      { day: "monday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "tuesday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "wednesday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "thursday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "friday", start: "09:00", end: "13:00", slotMinutes: 30 },
    ],
  },
  {
    email: "dr.ogi@caresync.dev",
    firstName: "Yuki",
    lastName: "Oginski",
    phone: "+1-555-000-0006",
    specialization: "Internal Medicine",
    bio: "Specialist in complex diagnostic cases and chronic disease management.",
    licenseNumber: "LIC-001235",
    departmentIndex: 0,
    schedule: [
      { day: "monday", start: "08:00", end: "16:00", slotMinutes: 30 },
      { day: "tuesday", start: "08:00", end: "16:00", slotMinutes: 30 },
      { day: "wednesday", start: "10:00", end: "18:00", slotMinutes: 30 },
      { day: "thursday", start: "08:00", end: "16:00", slotMinutes: 30 },
      { day: "friday", start: "08:00", end: "14:00", slotMinutes: 30 },
    ],
  },
  // Cardiology (2)
  {
    email: "dr.jones@caresync.dev",
    firstName: "Emily",
    lastName: "Jones",
    phone: "+1-555-000-0004",
    specialization: "Interventional Cardiology",
    bio: "Expert in minimally invasive cardiac procedures and electrophysiology.",
    licenseNumber: "LIC-005678",
    departmentIndex: 1,
    schedule: [
      { day: "monday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "tuesday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "wednesday", start: "09:00", end: "13:00", slotMinutes: 30 },
      { day: "thursday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "friday", start: "09:00", end: "17:00", slotMinutes: 30 },
    ],
  },
  {
    email: "dr.patel@caresync.dev",
    firstName: "Raj",
    lastName: "Patel",
    phone: "+1-555-000-0007",
    specialization: "Cardiology",
    bio: "Focused on preventive cardiology and cardiac rehabilitation.",
    licenseNumber: "LIC-005679",
    departmentIndex: 1,
    schedule: [
      { day: "tuesday", start: "10:00", end: "18:00", slotMinutes: 30 },
      { day: "wednesday", start: "10:00", end: "18:00", slotMinutes: 30 },
      { day: "thursday", start: "10:00", end: "18:00", slotMinutes: 30 },
      { day: "friday", start: "09:00", end: "15:00", slotMinutes: 30 },
      { day: "saturday", start: "09:00", end: "13:00", slotMinutes: 30 },
    ],
  },
  // Orthopedics (2)
  {
    email: "dr.kowalski@caresync.dev",
    firstName: "Anna",
    lastName: "Kowalski",
    phone: "+1-555-000-0008",
    specialization: "Pediatric Orthopedics",
    bio: "Specializes in growth-related orthopedic conditions in children and adolescents.",
    licenseNumber: "LIC-003456",
    departmentIndex: 2,
    schedule: [
      { day: "monday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "tuesday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "wednesday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "thursday", start: "09:00", end: "17:00", slotMinutes: 30 },
    ],
  },
  {
    email: "dr.adebayo@caresync.dev",
    firstName: "Kemi",
    lastName: "Adebayo",
    phone: "+1-555-000-0009",
    specialization: "Sports Medicine & Orthopedics",
    bio: "Treats sports injuries and performance optimization for athletes.",
    licenseNumber: "LIC-003457",
    departmentIndex: 2,
    schedule: [
      { day: "monday", start: "07:00", end: "15:00", slotMinutes: 30 },
      { day: "wednesday", start: "07:00", end: "15:00", slotMinutes: 30 },
      { day: "friday", start: "07:00", end: "15:00", slotMinutes: 30 },
      { day: "saturday", start: "08:00", end: "12:00", slotMinutes: 30 },
    ],
  },
  // Pediatrics (2)
  {
    email: "dr.nguyen@caresync.dev",
    firstName: "Linda",
    lastName: "Nguyen",
    phone: "+1-555-000-0010",
    specialization: "General Pediatrics",
    bio: "Dedicated to comprehensive pediatric care from birth through adolescence.",
    licenseNumber: "LIC-007890",
    departmentIndex: 3,
    schedule: [
      { day: "monday", start: "08:30", end: "16:30", slotMinutes: 30 },
      { day: "tuesday", start: "08:30", end: "16:30", slotMinutes: 30 },
      { day: "wednesday", start: "08:30", end: "16:30", slotMinutes: 30 },
      { day: "thursday", start: "08:30", end: "16:30", slotMinutes: 30 },
      { day: "friday", start: "08:30", end: "12:30", slotMinutes: 30 },
    ],
  },
  {
    email: "dr.martinez@caresync.dev",
    firstName: "Carlos",
    lastName: "Martinez",
    phone: "+1-555-000-0013",
    specialization: "Neonatology",
    bio: "Specialist in newborn intensive care and developmental pediatrics.",
    licenseNumber: "LIC-007891",
    departmentIndex: 3,
    schedule: [
      { day: "monday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "tuesday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "thursday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "friday", start: "09:00", end: "13:00", slotMinutes: 30 },
    ],
  },
  // Dermatology (2)
  {
    email: "dr.wong@caresync.dev",
    firstName: "Grace",
    lastName: "Wong",
    phone: "+1-555-000-0014",
    specialization: "Medical Dermatology",
    bio: "Expert in chronic skin conditions including eczema, psoriasis, and autoimmune disorders.",
    licenseNumber: "LIC-004321",
    departmentIndex: 4,
    schedule: [
      { day: "monday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "tuesday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "wednesday", start: "09:00", end: "17:00", slotMinutes: 30 },
      { day: "thursday", start: "09:00", end: "17:00", slotMinutes: 30 },
    ],
  },
  {
    email: "dr.tanaka@caresync.dev",
    firstName: "Hiro",
    lastName: "Tanaka",
    phone: "+1-555-000-0015",
    specialization: "Cosmetic & Surgical Dermatology",
    bio: "Specializes in skin cancer detection, Mohs surgery, and cosmetic procedures.",
    licenseNumber: "LIC-004322",
    departmentIndex: 4,
    schedule: [
      { day: "tuesday", start: "10:00", end: "18:00", slotMinutes: 30 },
      { day: "wednesday", start: "10:00", end: "18:00", slotMinutes: 30 },
      { day: "thursday", start: "10:00", end: "18:00", slotMinutes: 30 },
      { day: "friday", start: "09:00", end: "15:00", slotMinutes: 30 },
      { day: "saturday", start: "09:00", end: "13:00", slotMinutes: 30 },
    ],
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database...");

  // Cleanup (reverse dependency order)
  console.log("  🧹 Cleaning up existing data...");
  await db.delete(prescriptionItems);
  await db.delete(prescriptions);
  await db.delete(reviews);
  await db.delete(medicalRecords);
  await db.delete(appointments);
  await db.delete(doctorSchedules);
  await db.delete(invoices);
  await db.delete(patients);
  await db.delete(doctors);
  await db.delete(departments);
  await db.delete(users);
  console.log("  ✓ Cleanup complete");

  // Departments
  const deptRows = await db
    .insert(departments)
    .values(
      departmentProfiles.map((d) => ({ name: d.name, description: d.description, isActive: true }))
    )
    .returning();
  console.log(`  ✓ ${deptRows.length} departments created`);

  // Admins
  const adminUsers = await db
    .insert(users)
    .values(
      adminProfiles.map((a) => ({
        email: a.email,
        passwordHash,
        role: "admin" as const,
        firstName: a.firstName,
        lastName: a.lastName,
        phone: a.phone,
        isActive: true,
      }))
    )
    .returning();
  console.log(`  ✓ ${adminUsers.length} admin users created`);

  // Doctors
  const doctorUsers = await db
    .insert(users)
    .values(
      doctorProfiles.map((d) => ({
        email: d.email,
        passwordHash,
        role: "doctor" as const,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        isActive: true,
      }))
    )
    .returning();

  const doctorRows = await db
    .insert(doctors)
    .values(
      doctorProfiles.map((d, i) => ({
        userId: doctorUsers[i].id,
        departmentId: deptRows[d.departmentIndex].id,
        specialization: d.specialization,
        bio: d.bio,
        licenseNumber: d.licenseNumber,
      }))
    )
    .returning();

  // Doctor schedules
  const scheduleRows = [];
  for (let i = 0; i < doctorProfiles.length; i++) {
    const sched = doctorProfiles[i].schedule;
    scheduleRows.push(
      ...sched.map((s) => ({
        doctorId: doctorRows[i].id,
        dayOfWeek: s.day as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
        startTime: s.start,
        endTime: s.end,
        slotDurationMinutes: s.slotMinutes,
      }))
    );
  }
  await db.insert(doctorSchedules).values(scheduleRows);
  console.log(`  ✓ ${doctorRows.length} doctors created with varied schedules`);

  // Placeholder log — patients and beyond will be added in subsequent slices
  console.log("");
  console.log("Slice 1 complete: departments, admins, doctors, schedules seeded.");
  console.log("");
  console.log("Demo admin accounts (password: Password123!):");
  adminUsers.forEach((u) => console.log(`  ${u.email}`));

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
