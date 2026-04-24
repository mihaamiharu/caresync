import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate } from "react-router";
import { registerSchema, type RegisterInput } from "@caresync/shared";
import { authApi, type ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

function getRoleDashboard(role: string): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "doctor":
      return "/doctor";
    case "patient":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "patient" },
  });

  if (isAuthenticated && user) {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      const { accessToken, user } = await authApi.register(data);
      setAuth(user, accessToken);
      navigate(getRoleDashboard(user.role), { replace: true });
    } catch (err) {
      const axiosError = err as ApiError;
      setServerError(axiosError.response?.data?.message ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" data-testid="register-page">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">CareSync</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && (
            <p role="alert" data-testid="register-error" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          {/* Hidden role field — always patient for self-registration */}
          <input type="hidden" {...register("role")} value="patient" />

          <div className="space-y-1">
            <label htmlFor="firstName" className="text-sm font-medium">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              data-testid="firstName-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("firstName")}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive" data-testid="firstName-error">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="lastName" className="text-sm font-medium">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              data-testid="lastName-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("lastName")}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive" data-testid="lastName-error">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              data-testid="email-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive" data-testid="email-error">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              data-testid="password-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive" data-testid="password-error">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="register-submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Create account
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" data-testid="login-link" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
