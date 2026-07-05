/**
 * JTBadge.jsx — Badge status jatuh tempo.
 */
import { daysUntil } from "../utils";

export default function JTBadge({ jatuh_tempo, status_bayar }) {
  if (status_bayar === "lunas")
    return (
      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        Lunas
      </span>
    );
  if (!jatuh_tempo) return null;
  const d = daysUntil(jatuh_tempo);
  if (d < 0)
    return (
      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Lewat {Math.abs(d)}h
      </span>
    );
  if (d <= 30)
    return (
      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500">
        {d}h lagi
      </span>
    );
  return (
    <span className="text-[10px] uppercase px-2 py-0.5 bg-skin-raised text-skin-text3">
      {d}h lagi
    </span>
  );
}
