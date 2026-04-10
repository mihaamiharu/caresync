import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@caresync/shared";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      setAuth: (user, accessToken) => set({ user, accessToken }),

      clearAuth: () => set({ user: null, accessToken: null }),

      isAuthenticated: () => get().accessToken !== null,

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "auth-storage",
    }
  )
);
