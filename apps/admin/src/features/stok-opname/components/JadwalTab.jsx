import { useCycleCountDueList } from "../hooks";
import { CYCLE_COUNT_FREQUENCY_DAYS } from "../utils";

const KATEGORI_BADGE = {
  A: "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800",
  B: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800",
  C: "text-skin-text3 bg-skin-raised border-skin-bdr",
};

// Cycle Counting berbasis risiko: kode fast-moving (kategori A, dari
// kecepatan jual 90 hari terakhir) jatuh tempo dihitung ulang tiap 7 hari,
// B tiap 30 hari, C tiap 90 hari -- lihat utils.js computeDueList(). Tujuan:
// sebar beban hitung jadi sedikit kode/hari, bukan satu sesi full-count
// yang berat.
export default function JadwalTab({ products, loc, onPilihKode }) {
  const { dueList, loading } = useCycleCountDueList({ products, loc });

  if (loading) return <p className="text-center text-sm text-skin-text3 py-12">Memuat jadwal...</p>;

  if (dueList.length === 0) {
    return (
      <p className="text-center text-sm text-skin-text4 py-12">
        Tidak ada kode yang jatuh tempo dihitung ulang di lokasi ini. 🎉
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-skin-text3">
        Kode diurutkan dari yang paling lama belum dihitung. Kategori A (laris) jatuh tempo tiap{" "}
        {CYCLE_COUNT_FREQUENCY_DAYS.A} hari, B tiap {CYCLE_COUNT_FREQUENCY_DAYS.B} hari, C tiap{" "}
        {CYCLE_COUNT_FREQUENCY_DAYS.C} hari.
      </p>
      <ul className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:gap-3">
        {dueList.map((d) => (
          <li key={d.kode}>
            <button
              onClick={() => onPilihKode(d.kode)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-skin-card border border-skin-bdr text-left hover:border-skin-accent transition"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-skin-text">{d.kode}</p>
                <p className="text-xs text-skin-text3 truncate">{d.nama}</p>
                <p className="text-[11px] text-skin-text4 mt-0.5">
                  {d.lastCheckedAt ? `Terakhir dihitung ${d.umur} hari lalu` : "Belum pernah dihitung (cycle count)"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold border ${KATEGORI_BADGE[d.kategori]}`}>
                  Kategori {d.kategori}
                </span>
                <p className="text-[11px] text-red-500 font-bold mt-1">
                  {d.overdueBy === Infinity ? "belum pernah" : `telat ${d.overdueBy} hari`}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
