import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@deera/shared/lib/queryClient";
import "@deera/shared/styles/index.css";
import App from "./App.jsx";

const queryClient = createAppQueryClient();

document.body.classList.add("theme-light");

// Auto-uppercase semua input[type="text"].
// Capture phase → modifikasi DOM value sebelum React memproses onChange,
// sehingga React menerima nilai uppercase langsung tanpa perlu ubah tiap komponen.
document.addEventListener(
  "input",
  (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || el.type !== "text") return;
    const upper = el.value.toUpperCase();
    if (upper === el.value) return;
    const pos = el.selectionStart;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, upper);
    try { el.setSelectionRange(pos, pos); } catch (_) { /* noop */ }
  },
  true, // capture = true → jalan sebelum React
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
