/**
 * TripTokoSection.jsx — toko yang mau dimampiri dalam jadwal: centang
 * "dikunjungi", tambah dari daftar toko (diprioritaskan daerah tujuan).
 */
import { useMemo, useState } from "react";
import { addTokoToTrip, removeTokoFromTrip, toggleTokoVisited } from "../hooks";

const INPUT = "w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition";

export default function TripTokoSection({ trip, tokoList, save }) {
  const [search, setSearch] = useState("");
  const list = trip.toko ?? [];

  const { candidates, daerahPool } = useMemo(() => {
    const inTrip = new Set(list.map((t) => t.toko_id));
    const pool = (tokoList ?? []).filter((t) => !inTrip.has(t.id));
    const daerahSet = new Set((trip.daerah ?? []).map((d) => d.toLowerCase()));
    const byDaerah = daerahSet.size ? pool.filter((t) => daerahSet.has((t.daerah ?? "").toLowerCase())) : [];
    const q = search.trim().toLowerCase();
    const matched = q
      ? pool.filter((t) => `${t.nama} ${t.alamat ?? ""} ${t.daerah ?? ""}`.toLowerCase().includes(q))
      : byDaerah;
    return { candidates: matched.slice(0, 8), daerahPool: byDaerah };
  }, [tokoList, list, trip.daerah, search]);

  return (
    <div className="space-y-2">
      {list.length === 0 && <p className="text-xs text-skin-text4">Belum ada toko di jadwal ini.</p>}
      {list.map((t) => (
        <div key={t.toko_id} className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => save({ toko: toggleTokoVisited(list, t.toko_id) })}
            aria-label="Tandai dikunjungi"
            className={`flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center text-xs font-bold ${
              t.dikunjungi ? "bg-[#CAB170] border-[#CAB170] text-white" : "border-skin-bdr text-transparent"
            }`}
          >
            ✓
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-sm truncate ${t.dikunjungi ? "text-skin-text3 line-through" : "text-skin-text"}`}>{t.nama}</p>
            {t.daerah && <p className="text-[11px] text-skin-text4 truncate">{t.daerah}</p>}
          </div>
          <button type="button" onClick={() => save({ toko: removeTokoFromTrip(list, t.toko_id) })} aria-label="Hapus" className="text-skin-text3 hover:text-red-500 text-lg leading-none">
            ×
          </button>
        </div>
      ))}

      <div className="pt-2 border-t border-skin-bdr-lt space-y-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari toko untuk ditambahkan..." className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition" />
        {!search && daerahPool.length > 0 && (
          <button
            type="button"
            onClick={() => save({ toko: daerahPool.reduce(addTokoToTrip, list) })}
            className="text-xs text-[#A8925A] underline"
          >
            + Semua toko di daerah tujuan ({daerahPool.length})
          </button>
        )}
        {candidates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => save({ toko: addTokoToTrip(list, t) })}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left border border-skin-bdr-lt hover:border-[#CAB170] transition"
          >
            <span className="min-w-0">
              <span className="block text-sm text-skin-text truncate">{t.nama}</span>
              <span className="block text-[11px] text-skin-text4 truncate">{t.daerah || t.alamat || ""}</span>
            </span>
            <span className="text-[#CAB170] text-lg leading-none">+</span>
          </button>
        ))}
      </div>
    </div>
  );
}
