import { createAppQueryClient } from "@deera/shared/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@deera/shared/styles/index.css";
import "./catalog-animations.css";
import App from "./App.jsx";

document.body.classList.add("theme-dark");

const queryClient = createAppQueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
