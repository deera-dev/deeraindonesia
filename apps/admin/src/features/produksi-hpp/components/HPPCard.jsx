/**
 * HPPCard.jsx — Kartu ringkas template HPP tersimpan (list view).
 *
 * Redesign UX (lihat UX_REDESIGN_TEMPLATE_HPP_HARGA_DASAR.md — Bagian A):
 * - Seluruh kartu bisa di-tap untuk membuka Bottom Sheet Detail (onOpenDetail).
 * - Hanya 2 elemen interaktif di footer: "Bagikan" (sekunder, outline) dan
 *   menu "⋮" (OverflowMenu) berisi Edit & Hapus — aksi destruktif tidak lagi
 *   semudah aksi aman.
 * - Total HPP naik jadi elemen paling besar & paling gold di kartu.
 * - Info gelaran jadi badge kecil, bukan kalimat penuh.
 * - Rincian bahan/biaya TIDAK lagi expand in-place di sini — pindah ke
 *   HppTemplateDetailSheet.jsx (Bottom Sheet), lihat komponen tsb.
 */
import { fmtRp } from "../utils";
import OverflowMenu from "../../../shared/components/OverflowMenu";
import { WhatsApp } from "../../../shared/components/WhatsApp";

export default function HPPCard({ tpl, produk, onEdit, onDelete, onShare, onOpenDetail }) {
  // Infer gelaran from saved bahan_items (all share the same untuk_n_baju)
  const gelaran = tpl.bahan_items?.[0]?.untuk_n_baju ?? 1;

  const menuItems = [
    { key: "edit", label: "Edit", onClick: () => onEdit(tpl) },
    { key: "hapus", label: "Hapus", onClick: () => onDelete(tpl), destructive: true },
  ];

  return (
    <div
      className="bg-skin-card border border-skin-bdr cursor-pointer hover:border-[#CAB170]/50 transition"
      onClick={() => onOpenDetail?.(tpl)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpenDetail?.(tpl);
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-skin-text">{tpl.kode_produk}</p>
              {gelaran > 1 && (
                <span className="text-[10px] px-1.5 py-0.5 border border-[#CAB170]/50 text-[#CAB170] leading-none">
                  {gelaran} gelaran
                </span>
              )}
            </div>
            <p className="text-xs text-skin-text3 truncate mt-0.5">{produk?.nama ?? "—"}</p>
          </div>
        </div>

        <p className="text-2xl font-bold text-[#CAB170] mt-2">{fmtRp(tpl.total_hpp)}</p>

        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(tpl)}
              className="flex-1 py-2 px-2 flex items-center justify-center gap-1.5 text-xs font-editorial tracking-[0.12em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition"
            >
              <WhatsApp className="w-3.5 h-3.5" />
              Bagikan
            </button>
          )}
          <OverflowMenu items={menuItems} label={`Menu ${tpl.kode_produk}`} />
        </div>
      </div>
    </div>
  );
}
