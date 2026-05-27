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
  success:
    "bg-green-50  border-green-400  text-green-800  dark:bg-green-900/30 dark:border-green-600 dark:text-green-300",
  error:
    "bg-red-50    border-red-400    text-red-800    dark:bg-red-900/30   dark:border-red-600   dark:text-red-300",
  warn: "bg-amber-50  border-amber-400  text-amber-800  dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300",
};

const ICON_STYLES = {
  success: "bg-green-400  text-white dark:bg-green-600",
  error: "bg-red-400    text-white dark:bg-red-600",
  warn: "bg-amber-400  text-white dark:bg-amber-600",
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
