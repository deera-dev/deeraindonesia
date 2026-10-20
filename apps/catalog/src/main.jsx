import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@deera/shared/lib/queryClient";
import UpdateBanner from "@deera/shared/components/UpdateBanner";
import "@deera/shared/styles/index.css";
import "./catalog-animations.css";
import App from "./App.jsx";

document.body.classList.add("theme-dark");

const queryClient = createAppQueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UpdateBanner />
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
