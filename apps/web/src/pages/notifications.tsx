import { useState } from "react";
import {
  useLoaderData,
  useNavigation,
  useRevalidator,
} from "react-router";
import { Check, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { Notification as AppNotification } from "@caresync/shared";

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function notificationsLoader() {
  const res = await notificationsApi.list({ limit: 100 });
  return { notifications: res.data };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { notifications } = useLoaderData() as { notifications: AppNotification[] };
  const navigation = useNavigation();
  const revalidator = useRevalidator();

  const isLoading = navigation.state !== "idle";

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      toast.success("Marked as read");
      revalidator.revalidate();
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      toast.success("All notifications marked as read");
      revalidator.revalidate();
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8" data-testid="notifications-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated on your appointments and invoices.
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2"
            data-testid="mark-all-read-btn"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8" data-testid="notifications-loading">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-muted-foreground">
            You don't have any notifications yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              data-testid={`notification-card-${notification.id}`}
              className={`rounded-lg border p-4 shadow-sm transition-colors ${
                notification.isRead
                  ? "border-border bg-card"
                  : "border-primary/20 bg-primary/5"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <span className="flex h-2 w-2 rounded-full bg-primary" />
                    )}
                    <h3 className={`font-semibold ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                      {notification.title}
                    </h3>
                  </div>
                  <p className={`mt-1 text-sm ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                  {notification.link && (
                    <a
                      href={notification.link}
                      className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      View Details
                    </a>
                  )}
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-background hover:text-foreground"
                    title="Mark as read"
                    data-testid={`mark-read-btn-${notification.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
