import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  Stethoscope,
  Users,
  FileText,
  Receipt,
  Bell,
  Settings,
  User,
  HeartPulse,
  LogOut,
  PillIcon,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api-client";
import { useNavigate } from "react-router";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { to: "/appointments", label: "Appointments", icon: Calendar, roles: null },
  {
    to: "/appointments/book",
    label: "Book Appointment",
    icon: CalendarPlus,
    roles: ["patient"],
  },
  { to: "/doctors", label: "Doctors", icon: Stethoscope, roles: null },
  { to: "/patients", label: "Patients", icon: Users, roles: ["admin"] },
  { to: "/departments", label: "Departments", icon: LayoutGrid, roles: null },
  { to: "/admin", label: "Admin Dashboard", icon: LayoutGrid, roles: ["admin"] },
  {
    to: "/medical-records",
    label: "Medical Records",
    icon: FileText,
    roles: null,
  },
  {
    to: "/prescriptions",
    label: "Prescriptions",
    icon: PillIcon,
    roles: null,
  },
  { to: "/invoices", label: "Invoices", icon: Receipt, roles: null },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: null },
  { to: "/profile", label: "Profile", icon: User, roles: null },
];

interface SidebarProps {
  onNavClick?: () => void;
}

export function Sidebar({ onNavClick }: SidebarProps) {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore API errors on logout
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  return (
    <aside
      className="flex h-screen w-64 flex-col border-r border-border bg-card shadow-lg"
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <HeartPulse className="h-5 w-5 text-primary" />
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground">CareSync</span>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-4 py-6"
        data-testid="sidebar-nav"
      >
        <ul className="space-y-1.5">
          {navItems
            .filter(
              ({ roles }) => !roles || (user?.role && roles.includes(user.role))
            )
            .map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onNavClick}
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                      )} />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>

      <div className="border-t border-border p-4 space-y-4">
        {user && (
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate text-foreground">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/10"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  );
}
