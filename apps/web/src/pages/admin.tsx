import { useLoaderData, redirect } from "react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { adminApi } from "@/lib/api-client";
import type { AdminStatsResponse } from "@caresync/shared";
import type { Route } from "./admin.loader";
import { useAuthStore } from "@/stores/auth-store";

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#ca8a04",
  "#db2777",
  "#4b5563",
];

export async function adminLoader() {
  const user = useAuthStore.getState().user;
  if (!user || user.role !== "admin") {
    throw redirect("/dashboard");
  }
  const stats = await adminApi.getStats();
  return stats;
}

export function AdminDashboardPage() {
  const stats = useLoaderData<Route>() as AdminStatsResponse;

  return (
    <div className="space-y-8" data-testid="admin-dashboard-page">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of clinic performance and statistics
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={stats.summary.totalPatients}
          testId="stat-patients"
        />
        <StatCard
          label="Total Doctors"
          value={stats.summary.totalDoctors}
          testId="stat-doctors"
        />
        <StatCard
          label="Total Appointments"
          value={stats.summary.totalAppointments}
          testId="stat-appointments"
        />
        <StatCard
          label="Total Revenue"
          value={stats.summary.totalRevenue}
          prefix="Rp"
          testId="stat-revenue"
          isCurrency
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Appointments (Last 30 Days)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.appointmentsTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString()} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Appointments by Department">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.appointmentsByDepartment}
                dataKey="count"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {stats.appointmentsByDepartment.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Monthly Revenue (Last 12 Months)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.revenueTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) =>
                v >= 1000000
                  ? `Rp${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                    ? `Rp${(v / 1000).toFixed(0)}K`
                    : `Rp${v}`
              }
            />
            <Tooltip
              formatter={(value: number) => [
                `Rp ${value.toLocaleString("id-ID")}`,
                "Revenue",
              ]}
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function StatCard({
  label,
  value,
  prefix,
  testId,
  isCurrency,
}: {
  label: string;
  value: number;
  prefix?: string;
  testId: string;
  isCurrency?: boolean;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      data-testid={testId}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-card-foreground">
        {prefix}
        {isCurrency ? value.toLocaleString("id-ID") : value}
      </p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}