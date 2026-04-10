import axios from "axios";
import type { LoginInput, RegisterInput, PaginatedResponse, User } from "@caresync/shared";
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
    const res = await apiClient.post<AuthResponse>("/api/v1/auth/register", data);
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

  listUsers: async (params?: ListUsersParams): Promise<PaginatedResponse<User>> => {
    const res = await apiClient.get<PaginatedResponse<User>>("/api/v1/users", { params });
    return res.data;
  },

  updateUserStatus: async (id: string, isActive: boolean): Promise<User> => {
    const res = await apiClient.patch<User>(`/api/v1/users/${id}/status`, { isActive });
    return res.data;
  },
};
