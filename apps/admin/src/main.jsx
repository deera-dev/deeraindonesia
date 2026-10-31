import { createAppQueryClient } from "@deera/shared/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@deera/shared/styles/index.css";
import "@deera/shared/styles/rounded.css";
import App from "./App.jsx";

const queryClient = createAppQueryClient();

document.body.classList.add("theme-light");

document.addEventListener(
  "input",
  (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || el.type !== "text") return;
    const upper = el.value.toUpperCase();
    if (upper === el.value) return;
    const pos = el.selectionStart;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, upper);
    try {
      el.setSelectionRange(pos, pos);
    } catch (_) {}
  },
  true,
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
