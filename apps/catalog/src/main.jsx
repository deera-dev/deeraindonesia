import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@deera/shared/styles/index.css";
import App from "./App.jsx";

document.body.classList.add("theme-dark");

createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
);
