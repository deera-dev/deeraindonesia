/**
 * JahitDoneSection.jsx — arsip kartu yang sudah ditandai "Selesai".
 *
 * Permintaan Denny 2026-09: bagian ini HARUS selalu ada (bukan hilang kalau
 * kosong), tapi dibuat accordion (default tertutup) + filter tanggal & cari
 * kode, supaya tidak menumpuk penuh karena produksi terus jalan dan arsip
 * ini akan terus bertambah. Query ke server (fetchDoneJahitCards) hanya
 * jalan saat accordion dibuka (lihat useDoneJahitCards enabled=open).
 */
import { useState } from "react";
import { useDoneJahitCards } from "../hooks";
import { cardWarnaLabel, fmtDate } from "../utils";

export default function JahitDoneSection() {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const { cards, loading } = useDoneJahitCards({ dateFrom, dateTo, search }, open);

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
              className="bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170]"
            />
            <span className="text-skin-text4 text-xs">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode..."
              className="flex-1 min-w-[120px] bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170]"
            />
          </div>

          {loading ? (
            <p className="text-xs text-skin-text3 text-center py-4">Memuat...</p>
          ) : cards.length === 0 ? (
            <p className="text-xs text-skin-text3 text-center py-4">
              Belum ada kartu selesai untuk filter ini.
            </p>
          ) : (
            <div className="space-y-1.5">
              {cards.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 bg-skin-card px-2.5 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-skin-text truncate">{c.kode_produk}</p>
                    <p className="text-skin-text3">
                      {c.size} · {cardWarnaLabel(c.warna)} · {c.qty} pcs
                      {c.karyawan_nama ? ` · ${c.karyawan_nama}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-skin-text4">{fmtDate(c.done_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
