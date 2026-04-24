import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import { Button } from "./ui/button";

export function RouteErrorPage() {
  const error = useRouteError();

  let message = "An unexpected error occurred.";
  let statusText = "";

  if (isRouteErrorResponse(error)) {
    statusText = `${error.status} — ${error.statusText}`;
    message = error.data?.message ?? error.statusText;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8"
      data-testid="route-error-page"
    >
      <div className="text-4xl">⚠️</div>
      <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
      {statusText && (
        <p className="text-sm text-muted-foreground">{statusText}</p>
      )}
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {message}
      </p>
      <div className="flex gap-3">
        <Link to="/dashboard">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
        <button onClick={() => window.location.reload()}>
          <Button>Retry</Button>
        </button>
      </div>
    </div>
  );
}