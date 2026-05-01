import { ReactNode } from "react";
import { User, Stethoscope, ShieldAlert } from "lucide-react";

import { LucideIcon } from "lucide-react";

export type FlowStep = {
  id: string;
  title: string;
  description: string;
  status: "Automated" | "Manual";
  testCases?: string[]; // IDs of related test cases
};

export type UserFlow = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  steps: FlowStep[];
};

export const USER_FLOWS: UserFlow[] = [
  {
    id: "patient-journey",
    title: "Patient Journey",
    description: "End-to-end flow for a patient registering and booking an appointment.",
    icon: User,
    color: "text-blue-500",
    steps: [
      {
        id: "pj-1",
        title: "Registration & Login",
        description: "Patient registers for an account, or logs in if they already have one.",
        status: "Automated",
        testCases: ["R-1", "L-1"]
      },
      {
        id: "pj-2",
        title: "Complete Medical Profile",
        description: "Patient fills out their medical information in their profile.",
        status: "Automated",
        testCases: ["PP-2", "PP-3"]
      },
      {
        id: "pj-3",
        title: "Browse Departments",
        description: "Patient browses available departments to find the right specialization.",
        status: "Automated",
        testCases: ["D-1", "D-2", "D-3"]
      },
      {
        id: "pj-4",
        title: "Book Appointment",
        description: "Patient selects a doctor, chooses an available time slot, and books a consultation.",
        status: "Automated",
        testCases: ["BA-1", "BA-5"]
      },
      {
        id: "pj-5",
        title: "Manage Appointments",
        description: "Patient views their upcoming appointments and can cancel if necessary.",
        status: "Automated",
        testCases: ["AM-1", "AM-4"]
      },
      {
        id: "pj-6",
        title: "View Medical Records",
        description: "After the appointment, the patient views their medical records and downloads attachments.",
        status: "Automated",
        testCases: ["MR-1", "MR-ATT-1"]
      }
    ]
  },
  {
    id: "doctor-journey",
    title: "Doctor Journey",
    description: "Flow for a doctor managing their schedule and conducting appointments.",
    icon: Stethoscope,
    color: "text-emerald-500",
    steps: [
      {
        id: "dj-1",
        title: "Login",
        description: "Doctor logs into the platform securely.",
        status: "Automated",
        testCases: ["L-1"]
      },
      {
        id: "dj-2",
        title: "Manage Schedule",
        description: "Doctor sets their weekly availability and office hours.",
        status: "Automated",
        testCases: ["SCH-2"]
      },
      {
        id: "dj-3",
        title: "Review Appointments",
        description: "Doctor views pending appointments requested by patients.",
        status: "Automated",
        testCases: ["AM-3"]
      },
      {
        id: "dj-4",
        title: "Confirm & Conduct",
        description: "Doctor confirms appointments, transitions them to in-progress, and completes them.",
        status: "Automated",
        testCases: ["AM-3", "AM-5"]
      },
      {
        id: "dj-5",
        title: "Create Medical Record",
        description: "Doctor creates a medical record for completed appointments, adding diagnosis and attachments.",
        status: "Automated",
        testCases: ["MR-1", "MR-ATT-1"]
      }
    ]
  },
  {
    id: "admin-journey",
    title: "Admin Journey",
    description: "Administrative flow for managing the platform's core entities.",
    icon: ShieldAlert,
    color: "text-purple-500",
    steps: [
      {
        id: "aj-1",
        title: "Login",
        description: "Admin logs into the dashboard.",
        status: "Automated",
        testCases: ["L-1"]
      },
      {
        id: "aj-2",
        title: "Manage Departments",
        description: "Admin creates, edits, and deletes hospital departments.",
        status: "Automated",
        testCases: ["D-6", "D-7", "D-9", "D-10", "D-11"]
      },
      {
        id: "aj-3",
        title: "Manage Doctors",
        description: "Admin registers new doctors and assigns them to departments.",
        status: "Automated",
        testCases: ["DOC-3"]
      },
      {
        id: "aj-4",
        title: "View Patients",
        description: "Admin browses and filters registered patients in the system.",
        status: "Automated",
        testCases: ["PAT-1", "PAT-3", "PAT-4"]
      }
    ]
  }
];
