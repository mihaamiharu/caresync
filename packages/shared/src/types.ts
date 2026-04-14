import type {
  UserRole,
  AppointmentStatus,
  AppointmentType,
  InvoiceStatus,
  Gender,
  BloodType,
} from "./constants";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

export interface Doctor {
  id: string;
  userId: string;
  departmentId: string;
  specialization: string;
  bio: string | null;
  licenseNumber: string;
  user?: User;
  department?: Department;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface Patient {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  bloodType: BloodType | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  user?: User;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string | null;
  notes: string | null;
  patient?: Patient;
  doctor?: Doctor;
}

export interface MedicalRecordAppointmentSummary {
  id: string;
  appointmentDate: string;
  startTime: string;
  type: string;
  status: string;
}

export interface MedicalRecordDoctorSummary {
  id: string;
  specialization: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  symptoms: string | null;
  notes: string | null;
  createdAt: string;
  appointment?: MedicalRecordAppointmentSummary;
  doctor?: MedicalRecordDoctorSummary;
}

export interface MedicalRecordAttachment {
  id: string;
  medicalRecordId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface Prescription {
  id: string;
  medicalRecordId: string;
  notes: string | null;
  createdAt: string;
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

export interface Invoice {
  id: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
}

export interface Review {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  patient?: Patient;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
