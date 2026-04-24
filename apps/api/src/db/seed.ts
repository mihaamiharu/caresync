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

// Date-of-birth → "YYYY-MM-DD" string for age in years 2026
function ageToDob(years: number): string {
  const birthYear = 2026 - years;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  return `${birthYear}-${month}-${day}`;
}

const patientProfiles = [
  // Pediatric / young (5 patients, ages 3-17)
  { firstName: "Emma", lastName: "Thompson", dob: ageToDob(5), gender: "female" as const, bloodType: "A+", allergies: null, ecName: "Rachel Thompson", ecPhone: "+1-555-100-0001" },
  { firstName: "Liam", lastName: "O'Brien", dob: ageToDob(8), gender: "male" as const, bloodType: "O+", allergies: "Penicillin", ecName: "Sean O'Brien", ecPhone: "+1-555-100-0002" },
  { firstName: "Sophia", lastName: "Rivera", dob: ageToDob(12), gender: "female" as const, bloodType: "B+", allergies: null, ecName: "Maria Rivera", ecPhone: "+1-555-100-0003" },
  { firstName: "Noah", lastName: "Kim", dob: ageToDob(3), gender: "male" as const, bloodType: "AB+", allergies: "Peanuts", ecName: "Ji-Yeon Kim", ecPhone: "+1-555-100-0004" },
  { firstName: "Isabella", lastName: "Fischer", dob: ageToDob(16), gender: "female" as const, bloodType: "O-", allergies: null, ecName: "Klaus Fischer", ecPhone: "+1-555-100-0005" },
  // Young adult (8 patients, ages 18-35)
  { firstName: "Mia", lastName: "Chen", dob: ageToDob(24), gender: "female" as const, bloodType: "A-", allergies: null, ecName: "Wei Chen", ecPhone: "+1-555-100-0006" },
  { firstName: "Ethan", lastName: "Nakamura", dob: ageToDob(29), gender: "male" as const, bloodType: "B+", allergies: "Sulfa drugs", ecName: "Haruki Nakamura", ecPhone: "+1-555-100-0007" },
  { firstName: "Ava", lastName: "Okafor", dob: ageToDob(22), gender: "female" as const, bloodType: "O+", allergies: null, ecName: "Chidi Okafor", ecPhone: "+1-555-100-0008" },
  { firstName: "James", lastName: "Bergmann", dob: ageToDob(31), gender: "male" as const, bloodType: "A+", allergies: null, ecName: "Klaus Bergmann", ecPhone: "+1-555-100-0009" },
  { firstName: "Charlotte", lastName: "Dubois", dob: ageToDob(27), gender: "female" as const, bloodType: "AB-", allergies: "Latex", ecName: "Pierre Dubois", ecPhone: "+1-555-100-0010" },
  { firstName: "Benjamin", lastName: "Santos", dob: ageToDob(35), gender: "male" as const, bloodType: "O+", allergies: null, ecName: "Ana Santos", ecPhone: "+1-555-100-0011" },
  { firstName: "Amelia", lastName: "Hansen", dob: ageToDob(21), gender: "female" as const, bloodType: "A+", allergies: "Ibuprofen", ecName: "Lars Hansen", ecPhone: "+1-555-100-0012" },
  // Middle-aged (10 patients, ages 36-55)
  { firstName: "Lucas", lastName: "Andersen", dob: ageToDob(45), gender: "male" as const, bloodType: "A-", allergies: null, ecName: "Mette Andersen", ecPhone: "+1-555-100-0013" },
  { firstName: "Harper", lastName: "Müller", dob: ageToDob(42), gender: "female" as const, bloodType: "B+", allergies: null, ecName: "Thomas Müller", ecPhone: "+1-555-100-0014" },
  { firstName: "Alexander", lastName: "Yamamoto", dob: ageToDob(50), gender: "male" as const, bloodType: "O+", allergies: "Codeine", ecName: "Akiko Yamamoto", ecPhone: "+1-555-100-0015" },
  { firstName: "Evelyn", lastName: "Laurent", dob: ageToDob(38), gender: "female" as const, bloodType: "A+", allergies: null, ecName: "Jean-Pierre Laurent", ecPhone: "+1-555-100-0016" },
  { firstName: "Daniel", lastName: "Ivanov", dob: ageToDob(53), gender: "male" as const, bloodType: "AB+", allergies: null, ecName: "Natasha Ivanova", ecPhone: "+1-555-100-0017" },
  { firstName: "Abigail", lastName: "Nielsen", dob: ageToDob(40), gender: "female" as const, bloodType: "O-", allergies: "Aspirin", ecName: "Henrik Nielsen", ecPhone: "+1-555-100-0018" },
  { firstName: "Matthew", lastName: "Park", dob: ageToDob(48), gender: "male" as const, bloodType: "B-", allergies: null, ecName: "Soo-Jin Park", ecPhone: "+1-555-100-0019" },
  { firstName: "Emily", lastName: "Rossi", dob: ageToDob(44), gender: "female" as const, bloodType: "A+", allergies: null, ecName: "Marco Rossi", ecPhone: "+1-555-100-0020" },
  { firstName: "Sebastian", lastName: "Weber", dob: ageToDob(55), gender: "male" as const, bloodType: "O+", allergies: null, ecName: "Ingrid Weber", ecPhone: "+1-555-100-0021" },
  { firstName: "Elizabeth", lastName: "Tanaka", dob: ageToDob(39), gender: "female" as const, bloodType: "B+", allergies: "Morphine", ecName: "Kenji Tanaka", ecPhone: "+1-555-100-0022" },
  // Senior (7 patients, ages 56-78)
  { firstName: "David", lastName: "Johansson", dob: ageToDob(65), gender: "male" as const, bloodType: "A+", allergies: null, ecName: "Eva Johansson", ecPhone: "+1-555-100-0023" },
  { firstName: "Scarlett", lastName: "Kowalczyk", dob: ageToDob(70), gender: "female" as const, bloodType: "O+", allergies: "Penicillin", ecName: "Piotr Kowalczyk", ecPhone: "+1-555-100-0024" },
  { firstName: "Joseph", lastName: "Volkov", dob: ageToDob(62), gender: "male" as const, bloodType: "AB-", allergies: null, ecName: "Olga Volkova", ecPhone: "+1-555-100-0025" },
  { firstName: "Victoria", lastName: "Papadopoulos", dob: ageToDob(58), gender: "female" as const, bloodType: "B+", allergies: null, ecName: "Nikos Papadopoulos", ecPhone: "+1-555-100-0026" },
  { firstName: "Samuel", lastName: "Abebe", dob: ageToDob(72), gender: "male" as const, bloodType: "O-", allergies: "Sulfonamides", ecName: "Tigist Abebe", ecPhone: "+1-555-100-0027" },
  { firstName: "Grace", lastName: "Lindqvist", dob: ageToDob(67), gender: "female" as const, bloodType: "A-", allergies: null, ecName: "Sven Lindqvist", ecPhone: "+1-555-100-0028" },
  { firstName: "Henry", lastName: "Oduya", dob: ageToDob(78), gender: "male" as const, bloodType: "B+", allergies: null, ecName: "Funke Oduya", ecPhone: "+1-555-100-0029" },
  { firstName: "Robert", lastName: "Fernandez", dob: ageToDob(61), gender: "male" as const, bloodType: "A+", allergies: null, ecName: "Carmen Fernandez", ecPhone: "+1-555-100-0030" },
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

  // Patients
  const patientEmailMap: Record<number, string> = {
    0: "patient@caresync.dev",
  };
  const patientUsers = await db
    .insert(users)
    .values(
      patientProfiles.map((p, i) => ({
        email: patientEmailMap[i] ?? `patient${i > 0 ? i + 1 : ""}@caresync.dev`,
        passwordHash,
        role: "patient" as const,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: `+1-555-1${String(i).padStart(3, "0")}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        isActive: true,
      }))
    )
    .returning();

  const patientRows = await db
    .insert(patients)
    .values(
      patientProfiles.map((p, i) => ({
        userId: patientUsers[i].id,
        dateOfBirth: p.dob,
        gender: p.gender,
        bloodType: p.bloodType,
        allergies: p.allergies,
        emergencyContactName: p.ecName,
        emergencyContactPhone: p.ecPhone,
      }))
    )
    .returning();

  if (patientRows.length !== patientProfiles.length) {
    console.warn(`  ⚠ Expected ${patientProfiles.length} patients, got ${patientRows.length}`);
  }
  console.log(`  ✓ ${patientRows.length} patients created`);

  console.log("");
  console.log(`Slice 2 complete: ${patientRows.length} patients seeded with varied demographics.`);
  console.log("Demo patient accounts (password: Password123!):");
  patientUsers.forEach((u) => console.log(`  ${u.email}`));

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
