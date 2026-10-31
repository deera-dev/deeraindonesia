import { createAppQueryClient } from "@deera/shared/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@deera/shared/styles/index.css";
import "./catalog-animations.css";
import App from "./App";

// Catalog has no light/dark toggle - it's always dark, so it always
// carries the shared skin-token dark class (html.dark reads the dark
// token set in packages/shared/styles/index.css).
document.documentElement.classList.add("dark");

const queryClient = createAppQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
