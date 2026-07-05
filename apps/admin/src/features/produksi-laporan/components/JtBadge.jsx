import { daysUntil } from "../utils";

export default function JtBadge({ jatuh_tempo, status_bayar }) {
  if (status_bayar === "lunas")
    return (
      <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
        Lunas
      </span>
    );
  const d = daysUntil(jatuh_tempo);
  if (d < 0)
    return (
      <span className="text-[10px] font-semibold uppercase text-red-600">
        Lewat {Math.abs(d)}h
      </span>
    );
  if (d <= 30)
    return <span className="text-[10px] font-semibold uppercase text-amber-600">{d}h lagi</span>;
  return <span className="text-[10px] text-skin-text3">{d}h lagi</span>;
}
