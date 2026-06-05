/**
 * ToastContainer.jsx
 * Render stack toast di pojok kanan atas.
 * Pasang sekali di root tiap app:  <ToastContainer />
 */
import { useEffect, useState } from "react";
import { _toastSubscribe } from "../lib/toast";

const ICONS = {
  success: "✓",
  error: "✕",
  warn: "!",
};

const STYLES = {
  success: "bg-[#1A2E1A] border-green-500 text-green-100",
  error:   "bg-[#2E1A1A] border-red-500   text-red-100",
  warn:    "bg-[#2E2610] border-amber-400 text-amber-100",
};

const ICON_STYLES = {
  success: "bg-green-500 text-white",
  error:   "bg-red-500   text-white",
  warn:    "bg-amber-400 text-white",
};

const DURATIONS = { success: 4000, error: 6000, warn: 5000 };

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return _toastSubscribe((item) => {
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, DURATIONS[item.type] ?? 4000);
    });
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none max-w-xs w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 border-2 shadow-lg px-3 py-3 animate-[fadeSlideIn_0.2s_ease] ${STYLES[t.type]}`}
          onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          role="alert"
        >
          <span
            className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-sm font-bold leading-none ${ICON_STYLES[t.type]}`}
          >
            {ICONS[t.type]}
          </span>
          <p className="text-sm font-medium leading-snug flex-1">{t.msg}</p>
        </div>
      ))}
    </div>
  );
}
