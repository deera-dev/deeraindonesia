/**
 * DiffSummary.jsx — langkah "Periksa" sebelum menyimpan satu produk:
 * daftar baris yang berubah (sistem → hitung) supaya salah ketik ketahuan.
 */
import { NO_WARNA } from "../utils";

export default function DiffSummary({ changes }) {
  if (changes.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-skin-text2 text-center">
        Tidak ada perubahan — angka sistem sudah sama dengan hasil hitung. Produk akan ditandai sudah dihitung.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-skin-bdr-lt" data-testid="diff-list">
      {changes.map(({ row, old, next }) => {
        const diff = next - old;
        const label = row.warna === NO_WARNA ? "Belum masukin warna" : row.warna;
        return (
          <li key={row.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="text-sm text-skin-text min-w-0 truncate">
              {row.size} · {label}
            </span>
            <span className="text-sm tabular-nums flex-shrink-0">
              {old} → <b>{next}</b>{" "}
              <span className={diff < 0 ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>
                ({diff > 0 ? "+" : ""}
                {diff})
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
