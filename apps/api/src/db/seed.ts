/**
 * Database seed script — populates the database with realistic demo data
 * for development and QA testing purposes.
 *
 * Usage: pnpm db:seed
 */
import { eq } from "drizzle-orm";
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

  // --- Medical records (for completed appointments) ---
  const [apptForRecord] = await db
    .insert(appointments)
    .values({
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentDate: "2026-04-10",
      startTime: "09:00",
      endTime: "09:30",
      status: "completed",
      type: "consultation",
      reason: "Follow-up visit",
    })
    .returning();

  const [record] = await db
    .insert(medicalRecords)
    .values({
      appointmentId: apptForRecord.id,
      patientId: patient.id,
      doctorId: doctor.id,
      diagnosis: "Mild hypertension",
      symptoms: "Slightly elevated blood pressure readings",
      notes: "Patient advised to reduce salt intake and monitor BP daily",
    })
    .returning();

  console.log("  ✓ Medical records created");

  // --- Second doctor + patient for prescription variety ---
  const [doctorUser2] = await db
    .insert(users)
    .values({
      email: "dr.jones@caresync.dev",
      passwordHash,
      role: "doctor",
      firstName: "Emily",
      lastName: "Jones",
      phone: "+1-555-000-0004",
      isActive: true,
    })
    .returning();

  const [doctor2] = await db
    .insert(doctors)
    .values({
      userId: doctorUser2.id,
      departmentId: cardiology.id,
      specialization: "Cardiology",
      bio: "Specialist in cardiovascular diseases.",
      licenseNumber: "LIC-005678",
    })
    .returning();

  const [patientUser2] = await db
    .insert(users)
    .values({
      email: "bob.smith@caresync.dev",
      passwordHash,
      role: "patient",
      firstName: "Bob",
      lastName: "Smith",
      phone: "+1-555-000-0005",
      isActive: true,
    })
    .returning();

  const [patient2] = await db
    .insert(patients)
    .values({
      userId: patientUser2.id,
      dateOfBirth: "1975-03-22",
      gender: "male",
      bloodType: "O+",
      emergencyContactName: "Alice Smith",
      emergencyContactPhone: "+1-555-000-0098",
    })
    .returning();

  // --- Prescriptions ---
  // Helper: create a completed appt + medical record + prescription + items
  async function createPrescription(opts: {
    patientId: string;
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    type: "consultation" | "follow-up" | "emergency";
    diagnosis: string;
    symptoms: string;
    notes: string | null;
    rxNotes: string | null;
    items: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
  }) {
    const [appt] = await db
      .insert(appointments)
      .values({
        patientId: opts.patientId,
        doctorId: opts.doctorId,
        appointmentDate: opts.appointmentDate,
        startTime: opts.startTime,
        endTime: opts.endTime,
        status: "completed",
        type: opts.type,
        reason: opts.diagnosis,
      })
      .returning();

    const [mr] = await db
      .insert(medicalRecords)
      .values({
        appointmentId: appt.id,
        patientId: opts.patientId,
        doctorId: opts.doctorId,
        diagnosis: opts.diagnosis,
        symptoms: opts.symptoms,
        notes: opts.notes,
      })
      .returning();

    const [rx] = await db
      .insert(prescriptions)
      .values({ medicalRecordId: mr.id, notes: opts.rxNotes })
      .returning();

    await db.insert(prescriptionItems).values(
      opts.items.map((item) => ({
        prescriptionId: rx.id,
        medicationName: item.name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions ?? null,
      }))
    );
  }

  // Prescription 1 — already created above (record / Dr. Smith / Jane Doe)
  await db.insert(prescriptions).values({
    medicalRecordId: record.id,
    notes: "Take medications as prescribed. Follow up in 2 weeks.",
  });

  const [rx] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.medicalRecordId, record.id))
    .limit(1);

  if (rx) {
    await db.insert(prescriptionItems).values([
      {
        prescriptionId: rx.id,
        medicationName: "Lisinopril",
        dosage: "10mg",
        frequency: "Once daily",
        duration: "30 days",
        instructions: "Take in the morning with water",
      },
      {
        prescriptionId: rx.id,
        medicationName: "Hydrochlorothiazide",
        dosage: "12.5mg",
        frequency: "Once daily",
        duration: "30 days",
        instructions: "Take in the morning",
      },
    ]);
  }

  // Prescriptions 2–5 — Dr. Smith + Jane Doe
  await createPrescription({
    patientId: patient.id,
    doctorId: doctor.id,
    appointmentDate: "2026-03-20",
    startTime: "09:00",
    endTime: "09:30",
    type: "follow-up",
    diagnosis: "Upper respiratory infection",
    symptoms: "Sore throat, mild fever, fatigue",
    notes:
      "Viral infection, antibiotics not indicated unless bacterial origin confirmed",
    rxNotes: "Complete the full course even if feeling better.",
    items: [
      {
        name: "Paracetamol",
        dosage: "500mg",
        frequency: "Every 6 hours as needed",
        duration: "5 days",
        instructions: "Take with food",
      },
      {
        name: "Loratadine",
        dosage: "10mg",
        frequency: "Once daily",
        duration: "7 days",
      },
    ],
  });

  await createPrescription({
    patientId: patient.id,
    doctorId: doctor.id,
    appointmentDate: "2026-03-05",
    startTime: "10:00",
    endTime: "10:30",
    type: "consultation",
    diagnosis: "Type 2 diabetes — initial management",
    symptoms: "Increased thirst, frequent urination, fatigue",
    notes: "HbA1c elevated. Start oral hypoglycemic therapy.",
    rxNotes: "Monitor blood glucose daily. Record readings.",
    items: [
      {
        name: "Metformin",
        dosage: "500mg",
        frequency: "Twice daily with meals",
        duration: "90 days",
        instructions:
          "Start with once daily for first week to reduce GI side effects",
      },
      {
        name: "Glibenclamide",
        dosage: "5mg",
        frequency: "Once daily before breakfast",
        duration: "90 days",
      },
    ],
  });

  await createPrescription({
    patientId: patient.id,
    doctorId: doctor.id,
    appointmentDate: "2026-02-18",
    startTime: "14:00",
    endTime: "14:30",
    type: "follow-up",
    diagnosis: "Migraine",
    symptoms: "Severe unilateral headache, photophobia, nausea",
    notes: "Third episode this month. Prescribed prophylaxis.",
    rxNotes: null,
    items: [
      {
        name: "Sumatriptan",
        dosage: "50mg",
        frequency: "At onset of migraine, repeat once after 2h if needed",
        duration: "As needed",
        instructions: "Do not exceed 2 doses in 24 hours",
      },
      {
        name: "Propranolol",
        dosage: "40mg",
        frequency: "Twice daily",
        duration: "60 days",
        instructions: "For prophylaxis",
      },
      {
        name: "Ondansetron",
        dosage: "4mg",
        frequency: "As needed for nausea",
        duration: "30 days",
      },
    ],
  });

  await createPrescription({
    patientId: patient.id,
    doctorId: doctor.id,
    appointmentDate: "2026-02-01",
    startTime: "11:00",
    endTime: "11:30",
    type: "consultation",
    diagnosis: "Iron deficiency anaemia",
    symptoms: "Fatigue, pallor, shortness of breath on exertion",
    notes: "Ferritin very low. Dietary counselling provided.",
    rxNotes: "Take iron supplement on an empty stomach or with vitamin C.",
    items: [
      {
        name: "Ferrous sulphate",
        dosage: "200mg",
        frequency: "Three times daily",
        duration: "90 days",
        instructions: "Take 30 minutes before meals",
      },
    ],
  });

  // Prescriptions 6–8 — Dr. Jones (cardiology) + Bob Smith (patient2)
  await createPrescription({
    patientId: patient2.id,
    doctorId: doctor2.id,
    appointmentDate: "2026-04-08",
    startTime: "09:30",
    endTime: "10:00",
    type: "consultation",
    diagnosis: "Atrial fibrillation",
    symptoms: "Palpitations, shortness of breath, irregular pulse",
    notes: "ECG confirmed AF. Started anticoagulation.",
    rxNotes: "INR monitoring every 2 weeks. Report any unusual bleeding.",
    items: [
      {
        name: "Warfarin",
        dosage: "5mg",
        frequency: "Once daily",
        duration: "Ongoing",
        instructions: "Take at same time each day",
      },
      {
        name: "Bisoprolol",
        dosage: "2.5mg",
        frequency: "Once daily",
        duration: "90 days",
        instructions: "Do not stop abruptly",
      },
      {
        name: "Digoxin",
        dosage: "125mcg",
        frequency: "Once daily",
        duration: "90 days",
      },
    ],
  });

  await createPrescription({
    patientId: patient2.id,
    doctorId: doctor2.id,
    appointmentDate: "2026-03-25",
    startTime: "10:30",
    endTime: "11:00",
    type: "follow-up",
    diagnosis: "Hypertensive heart disease",
    symptoms: "Persistent elevated BP, mild dyspnoea",
    notes: "BP still not at target. Adjusted antihypertensive regimen.",
    rxNotes: "Measure BP twice daily and keep a log.",
    items: [
      {
        name: "Amlodipine",
        dosage: "10mg",
        frequency: "Once daily",
        duration: "90 days",
      },
      {
        name: "Ramipril",
        dosage: "5mg",
        frequency: "Once daily",
        duration: "90 days",
        instructions: "Take in the morning",
      },
      {
        name: "Atorvastatin",
        dosage: "40mg",
        frequency: "Once at night",
        duration: "90 days",
        instructions: "Avoid grapefruit juice",
      },
    ],
  });

  await createPrescription({
    patientId: patient2.id,
    doctorId: doctor2.id,
    appointmentDate: "2026-03-10",
    startTime: "14:00",
    endTime: "14:30",
    type: "consultation",
    diagnosis: "Stable angina",
    symptoms: "Chest tightness on exertion, relieved by rest",
    notes: "Stress ECG positive. Medical management initiated.",
    rxNotes: null,
    items: [
      {
        name: "Nitroglycerin",
        dosage: "0.5mg sublingual",
        frequency: "As needed for chest pain",
        duration: "PRN",
        instructions:
          "Sit or lie down when using. Call emergency if pain persists >10 min after dose",
      },
      {
        name: "Aspirin",
        dosage: "75mg",
        frequency: "Once daily",
        duration: "Ongoing",
      },
      {
        name: "Isosorbide mononitrate",
        dosage: "30mg",
        frequency: "Once daily",
        duration: "90 days",
        instructions: "Take in the morning to avoid tolerance",
      },
    ],
  });

  // Medical record with no prescription (for testing empty states)
  const [apptForRecord2] = await db
    .insert(appointments)
    .values({
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentDate: "2026-04-05",
      startTime: "11:00",
      endTime: "11:30",
      status: "completed",
      type: "follow-up",
      reason: "Routine checkup",
    })
    .returning();

  await db.insert(medicalRecords).values({
    appointmentId: apptForRecord2.id,
    patientId: patient.id,
    doctorId: doctor.id,
    diagnosis: "Common cold",
    symptoms: "Cough, runny nose, sore throat",
    notes: "Rest and fluids recommended",
  });

  console.log(
    "  ✓ Prescriptions created (8 total across 2 doctors + 2 patients)"
  );
  console.log("");
  console.log("✅ Seed complete!");
  console.log("");
  console.log("Demo accounts (password: Password123!):");
  console.log(`  Admin:     ${admin.email}`);
  console.log(`  Doctor 1:  ${doctorUser.email}`);
  console.log(`  Doctor 2:  ${doctorUser2.email}`);
  console.log(`  Patient 1: ${patientUser.email}`);
  console.log(`  Patient 2: ${patientUser2.email}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
