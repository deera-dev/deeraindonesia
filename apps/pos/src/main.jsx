import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@deera/shared/lib/queryClient";
import "@deera/shared/styles/index.css";
import "@deera/shared/styles/rounded.css";
import App from "./App.jsx";

const queryClient = createAppQueryClient();

document.body.classList.add("theme-light");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
