import axios from "axios";
import type {
  LoginInput,
  RegisterInput,
  PaginatedResponse,
  User,
  Department,
  Doctor,
  DoctorSchedule,
  Patient,
  Appointment,
  AppointmentType,
  MedicalRecord,
  MedicalRecordAttachment,
  Invoice,
} from "@caresync/shared";
import { useAuthStore } from "@/stores/auth-store";

export const apiClient = axios.create({
  baseURL: "/",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRequest =
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/register") ||
      original.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !original._retry && !isAuthRequest) {
      original._retry = true;
      try {
        const res = await axios.post<{ accessToken: string }>(
          "/api/v1/auth/refresh",
          {},
          { withCredentials: true }
        );
        const { accessToken } = res.data;
        const { user } = useAuthStore.getState();
        if (user) useAuthStore.getState().setAuth(user, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

interface AuthResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  login: async (data: LoginInput): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>("/api/v1/auth/login", data);
    return res.data;
  },

  register: async (data: RegisterInput): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(
      "/api/v1/auth/register",
      data
    );
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/api/v1/auth/logout");
  },
};

interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
}

interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<User>("/api/v1/users/me");
    return res.data;
  },

  updateProfile: async (data: UpdateProfileInput): Promise<User> => {
    const res = await apiClient.put<User>("/api/v1/users/me", data);
    return res.data;
  },

  updateAvatar: async (formData: FormData): Promise<User> => {
    const res = await apiClient.put<User>("/api/v1/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  listUsers: async (
    params?: ListUsersParams
  ): Promise<PaginatedResponse<User>> => {
    const res = await apiClient.get<PaginatedResponse<User>>("/api/v1/users", {
      params,
    });
    return res.data;
  },

  updateUserStatus: async (id: string, isActive: boolean): Promise<User> => {
    const res = await apiClient.patch<User>(`/api/v1/users/${id}/status`, {
      isActive,
    });
    return res.data;
  },
};

interface DepartmentInput {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

interface ListDepartmentsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const departmentsApi = {
  listDepartments: async (
    params?: ListDepartmentsParams
  ): Promise<PaginatedResponse<Department>> => {
    const res = await apiClient.get<PaginatedResponse<Department>>(
      "/api/v1/departments",
      { params }
    );
    return res.data;
  },

  getDepartment: async (id: string): Promise<Department> => {
    const res = await apiClient.get<Department>(`/api/v1/departments/${id}`);
    return res.data;
  },

  createDepartment: async (data: DepartmentInput): Promise<Department> => {
    const res = await apiClient.post<Department>("/api/v1/departments", data);
    return res.data;
  },

  updateDepartment: async (
    id: string,
    data: DepartmentInput
  ): Promise<Department> => {
    const res = await apiClient.put<Department>(
      `/api/v1/departments/${id}`,
      data
    );
    return res.data;
  },

  deleteDepartment: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/departments/${id}`);
  },
};

interface CreateDoctorInput {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  departmentId: string;
  specialization: string;
  bio?: string | null;
  licenseNumber: string;
}

interface UpdateDoctorInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  departmentId?: string;
  specialization?: string;
  bio?: string | null;
}

interface ListDoctorsParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
}

export const doctorsApi = {
  listDoctors: async (
    params?: ListDoctorsParams
  ): Promise<PaginatedResponse<Doctor>> => {
    const res = await apiClient.get<PaginatedResponse<Doctor>>(
      "/api/v1/doctors",
      { params }
    );
    return res.data;
  },

  getDoctor: async (id: string): Promise<Doctor> => {
    const res = await apiClient.get<Doctor>(`/api/v1/doctors/${id}`);
    return res.data;
  },

  createDoctor: async (data: CreateDoctorInput): Promise<Doctor> => {
    const res = await apiClient.post<Doctor>("/api/v1/doctors", data);
    return res.data;
  },

  updateDoctor: async (
    id: string,
    data: UpdateDoctorInput
  ): Promise<Doctor> => {
    const res = await apiClient.put<Doctor>(`/api/v1/doctors/${id}`, data);
    return res.data;
  },

  deleteDoctor: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/doctors/${id}`);
  },
};

interface UpsertPatientInput {
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

interface ListPatientsParams {
  page?: number;
  limit?: number;
  search?: string;
  gender?: string;
  bloodType?: string;
}

export const patientsApi = {
  getPatient: async (): Promise<Patient | null> => {
    const res = await apiClient.get<Patient | null>("/api/v1/patients/me");
    return res.data;
  },

  upsertPatient: async (data: UpsertPatientInput): Promise<Patient> => {
    const res = await apiClient.put<Patient>("/api/v1/patients/me", data);
    return res.data;
  },

  listPatients: async (
    params?: ListPatientsParams
  ): Promise<PaginatedResponse<Patient>> => {
    const res = await apiClient.get<PaginatedResponse<Patient>>(
      "/api/v1/patients",
      { params }
    );
    return res.data;
  },
};

export interface CreateAppointmentInput {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  type: AppointmentType;
  reason?: string;
  notes?: string;
}

export interface AppointmentListItem extends Appointment {
  patientName: string;
  doctorName: string;
  doctorSpecialization: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAppointmentsParams {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
}

export const appointmentsApi = {
  create: async (data: CreateAppointmentInput): Promise<Appointment> => {
    const res = await apiClient.post<Appointment>("/api/v1/appointments", data);
    return res.data;
  },

  list: async (
    params?: ListAppointmentsParams
  ): Promise<PaginatedResponse<AppointmentListItem>> => {
    const res = await apiClient.get<PaginatedResponse<AppointmentListItem>>(
      "/api/v1/appointments",
      { params }
    );
    return res.data;
  },

  get: async (id: string): Promise<Appointment> => {
    const res = await apiClient.get<Appointment>(`/api/v1/appointments/${id}`);
    return res.data;
  },

  updateStatus: async (
    id: string,
    status: string
  ): Promise<{ appointment: Appointment }> => {
    const res = await apiClient.patch<{ appointment: Appointment }>(
      `/api/v1/appointments/${id}/status`,
      { status }
    );
    return res.data;
  },
};

interface PutScheduleInput {
  slotDurationMinutes: number;
  days: Array<{ dayOfWeek: string; startTime: string; endTime: string }>;
}

export const schedulesApi = {
  getSchedule: async (doctorId: string): Promise<DoctorSchedule[]> => {
    const res = await apiClient.get<DoctorSchedule[]>(
      `/api/v1/doctors/${doctorId}/schedules`
    );
    return res.data;
  },

  putSchedule: async (
    doctorId: string,
    data: PutScheduleInput
  ): Promise<DoctorSchedule[]> => {
    const res = await apiClient.put<DoctorSchedule[]>(
      `/api/v1/doctors/${doctorId}/schedules`,
      data
    );
    return res.data;
  },

  getAvailableSlots: async (
    doctorId: string,
    date: string
  ): Promise<string[]> => {
    const res = await apiClient.get<string[]>(
      `/api/v1/doctors/${doctorId}/available-slots`,
      { params: { date } }
    );
    return res.data;
  },
};

export interface CreateMedicalRecordInput {
  appointmentId: string;
  diagnosis: string;
  symptoms?: string | null;
  notes?: string | null;
}

export interface ListMedicalRecordsParams {
  patientId?: string;
  appointmentId?: string;
}

export const medicalRecordsApi = {
  list: async (params?: ListMedicalRecordsParams): Promise<MedicalRecord[]> => {
    const res = await apiClient.get<MedicalRecord[]>(
      "/api/v1/medical-records",
      { params }
    );
    return res.data;
  },

  get: async (id: string): Promise<MedicalRecord> => {
    const res = await apiClient.get<MedicalRecord>(
      `/api/v1/medical-records/${id}`
    );
    return res.data;
  },

  create: async (data: CreateMedicalRecordInput): Promise<MedicalRecord> => {
    const res = await apiClient.post<MedicalRecord>(
      "/api/v1/medical-records",
      data
    );
    return res.data;
  },

  uploadAttachment: async (
    recordId: string,
    formData: FormData
  ): Promise<MedicalRecordAttachment> => {
    const res = await apiClient.post<MedicalRecordAttachment>(
      `/api/v1/medical-records/${recordId}/attachments`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },
};

// ─── Invoices API ─────────────────────────────────────────────────────────────

interface ListInvoicesParams {
  page?: number;
  limit?: number;
  status?: string;
}

export const invoicesApi = {
  listInvoices: async (
    params?: ListInvoicesParams
  ): Promise<{ data: Invoice[]; total: number }> => {
    const res = await apiClient.get<{ data: Invoice[]; total: number }>(
      "/api/v1/invoices",
      { params }
    );
    return res.data;
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    const res = await apiClient.get<Invoice>(`/api/v1/invoices/${id}`);
    return res.data;
  },

  payInvoice: async (id: string): Promise<Invoice> => {
    const res = await apiClient.post<Invoice>(`/api/v1/invoices/${id}/pay`);
    return res.data;
  },
};
