import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function getOnlineStatus(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function OnlineStatusBanner() {
  const isOnline = useSyncExternalStore(subscribe, getOnlineStatus, getOnlineStatus);

  if (isOnline) return null;

  return (
    <div
      className="flex items-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground"
      data-testid="offline-banner"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline. Some features may be unavailable.</span>
    </div>
  );
}