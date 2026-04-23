// eslint-disable-next-line no-restricted-syntax
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      try {
        const res = await notificationsApi.getUnreadCount();
        setUnreadCount(res.count);
      } catch (error) {
        console.error("Failed to fetch unread count", error);
      }
    };

    fetchCount();
    // Optionally add polling here if desired
    const interval = setInterval(fetchCount, 60000); // every minute
    return () => clearInterval(interval);
  }, [user]);

  return (
    <Link
      to="/notifications"
      className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-accent transition-colors"
      data-testid="notification-bell"
    >
      <Bell className="h-5 w-5 text-foreground" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
