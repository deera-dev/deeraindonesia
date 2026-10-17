

export function fmtRp(value) {
  if (value === null || value === "") return "—";
  return "Rp " + Number(value).toLocaleString("id-ID");
}

export function fmtTanggal(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function fmtTanggalPendek(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getSabtu(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function getSenin(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}


export const inputCls =
  "w-full bg-skin-input border border-skin-bdr text-skin-text px-3 py-2.5 font-editorial text-sm rounded-none outline-none focus:border-skin-accent transition placeholder:text-skin-text4";

export const labelCls = "font-editorial text-xs tracking-[0.15em] uppercase text-skin-text3";
