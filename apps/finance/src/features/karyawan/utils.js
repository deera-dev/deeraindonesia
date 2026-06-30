/**
 * utils.js — Pure helpers fitur Karyawan (opsi tim, label tim).
 * Tidak ada React, tidak ada Supabase.
 */
export const TIM_OPTIONS = [
  { value: "potong", label: "Tim Potong" },
  { value: "jahit", label: "Tim Jahit" },
  { value: "finishing", label: "Tim Finishing" },
  { value: "qc", label: "Tim QC" },
  { value: "kreatif", label: "Tim Kreatif" },
  { value: "lainnya", label: "Lainnya" },
];

export function timLabel(value) {
  return TIM_OPTIONS.find((t) => t.value === value)?.label ?? value ?? "—";
}
