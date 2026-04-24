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
  await db.delete(invoices);
  await db.delete(appointments);
  await db.delete(doctorSchedules);
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

  // ─── Appointments ─────────────────────────────────────────────────────────
  // Status distribution: ~25 completed, ~10 confirmed, ~8 pending, ~4 cancelled, ~3 no-show, ~1 in-progress
  // Type distribution: ~60% consultation, ~30% follow-up, ~10% emergency
  // Date range: Feb 1 – May 31 2026

  type ApptStatus = "pending" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
  type ApptType = "consultation" | "follow-up" | "emergency";

  const appointmentDefinitions: Array<{
    patientIndex: number;
    doctorIndex: number;
    date: string;
    startTime: string;
    endTime: string;
    status: ApptStatus;
    type: ApptType;
    reason: string;
  }> = [];

  let idx = 0;
  const reasons = {
    general: ["Annual physical", "Persistent cough", "Fatigue and low energy", "Headaches", "Skin rash", "Follow-up: blood pressure", "Follow-up: diabetes management", "Joint pain", "Abdominal pain", "Sleep difficulties"],
    cardiology: ["Chest discomfort on exertion", "Palpitations", "Family history of heart disease", "Dizziness", "Shortness of breath", "Post-procedure follow-up"],
    orthopedics: ["Knee pain after running", "Ankle sprain", "Lower back pain", "Shoulder stiffness", "Sports injury assessment", "Post-fracture follow-up"],
    pediatrics: ["Ear infection", "Fever and fussiness", "Vaccination schedule", "Growth check", "Skin condition", "Behavioral concerns"],
    dermatology: ["Moles consultation", "Acne treatment", "Eczema flare-up", "Psoriasis management", "Skin biopsy follow-up", "Cosmetic procedure consultation"],
  };

  const deptReasons = [
    reasons.general,
    reasons.cardiology,
    reasons.orthopedics,
    reasons.pediatrics,
    reasons.dermatology,
  ];

  function rand<T>(arr: T[]): T {
    return arr[Math.floor(fixedRand() * arr.length)];
  }

  let _seed = 42;
  function fixedRand() {
    _seed = (_seed * 1664525 + 1013904223) & 0xffffffff;
    return (_seed >>> 0) / 0xffffffff;
  }

  function addAppt(
    patientIdx: number,
    doctorIdx: number,
    date: string,
    hour: number,
    minute: number,
    status: ApptStatus,
    type: ApptType,
    reason: string
  ) {
    const start = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const endH = minute === 30 ? hour + 1 : hour;
    const endM = minute === 30 ? 0 : 30;
    const end = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    appointmentDefinitions.push({ patientIndex: patientIdx, doctorIndex: doctorIdx, date, startTime: start, endTime: end, status, type, reason });
    idx++;
  }

  // Helper to add appointments across a date range
  function addApptsForDoctor(
    doctorIdx: number,
    startDate: string,
    endDate: string,
    statuses: ApptStatus[],
    types: ApptType[],
    count: number
  ) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const startTs = new Date(sy, sm - 1, sd).getTime();
    const endTs = new Date(ey, em - 1, ed).getTime();
    for (let i = 0; i < count; i++) {
      const ts = startTs + fixedRand() * (endTs - startTs);
      const d = new Date(ts);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const hour = 8 + Math.floor(fixedRand() * 9);
      const minute = fixedRand() > 0.5 ? 30 : 0;
      const patientIdx = Math.floor(fixedRand() * patientRows.length);
      appointmentDefinitions.push({
        patientIndex: patientIdx,
        doctorIndex: doctorIdx,
        date,
        startTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        endTime: `${String(hour + (minute === 30 ? 1 : 0)).padStart(2, "0")}:${minute === 30 ? "00" : "30"}`,
        status: rand(statuses),
        type: rand(types),
        reason: rand(deptReasons[doctorProfiles[doctorIdx].departmentIndex]),
      });
    }
  }

  // Completed: ~25 (Feb–early Apr)
  addApptsForDoctor(0, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up", "emergency"], 8);
  addApptsForDoctor(1, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up"], 4);
  addApptsForDoctor(2, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up", "emergency"], 5);
  addApptsForDoctor(3, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up"], 3);
  addApptsForDoctor(4, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up"], 2);
  addApptsForDoctor(5, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up", "emergency"], 3);
  addApptsForDoctor(6, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up"], 2);
  addApptsForDoctor(7, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up"], 2);
  addApptsForDoctor(8, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up"], 2);
  addApptsForDoctor(9, "2026-02-01", "2026-04-05", ["completed"], ["consultation", "follow-up"], 2);

  // Confirmed: ~10 (mid Apr – May)
  addApptsForDoctor(0, "2026-04-15", "2026-05-31", ["confirmed"], ["consultation", "follow-up"], 3);
  addApptsForDoctor(1, "2026-04-15", "2026-05-31", ["confirmed"], ["consultation"], 2);
  addApptsForDoctor(2, "2026-04-15", "2026-05-31", ["confirmed"], ["consultation", "emergency"], 2);
  addApptsForDoctor(3, "2026-04-15", "2026-05-31", ["confirmed"], ["consultation", "follow-up"], 2);
  addApptsForDoctor(4, "2026-04-15", "2026-05-31", ["confirmed"], ["consultation"], 1);

  // Pending: ~8 (Apr – May)
  addApptsForDoctor(0, "2026-04-20", "2026-05-31", ["pending"], ["consultation", "follow-up"], 3);
  addApptsForDoctor(1, "2026-04-20", "2026-05-31", ["pending"], ["consultation"], 2);
  addApptsForDoctor(5, "2026-04-20", "2026-05-31", ["pending"], ["consultation", "emergency"], 2);
  addApptsForDoctor(6, "2026-04-20", "2026-05-31", ["pending"], ["consultation"], 1);

  // Cancelled: ~4
  addApptsForDoctor(0, "2026-03-01", "2026-04-20", ["cancelled"], ["consultation"], 2);
  addApptsForDoctor(2, "2026-03-01", "2026-04-20", ["cancelled"], ["consultation"], 1);
  addApptsForDoctor(4, "2026-03-01", "2026-04-20", ["cancelled"], ["consultation"], 1);

  // No-show: ~3
  addApptsForDoctor(1, "2026-02-15", "2026-04-01", ["no-show"], ["consultation"], 2);
  addApptsForDoctor(3, "2026-02-15", "2026-04-01", ["no-show"], ["consultation"], 1);

  // In-progress: ~1
  addApptsForDoctor(0, "2026-04-25", "2026-04-25", ["in-progress"], ["consultation"], 1);

  const apptRows = await db
    .insert(appointments)
    .values(
      appointmentDefinitions.map((a) => ({
        patientId: patientRows[a.patientIndex].id,
        doctorId: doctorRows[a.doctorIndex].id,
        appointmentDate: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        type: a.type,
        reason: a.reason,
      }))
    )
    .returning();

  const statusCounts: Record<string, number> = {};
  for (const a of appointmentDefinitions) {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  }
  console.log(`  ✓ ${apptRows.length} appointments created`);
  Object.entries(statusCounts).forEach(([s, c]) => console.log(`    ${s}: ${c}`));

  console.log("");
  console.log("Slice 3 complete. Moving to next slice...");

  // ─── Medical Records + Prescriptions ────────────────────────────────────
  // ~20 completed appointments get medical records
  // ~15 of those also get prescriptions with items
  // Rest have no prescription (self-limiting conditions)

  const completedAppts = apptRows.filter((a) => a.status === "completed");
  const mrCount = Math.min(22, completedAppts.length);
  const selectedForMr = completedAppts.slice(0, mrCount);
  const selectedForRx = selectedForMr.slice(0, 16);

  const diagnosisMap: Record<string, { diagnosis: string; symptoms: string; notes: string | null }> = {
    "Annual physical": { diagnosis: "Healthy adult, no significant findings", symptoms: "None", notes: "Preventive care counseling provided. Vaccinations up to date." },
    "Persistent cough": { diagnosis: "Upper respiratory infection, likely viral", symptoms: "Dry cough for 2 weeks, no fever", notes: "Viral etiology suspected. Supportive care advised. Return if symptoms persist beyond 3 weeks." },
    "Fatigue and low energy": { diagnosis: "Iron deficiency anemia", symptoms: "Easy fatigability, pallor, shortness of breath on exertion", notes: "Ferritin and CBC ordered. Dietary iron advice given." },
    "Headaches": { diagnosis: "Tension-type headache", symptoms: "Bilateral pressing pain, no nausea or visual aura", notes: "Stress management and ergonomics advice. Ibuprofen PRN." },
    "Skin rash": { diagnosis: "Contact dermatitis", symptoms: "Pruritic erythematous patch on forearm", notes: "Topical corticosteroid prescribed. Identified probable irritant." },
    "Follow-up: blood pressure": { diagnosis: "Stage 1 hypertension", symptoms: "BP consistently 140/90 range", notes: "Lifestyle modifications discussed. Started on amlodipine 5mg daily." },
    "Follow-up: diabetes management": { diagnosis: "Type 2 diabetes mellitus, HbA1c 7.8%", symptoms: "Polydipsia, polyuria, mild fatigue", notes: "Metformin adjusted. Blood glucose monitoring recommended." },
    "Joint pain": { diagnosis: "Osteoarthritis, mild bilateral knee", symptoms: "Mechanical knee pain worse with activity, no swelling", notes: "Physiotherapy referral. Paracetamol PRN." },
    "Abdominal pain": { diagnosis: "Gastritis", symptoms: "Epigastric burning pain after meals", notes: "PPI therapy for 4 weeks. H. pylori testing arranged." },
    "Sleep difficulties": { diagnosis: "Insomnia, secondary", symptoms: "Difficulty initiating and maintaining sleep, daytime fatigue", notes: "Sleep hygiene counseling provided. Short-term zolpidem PRN." },
    "Chest discomfort on exertion": { diagnosis: "Stable angina pectoris", symptoms: "Retrosternal chest pressure on exertion, relieved by rest", notes: "Stress ECG arranged. GTN spray prescribed." },
    "Palpitations": { diagnosis: "Sinus tachycardia, anxiety-related", symptoms: "Intermittent awareness of heartbeat, no structural abnormality on ECG", notes: "Reassurance. Beta-blocker PRN for symptom control." },
    "Family history of heart disease": { diagnosis: "Hyperlipidemia, primary prevention", symptoms: "LDL 4.2 mmol/L, strong family history", notes: "Statin therapy initiated. Dietary modifications advised." },
    "Dizziness": { diagnosis: "Benign paroxysmal positional vertigo", symptoms: "Brief spinning vertigo with head movements", notes: "Epley maneuver demonstrated. Follow-up if recurrent." },
    "Shortness of breath": { diagnosis: "Mild asthma, partially controlled", symptoms: "Intermittent wheeze and dyspnea, especially at night", notes: "Inhaler technique corrected. Step-up to combination inhaler." },
    "Post-procedure follow-up": { diagnosis: "Post-cardiac catheterization, uncomplicated", symptoms: "No complaints, groin site clean", notes: "Discharge instructions reinforced. Dual antiplatelet continued." },
    "Knee pain after running": { diagnosis: "Patellofemoral pain syndrome", symptoms: "Anterior knee pain worse with stairs and running", notes: "Quadriceps strengthening exercises prescribed. Ice PRN." },
    "Ankle sprain": { diagnosis: "Grade II lateral ankle sprain", symptoms: "Swelling and bruising lateral ankle, weight-bearing painful", notes: "RICE protocol. Elastic bandage. Physiotherapy referral." },
    "Lower back pain": { diagnosis: "Acute lumbar strain", symptoms: "Low back pain after lifting, no radiculopathy", notes: "保持活动, avoid bed rest. NSAIDs prescribed. Return if sciatica develops." },
    "Shoulder stiffness": { diagnosis: "Adhesive capsulitis, early stage", symptoms: "Progressive loss of external rotation and abduction", notes: "Physiotherapy. Hydrocortisone injection if no improvement in 6 weeks." },
    "Sports injury assessment": { diagnosis: "Mild medial collateral ligament strain", symptoms: "Knee valgus stress pain, no instability", notes: "Knee brace prescribed. Graduated return to sport protocol." },
    "Post-fracture follow-up": { diagnosis: "Healing undisplaced radial fracture", symptoms: "Wrist pain resolving, range of motion improving", notes: "Physiotherapy exercises. X-ray at 6 weeks confirmed union." },
    "Ear infection": { diagnosis: "Acute otitis media, right ear", symptoms: "Ear pain, fever 38.5°C, red bulging tympanum", notes: "Amoxicillin prescribed. Review in 2 weeks." },
    "Fever and fussiness": { diagnosis: "Viral exanthem, likely roseola", symptoms: "High fever 3 days followed by maculopapular rash", notes: "Supportive care. Antipyretics for comfort. Return if fever recurs." },
    "Vaccination schedule": { diagnosis: "Routine immunization visit, up to date", symptoms: "No acute concerns", notes: "Vaccines administered per schedule. Post-vaccination monitoring 15 minutes." },
    "Growth check": { diagnosis: "Normal growth and development, 50th percentile", symptoms: "No concerns", notes: "Parental reassurance. Next review at 2 years." },
    "Behavioral concerns": { diagnosis: "Attention deficit hyperactivity disorder, suspected", symptoms: "Inattention and hyperactivity reported by school", notes: "Conners rating scale arranged. Pediatrician referral for full assessment." },
    "Moles consultation": { diagnosis: "Benign melanocytic nevi, no dysplastic features", symptoms: "Patient concerned about pigmented lesion on back", notes: "Dermoscopy performed. No excision needed. Annual skin check advised." },
    "Acne treatment": { diagnosis: "Acne vulgaris, moderate comedonal-pustular", symptoms: "Facial papules and pustules, scarring beginning", notes: "Topical retinoid + benzoyl peroxide combination prescribed." },
    "Eczema flare-up": { diagnosis: "Atopic dermatitis, moderate flare", symptoms: "Intensely pruritic eczematous plaques in antecubital fossae", notes: "Topical corticosteroid stepped up. Emollient use reinforced." },
    "Psoriasis management": { diagnosis: "Psoriasis vulgaris, plaque type, moderate", symptoms: "Well-demarcated erythematous plaques on elbows and knees", notes: "Vitamin D analogue prescribed. Phototherapy referral arranged." },
    "Skin biopsy follow-up": { diagnosis: "Basal cell carcinoma, post-excision", symptoms: "Healing surgical site, no recurrence signs", symptoms: "", notes: "Sutures removed. Wound care instructions given. Annual skin surveillance." },
    "Cosmetic procedure consultation": { diagnosis: "Patient seeking botulinum toxin for facial lines", symptoms: "Dynamic glabellar and forehead lines", notes: "Procedure explained. Consent obtained. Treatment arranged." },
  };

  const rxProfiles: Array<{
    apptId: string;
    patientId: string;
    doctorId: string;
    diagnosis: string;
    notes: string | null;
    items: Array<{ name: string; dosage: string; frequency: string; duration: string; instructions: string | null }>;
  }> = [
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Stage 1 hypertension",
      notes: "Monitor BP twice daily. Low-sodium diet advised.",
      items: [
        { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", duration: "90 days", instructions: "Take in the morning" },
        { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", duration: "90 days", instructions: "Take at the same time each day" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Type 2 diabetes mellitus, HbA1c 7.8%",
      notes: "Monitor blood glucose daily. HbA1c in 3 months.",
      items: [
        { name: "Metformin", dosage: "500mg", frequency: "Twice daily with meals", duration: "90 days", instructions: "Start once daily first week to reduce GI side effects" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Upper respiratory infection, likely viral",
      notes: "Supportive care. Return if symptoms worsen.",
      items: [
        { name: "Paracetamol", dosage: "500mg", frequency: "Every 6 hours PRN", duration: "5 days", instructions: "Take with food" },
        { name: "Saline nasal spray", dosage: "As needed", frequency: "Nasal", duration: "5 days", instructions: null },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Iron deficiency anemia",
      notes: "Take iron supplement on empty stomach with vitamin C.",
      items: [
        { name: "Ferrous sulfate", dosage: "200mg", frequency: "Three times daily", duration: "90 days", instructions: "30 minutes before meals" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Stable angina pectoris",
      notes: "GTN for acute episodes. Call emergency if pain persists >10 min.",
      items: [
        { name: "Nitroglycerin", dosage: "0.5mg sublingual", frequency: "PRN for chest pain", duration: "PRN", instructions: "Sit when taking" },
        { name: "Aspirin", dosage: "75mg", frequency: "Once daily", duration: "Ongoing", instructions: "Take with food" },
        { name: "Atorvastatin", dosage: "40mg", frequency: "Once at night", duration: "90 days", instructions: "Avoid grapefruit juice" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Grade II lateral ankle sprain",
      notes: "RICE protocol first 48 hours. Gradual weight-bearing as tolerated.",
      items: [
        { name: "Ibuprofen", dosage: "400mg", frequency: "Three times daily with food", duration: "7 days", instructions: "Take with food" },
        { name: "Elastic bandage", dosage: "As directed", frequency: "During activity", duration: "14 days", instructions: null },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Acute otitis media, right ear",
      notes: "Complete full course of antibiotics.",
      items: [
        { name: "Amoxicillin", dosage: "250mg", frequency: "Three times daily", duration: "7 days", instructions: "Complete the course even if feeling better" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Acne vulgaris, moderate comedonal-pustular",
      notes: "Apply medications to clean dry skin. Avoid picking.",
      items: [
        { name: "Adapalene 0.1%", dosage: "Topical", frequency: "Once at night", duration: "90 days", instructions: "Start 3x/week, increase to daily as tolerated" },
        { name: "Benzoyl peroxide 5%", dosage: "Topical", frequency: "Once in the morning", duration: "90 days", instructions: "May bleach clothing" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Atopic dermatitis, moderate flare",
      notes: "Emollient use at least twice daily. Identify and avoid triggers.",
      items: [
        { name: "Hydrocortisone butyrate 0.1%", dosage: "Topical", frequency: "Twice daily", duration: "14 days", instructions: "Apply thinly to affected areas" },
        { name: "Emollient cream", dosage: "Topical", frequency: "At least twice daily", duration: "Ongoing", instructions: "Use liberally and frequently" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Mild asthma, partially controlled",
      notes: "Check inhaler technique. Review in 4 weeks.",
      items: [
        { name: "Salbutamol inhaler", dosage: "100mcg", frequency: "PRN for symptoms", duration: "PRN", instructions: "2 puffs via spacer" },
        { name: "Fluticasone/Salmeterol", dosage: "250/50mcg", frequency: "Twice daily", duration: "90 days", instructions: "Rinse mouth after use" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Patellofemoral pain syndrome",
      notes: "Quad strengthening exercises 2x daily. Avoid aggravating activities.",
      items: [
        { name: "Paracetamol", dosage: "500mg", frequency: "Every 6 hours PRN", duration: "14 days", instructions: null },
        { name: "Knee brace", dosage: "As directed", frequency: "During sports", duration: "30 days", instructions: null },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Acute lumbar strain",
      notes: "Stay active. Avoid heavy lifting for 4 weeks.",
      items: [
        { name: "Diclofenac", dosage: "50mg", frequency: "Twice daily", duration: "7 days", instructions: "Take with food" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Tension-type headache",
      notes: "Stress management and ergonomic adjustments. Return if frequency increases.",
      items: [
        { name: "Paracetamol", dosage: "500mg", frequency: "Every 6 hours PRN", duration: "30 days", instructions: null },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Psoriasis vulgaris, plaque type, moderate",
      notes: "Phototherapy 3x/week. Topicals as adjunct.",
      items: [
        { name: "Calcipotriol 0.005% ointment", dosage: "Topical", frequency: "Twice daily", duration: "90 days", instructions: "Apply to plaques" },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Hyperlipidemia, primary prevention",
      notes: "Low-fat diet. Exercise 150 min/week. Repeat lipid panel in 3 months.",
      items: [
        { name: "Atorvastatin", dosage: "20mg", frequency: "Once at night", duration: "90 days", instructions: null },
      ],
    },
    {
      apptId: "", patientId: "", doctorId: "", diagnosis: "Insomnia, secondary",
      notes: "Sleep hygiene reinforcement. Short-term pharmacotherapy.",
      items: [
        { name: "Zolpidem", dosage: "10mg", frequency: "Once at bedtime PRN", duration: "14 days", instructions: "Take just before sleep" },
      ],
    },
  ];

  // Insert medical records
  const mrRows = await db
    .insert(medicalRecords)
    .values(
      selectedForMr.map((a) => {
        const diag = diagnosisMap[a.reason] ?? { diagnosis: "General consultation", symptoms: "As per history", notes: null };
        return {
          appointmentId: a.id,
          patientId: a.patientId,
          doctorId: a.doctorId,
          diagnosis: diag.diagnosis,
          symptoms: diag.symptoms,
          notes: diag.notes,
        };
      })
    )
    .returning();
  console.log(`  ✓ ${mrRows.length} medical records created`);

  // Insert prescriptions + prescription items for selected subset
  const mrByApptId = new Map(mrRows.map((mr) => [mr.appointmentId, mr]));
  const rxRows = await db
    .insert(prescriptions)
    .values(
      selectedForRx.map((_, i) => ({
        medicalRecordId: mrByApptId.get(selectedForRx[i].id)!.id,
        notes: rxProfiles[i].notes,
      }))
    )
    .returning();

  const rxItems = rxRows.flatMap((rx, i) =>
    rxProfiles[i].items.map((item) => ({
      prescriptionId: rx.id,
      medicationName: item.name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    }))
  );
  await db.insert(prescriptionItems).values(rxItems);
  console.log(`  ✓ ${rxRows.length} prescriptions with items created`);
  console.log(`  ✓ ${rxItems.length} prescription items created`);

  console.log("");
  console.log("Slice 4 complete. Moving to next slice...");

  // ─── Reviews ─────────────────────────────────────────────────────────────
  // 15+ reviews distributed across all 10 doctors (not concentrated on one)
  // Reviews drawn from patients who had completed appointments with each doctor

  const reviewComments = [
    "Excellent doctor, very thorough and professional.",
    "Great experience, highly recommended.",
    "Very attentive and explained everything clearly.",
    "Wait time was short, doctor was great.",
    "Friendly staff and excellent care.",
    "Dr. takes time to listen and answer questions.",
    "Very satisfied with the consultation.",
    "Clear instructions and kind demeanor.",
    "Thorough examination with great follow-up.",
    "Patient and helpful with my concerns.",
    "Professional and competent.",
    "Good bedside manner.",
    "Highly knowledgeable and empathetic.",
    "Efficient and effective care.",
    "Would recommend to family and friends.",
    "Detailed explanations, no rush.",
    "Gentle approach, put me at ease.",
  ];

  const completedApptsByDoctor = new Map<string, typeof apptRows>();
  for (const a of apptRows.filter((a) => a.status === "completed")) {
    const list = completedApptsByDoctor.get(a.doctorId) ?? [];
    list.push(a);
    completedApptsByDoctor.set(a.doctorId, list);
  }

  const reviewData: Array<{ appointmentId: string; patientId: string; doctorId: string; rating: number; comment: string }> = [];
  let commentIdx = 0;

  for (const doctor of doctorRows) {
    const docAppts = completedApptsByDoctor.get(doctor.id) ?? [];
    const reviewCount = Math.min(docAppts.length, 2 + Math.floor(fixedRand() * 2));
    for (let i = 0; i < reviewCount; i++) {
      const appt = docAppts[i % docAppts.length];
      reviewData.push({
        appointmentId: appt.id,
        patientId: appt.patientId,
        doctorId: doctor.id,
        rating: 3 + Math.floor(fixedRand() * 3),
        comment: reviewComments[commentIdx % reviewComments.length],
      });
      commentIdx++;
    }
  }

  const reviewRows = await db.insert(reviews).values(reviewData).returning();
  console.log(`  ✓ ${reviewRows.length} reviews created across ${new Set(reviewData.map((r) => r.doctorId)).size} doctors`);

  // ─── Invoices ────────────────────────────────────────────────────────────
  // ~40% of completed appointments get invoices
  // Status: ~10 paid, ~5 pending, ~3 overdue, ~2 cancelled
  // Dates: Feb–Apr 2026, due dates 14–30 days after creation

  const today = new Date(2026, 3, 25);

  const completedList = apptRows.filter((a) => a.status === "completed");
  const targetInvoiceCount = 22;
  const step = Math.max(1, Math.floor(completedList.length / targetInvoiceCount));
  const invoiceAppts = completedList.filter((_, i) => i % step === 0).slice(0, targetInvoiceCount);

  const invoiceStatuses: Array<"pending" | "paid" | "overdue" | "cancelled"> = [
    "paid", "paid", "paid", "paid", "paid", "paid", "paid", "paid", "paid", "paid",
    "pending", "pending", "pending", "pending", "pending",
    "overdue", "overdue", "overdue",
    "cancelled", "cancelled",
  ];

  const invoiceData = invoiceAppts.map((a, i) => {
    const status = invoiceStatuses[i] ?? "pending";
    const [y, m, d] = a.appointmentDate.split("-").map(Number);
    const apptDate = new Date(y, m - 1, d);
    const dueDate = new Date(apptDate);
    dueDate.setDate(dueDate.getDate() + 14 + Math.floor(fixedRand() * 16));

    let paidAt: Date | null = null;
    if (status === "paid") {
      paidAt = new Date(apptDate);
      const daysToPaid = Math.floor(fixedRand() * 20);
      paidAt.setDate(paidAt.getDate() + daysToPaid);
      if (paidAt > today) {
        paidAt = new Date(today.getTime() - Math.floor(fixedRand() * 3) * 86400000);
      }
    }

    const baseAmount = 50 + Math.floor(fixedRand() * 200);
    const tax = Math.round(baseAmount * 0.08 * 100) / 100;
    const total = Math.round((baseAmount + tax) * 100) / 100;

    return {
      appointmentId: a.id,
      patientId: a.patientId,
      amount: String(baseAmount.toFixed(2)),
      tax: String(tax.toFixed(2)),
      total: String(total.toFixed(2)),
      status,
      dueDate: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`,
      paidAt: paidAt ? new Date(paidAt) : null,
    };
  });

  const invoiceRows = await db.insert(invoices).values(invoiceData).returning();

  const invoiceStatusCounts: Record<string, number> = {};
  for (const inv of invoiceData) {
    invoiceStatusCounts[inv.status] = (invoiceStatusCounts[inv.status] ?? 0) + 1;
  }
  console.log(`  ✓ ${invoiceRows.length} invoices created`);
  Object.entries(invoiceStatusCounts).forEach(([s, c]) => console.log(`    ${s}: ${c}`));

  console.log("");
  console.log("Slice 5 complete. Moving to next slice...");

  // ─── Notifications ─────────────────────────────────────────────────────────
  // 30+ notifications distributed across users by role
  // Patients: appointment reminders, results, prescriptions
  // Doctors: new appointments, cancellations, schedule changes
  // Admins: registrations, system alerts

  const allUsers = [...adminUsers, ...doctorUsers, ...patientUsers];

  const notificationTemplates: Array<{
    userIndices: number[];
    title: string;
    message: string;
    type: string;
    link: string | null;
  }> = [
    // Patient appointment reminders (5)
    { userIndices: [0, 1, 2, 3, 4], title: "Appointment Reminder", message: "You have an appointment tomorrow at 10:00 with Dr. Smith.", type: "appointment_reminder", link: "/appointments" },
    { userIndices: [5, 6, 7, 8, 9], title: "Appointment Confirmed", message: "Your appointment on April 28 has been confirmed.", type: "appointment_confirmed", link: "/appointments" },
    { userIndices: [10, 11, 12, 13, 14], title: "Lab Results Ready", message: "Your lab results from your visit on April 10 are now available.", type: "lab_results", link: "/medical-records" },
    { userIndices: [15, 16, 17, 18, 19], title: "Prescription Ready", message: "Your prescription is ready for pickup at the pharmacy.", type: "prescription_ready", link: "/prescriptions" },
    { userIndices: [20, 21, 22, 23, 24], title: "Appointment Reminder", message: "Reminder: you have an appointment in 2 hours with Dr. Jones.", type: "appointment_reminder", link: "/appointments" },
    { userIndices: [25, 26, 27, 28, 29], title: "Follow-up Required", message: "Dr. Nguyen would like to schedule a follow-up appointment.", type: "follow_up", link: "/appointments" },
    // Doctor notifications (5)
    { userIndices: [30, 31], title: "New Appointment Booked", message: "A new appointment has been booked for April 27 at 14:00.", type: "new_appointment", link: "/schedule" },
    { userIndices: [32, 33], title: "Appointment Cancelled", message: "Patient Emma Thompson has cancelled their appointment on April 28.", type: "appointment_cancelled", link: "/schedule" },
    { userIndices: [34, 35], title: "Schedule Updated", message: "Your schedule for next week has been updated.", type: "schedule_change", link: "/schedule" },
    { userIndices: [36, 37], title: "New Review Received", message: "You received a new 5-star review from a patient.", type: "new_review", link: "/reviews" },
    { userIndices: [38, 39], title: "Lab Result Alert", message: "Patient Liam O'Brien's lab results show abnormal values.", type: "lab_alert", link: "/medical-records" },
    // Admin notifications (5)
    { userIndices: [40, 41], title: "New User Registration", message: "A new patient registered: Robert Fernandez.", type: "user_registration", link: "/admin/users" },
    { userIndices: [40, 41], title: "Doctor License Expiring", message: "Dr. Adebayo's license LIC-003457 expires in 30 days.", type: "system_alert", link: "/admin/doctors" },
    { userIndices: [40, 41], title: "System Backup Complete", message: "Automated database backup completed successfully.", type: "system_info", link: null },
    { userIndices: [40, 41], title: "Appointment No-Show Report", message: "3 appointments were marked as no-show this week.", type: "report", link: "/admin/reports" },
    { userIndices: [40, 41], title: "New Doctor Application", message: "Dr. Williams submitted an application to join the clinic.", type: "doctor_application", link: "/admin/doctors" },
    // More varied patient notifications (10)
    { userIndices: [0, 1], title: "Prescription Refill Reminder", message: "Your prescription for Metformin is due for a refill.", type: "prescription_reminder", link: "/prescriptions" },
    { userIndices: [2, 3], title: "Appointment Rescheduled", message: "Your appointment has been rescheduled to May 2 at 11:00.", type: "appointment_rescheduled", link: "/appointments" },
    { userIndices: [4, 5], title: "Vaccination Due", message: "Annual flu vaccination is now available. Book your appointment.", type: "vaccination_reminder", link: "/appointments" },
    { userIndices: [6, 7], title: "Medical Record Updated", message: "A new medical record has been added to your profile.", type: "record_updated", link: "/medical-records" },
    { userIndices: [8, 9], title: "Billing Statement", message: "Your invoice #INV-2026-001 has been paid. Thank you.", type: "billing", link: "/invoices" },
    { userIndices: [10, 11], title: "Overdue Invoice", message: "Invoice #INV-2026-008 is overdue. Please arrange payment.", type: "billing", link: "/invoices" },
    { userIndices: [12, 13], title: "Appointment Reminder", message: "You have an appointment tomorrow at 09:00 with Dr. Patel.", type: "appointment_reminder", link: "/appointments" },
    { userIndices: [14, 15], title: "Prescription Ready", message: "Your prescription is ready for pickup.", type: "prescription_ready", link: "/prescriptions" },
    { userIndices: [16, 17], title: "New Message from Doctor", message: "Dr. Wong sent you a message regarding your recent visit.", type: "message", link: "/messages" },
    { userIndices: [18, 19], title: "Appointment Confirmed", message: "Your upcoming appointment on May 5 is confirmed.", type: "appointment_confirmed", link: "/appointments" },
    { userIndices: [20, 21], title: "Lab Results Available", message: "Your blood test results are now available to view.", type: "lab_results", link: "/medical-records" },
    // More doctor notifications (5)
    { userIndices: [30, 31], title: "Patient Arrived", message: "Patient David Johansson has checked in for their 10:00 appointment.", type: "patient_arrived", link: "/schedule" },
    { userIndices: [32, 33], title: "Schedule Conflict", message: "Two appointments are scheduled at 14:00 on May 3. Please resolve.", type: "schedule_conflict", link: "/schedule" },
    { userIndices: [34, 35], title: "Prescription Request", message: "Patient Grace Wong requested a prescription renewal.", type: "rx_request", link: "/prescriptions" },
    { userIndices: [36, 37], title: "New Appointment", message: "New appointment booked: Noah Kim with Dr. Tanaka on May 6.", type: "new_appointment", link: "/schedule" },
    { userIndices: [38, 39], title: "Appointment Cancelled", message: "Patient Isabella Fischer cancelled their May 2 appointment.", type: "appointment_cancelled", link: "/schedule" },
  ];

  const notificationRows: Array<{
    userId: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    link: string | null;
  }> = [];

  for (const t of notificationTemplates) {
    for (const idx of t.userIndices) {
      if (idx < allUsers.length) {
        notificationRows.push({
          userId: allUsers[idx].id,
          title: t.title,
          message: t.message,
          type: t.type,
          isRead: fixedRand() > 0.6,
          link: t.link,
        });
      }
    }
  }

  const notifRows = await db.insert(notifications).values(notificationRows).returning();
  console.log(`  ✓ ${notifRows.length} notifications created`);

  const notifByRole: Record<string, number> = {};
  for (const n of notificationRows) {
    const user = allUsers.find((u) => u.id === n.userId);
    if (user) {
      notifByRole[user.role] = (notifByRole[user.role] ?? 0) + 1;
    }
  }
  Object.entries(notifByRole).forEach(([role, count]) => console.log(`    ${role}: ${count}`));

  console.log("");
  console.log("All slices complete!");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
