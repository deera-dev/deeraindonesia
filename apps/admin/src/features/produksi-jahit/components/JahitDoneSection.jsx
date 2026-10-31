import { useMemo, useState } from "react";
import { useDoneJahitCards } from "../hooks";
import { cardWarnaLabel, fmtDate, groupCardsByKode } from "../utils";

export default function JahitDoneSection({ onPrint, onPrintGroup }) {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const { cards, loading } = useDoneJahitCards({ dateFrom, dateTo, search }, open);
  const groups = useMemo(() => groupCardsByKode(cards), [cards]);

  return (
    <div className="mt-4 bg-skin-raised border border-skin-bdr-lt">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="font-editorial text-[11px] tracking-[0.15em] uppercase text-skin-text2">
          Arsip Selesai
        </span>
        <span aria-hidden className="text-skin-text3 text-xs">
          {open ? "▾ Tutup" : "▸ Buka"}
        </span>
      </button>

      {open && (
        <div className="border-t border-skin-bdr-lt p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-skin-accent"
            />
            <span className="text-skin-text4 text-xs">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-skin-accent"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode..."
              className="flex-1 min-w-[120px] bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-skin-accent"
            />
          </div>

          {loading ? (
            <p className="text-xs text-skin-text3 text-center py-4">Memuat...</p>
          ) : cards.length === 0 ? (
            <p className="text-xs text-skin-text3 text-center py-4">
              Belum ada kartu selesai untuk filter ini.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.kode}>
                  <div className="flex items-center justify-between gap-2 px-0.5 pb-1">
                    <p className="font-medium text-skin-text text-xs truncate">{group.kode}</p>
                    <div className="shrink-0 flex items-center gap-2">
                      <p className="text-skin-text4 text-[10px]">{group.cards.length} kartu</p>
                      {onPrintGroup && (
                        <button
                          type="button"
                          onClick={() => onPrintGroup(group.cards)}
                          className="px-2 py-1 text-[10px] font-editorial tracking-[0.1em] uppercase text-skin-accent-text border border-skin-accent/50 hover:bg-skin-accent/10 transition"
                        >
                          🖶 Cetak semua
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {group.cards.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 bg-skin-card px-2.5 py-2 text-xs"
                      >
                        <p className="text-skin-text3 min-w-0 truncate">
                          {c.size} · {cardWarnaLabel(c.warna)} · {c.qty} pcs
                          {c.karyawan_nama ? ` · ${c.karyawan_nama}` : ""}
                        </p>
                        <div className="shrink-0 flex items-center gap-2">
                          <p className="text-skin-text4">{fmtDate(c.done_at)}</p>
                          {onPrint && (
                            <button
                              type="button"
                              onClick={() => onPrint(c)}
                              aria-label={`Cetak kartu ${c.kode_produk} ${c.size} ${c.warna}`}
                              className="px-1.5 py-0.5 text-skin-text3 border border-skin-bdr hover:border-skin-accent hover:text-skin-accent-text transition"
                            >
                              🖶
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
