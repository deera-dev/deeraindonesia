import { useMemo, useState } from "react";
import { addTokoToTrip, removeTokoFromTrip, toggleTokoVisited, groupTripToko } from "../hooks";
import TripTokoRow from "./TripTokoRow";

export default function TripTokoSection({ trip, tokoList, save, opens = [], onSaveNoHp }) {
  const [search, setSearch] = useState("");
  const [opened, setOpened] = useState({});
  const list = trip.toko ?? [];

  const groups = useMemo(() => groupTripToko(trip.toko ?? [], tokoList), [trip.toko, tokoList]);
  const openByToko = useMemo(() => new Map((opens ?? []).map((o) => [String(o.toko_id), o])), [opens]);

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
        const open = !!opened[g.daerah];
        return (
          <section key={g.daerah} className="border border-skin-bdr-lt">
            <button
              type="button"
              onClick={() => setOpened((c) => ({ ...c, [g.daerah]: !open }))}
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
                  <TripTokoRow
                    key={t.toko_id}
                    trip={trip}
                    toko={t}
                    info={openByToko.get(String(t.toko_id))}
                    onToggle={() => save({ toko: toggleTokoVisited(list, t.toko_id) })}
                    onRemove={() => save({ toko: removeTokoFromTrip(list, t.toko_id) })}
                    onSaveNoHp={onSaveNoHp}
                  />
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
