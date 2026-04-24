import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app";
import "./app.css";
import { RootErrorBoundary } from "@/components/root-error-boundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <RouterProvider router={router} />
    </RootErrorBoundary>
  </StrictMode>
);
