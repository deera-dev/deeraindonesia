/**
 * JahitColumn.jsx — satu kolom kanban ("Belum Assign" / "On Progress" /
 * "Ready Finishing"). Kolom berdampingan di md+ lewat flex-row di
 * ProduksiJahitPage.jsx (BUKAN CSS grid/table — lihat aturan CLAUDE.md §13
 * utk konten yang perlu responsif di mobile).
 *
 * Mobile (permintaan Denny 2026-09 — 95% akses dari HP, keluhan harus
 * scroll panjang buat cek On Progress/Ready Finishing kalau Belum Assign
 * lagi banyak): HANYA kolom `active` yang ditampilkan (via tab switcher di
 * ProduksiJahitPage), kolom lain `hidden`. Di md+ SEMUA kolom tetap tampil
 * berdampingan seperti sebelumnya (`md:block` menimpa `hidden`), `active`
 * tidak berpengaruh di desktop.
 *
 * Dikelompokkan per kode_produk (permintaan Denny 2026-09: "terlalu pusing
 * lihatnya" — satu batch bisa punya belasan kartu size×warna, kode/nama jadi
 * berulang-ulang). Header grup tampilkan kode/nama + total qty sekali saja;
 * kartu di dalamnya pakai JahitCard showKode={false}. Lihat groupCardsByKode
 * di ../utils.js.
 */
import { useMemo } from "react";
import JahitCard from "./JahitCard";
import { groupCardsByKode } from "../utils";

export default function JahitColumn({ label, cards, active = true, ...cardHandlers }) {
  const groups = useMemo(() => groupCardsByKode(cards), [cards]);

  return (
    <div className={`${active ? "block" : "hidden"} md:block flex-1 min-w-0 bg-skin-raised border border-skin-bdr-lt`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-skin-bdr-lt">
        <p className="font-editorial text-[11px] tracking-[0.15em] uppercase text-skin-text2">{label}</p>
        <span className="text-xs font-semibold text-skin-text3">{cards.length}</span>
      </div>
      <div className="p-2 space-y-3">
        {cards.length === 0 ? (
          <p className="text-xs text-skin-text3 text-center py-6">Belum ada kartu.</p>
        ) : (
          groups.map((group) => (
            <div key={group.kode}>
              <div className="flex items-start justify-between gap-2 px-0.5 pb-1.5">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-skin-text truncate">{group.kode}</p>
                  <p className="text-xs text-skin-text3 truncate">{group.nama}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold text-[#CAB170]">{group.totalQty} pcs</p>
              </div>
              <div className="space-y-2">
                {group.cards.map((card) => (
                  <JahitCard key={card.id} card={card} showKode={false} {...cardHandlers} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
