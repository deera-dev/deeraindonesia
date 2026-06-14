import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@deera/shared/styles/index.css";
import App from "./App.jsx";

document.body.classList.add("theme-light");

// Daftarkan service worker — wajib agar notifikasi muncul di PWA standalone mode (Android Chrome)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
