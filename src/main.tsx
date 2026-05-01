import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import App from "@/App";
import { Toaster } from "@/components/ui/sonner";
import { applyInitialColorScheme } from "@/lib/initialColorScheme";
import "@fontsource-variable/geist";
import "./index.css";

applyInitialColorScheme();

if (
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  (window.location.protocol === "https:" || window.location.hostname === "localhost")
) {
  window.addEventListener("load", () => {
    // compat: register SW only on secure contexts (Safari/iOS strict behavior)
    void navigator.serviceWorker.register("/sw.js");
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount, error) => {
        if (isAxiosError(error) && error.response?.status === 401) return false;
        return failureCount < 1;
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        offset={{ bottom: "6.5rem", right: "1.5rem" }}
        mobileOffset={{ bottom: "6.5rem" }}
      />
    </QueryClientProvider>
  </StrictMode>
);
