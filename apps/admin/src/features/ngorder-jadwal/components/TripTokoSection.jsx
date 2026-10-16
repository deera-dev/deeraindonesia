/**
 * TripTokoSection.jsx — toko yang mau dimampiri dalam jadwal: centang
 * "dikunjungi", tambah dari daftar toko (diprioritaskan daerah tujuan).
 */
import { useMemo, useState } from "react";
import { addTokoToTrip, removeTokoFromTrip, toggleTokoVisited, groupTripToko } from "../hooks";

const PRIO_CLS = {
  A: "bg-emerald-500/20 text-emerald-500 border-emerald-500/40",
  B: "bg-amber-500/20 text-amber-500 border-amber-500/40",
  C: "bg-skin-raised text-skin-text3 border-skin-bdr",
};

const INPUT = "w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition";

export default function TripTokoSection({ trip, tokoList, save }) {
  const [search, setSearch] = useState("");
  const [closed, setClosed] = useState({}); // daerah → true bila diciutkan
  const list = trip.toko ?? [];

  const groups = useMemo(() => groupTripToko(trip.toko ?? [], tokoList), [trip.toko, tokoList]);

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
      {groups.map((g) => {
        const open = !closed[g.daerah];
        return (
          <section key={g.daerah} className="border border-skin-bdr-lt">
            <button
              type="button"
              onClick={() => setClosed((c) => ({ ...c, [g.daerah]: open }))}
              aria-expanded={open}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-skin-raised text-left"
            >
              <span className="text-sm font-bold tracking-wide text-skin-text">{g.daerah}</span>
              <span className="text-xs text-skin-text3 tabular-nums">
                {g.dikunjungi}/{g.total} {open ? "▴" : "▾"}
              </span>
            </button>
            {open && (
              <div className="divide-y divide-skin-bdr-lt">
                {g.items.map((t) => (
                  <div key={t.toko_id} className="flex items-center gap-3 px-3 py-3">
                    <button
                      type="button"
                      onClick={() => save({ toko: toggleTokoVisited(list, t.toko_id) })}
                      aria-label="Tandai dikunjungi"
                      className={`flex-shrink-0 w-7 h-7 border-2 flex items-center justify-center text-sm font-bold ${
                        t.dikunjungi ? "bg-skin-accent border-skin-accent text-skin-on-accent" : "border-skin-bdr text-transparent"
                      }`}
                    >
                      ✓
                    </button>
                    <span className="flex-shrink-0 w-6 text-center text-xs font-bold text-skin-text3 tabular-nums">#{t.rank}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${t.dikunjungi ? "text-skin-text3 line-through" : "text-skin-text"}`}>{t.nama}</p>
                      {t.skor != null && (
                        <p className="text-[11px] text-skin-text4">
                          Skor {t.skor}
                        </p>
                      )}
                    </div>
                    {t.prioritas && (
                      <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 border ${PRIO_CLS[t.prioritas] ?? PRIO_CLS.C}`} aria-label={`Prioritas ${t.prioritas}`}>
                        {t.prioritas}
                      </span>
                    )}
                    <button type="button" onClick={() => save({ toko: removeTokoFromTrip(list, t.toko_id) })} aria-label="Hapus" className="flex-shrink-0 text-skin-text3 hover:text-red-500 text-xl leading-none px-1">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <div className="pt-2 border-t border-skin-bdr-lt space-y-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari toko untuk ditambahkan..." className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition" />
        {!search && daerahPool.length > 0 && (
          <button
            type="button"
            onClick={() => save({ toko: daerahPool.reduce(addTokoToTrip, list) })}
            className="text-xs text-skin-accent-text underline"
          >
            + Semua toko di daerah tujuan ({daerahPool.length})
          </button>
        )}
        {candidates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => save({ toko: addTokoToTrip(list, t) })}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left border border-skin-bdr-lt hover:border-skin-accent transition"
          >
            <span className="min-w-0">
              <span className="block text-sm text-skin-text truncate">{t.nama}</span>
              <span className="block text-[11px] text-skin-text4 truncate">{t.daerah || t.alamat || ""}</span>
            </span>
            <span className="text-skin-accent-text text-lg leading-none">+</span>
          </button>
        ))}
      </div>
    </div>
  );
}
