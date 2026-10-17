import { fmtRp, fmt4, calcQtyPerBaju, biayaLainBreakdown } from "../utils";
import BottomSheet from "../../../shared/components/BottomSheet";
import OverflowMenu from "../../../shared/components/OverflowMenu";
import { WhatsApp } from "../../../shared/components/WhatsApp";

export default function HppTemplateDetailSheet({ tpl, produk, onClose, onEdit, onDelete, onShare }) {
  const gelaran = tpl.bahan_items?.[0]?.untuk_n_baju ?? 1;

  const menuItems = [
    { key: "edit", label: "Edit", onClick: () => onEdit(tpl) },
    { key: "hapus", label: "Hapus", onClick: () => onDelete(tpl), destructive: true },
  ];

  const biayaLain = biayaLainBreakdown({
    upah_jahit: tpl.upah_jahit,
    bordir: tpl.bordir,
    kancing_qty: tpl.kancing_qty,
    kancing_extra: tpl.kancing_extra,
    biaya_studio: tpl.biaya_studio,
    config: tpl.config_snapshot ?? {},
  }).filter((b) => b.val > 0);

  return (
    <BottomSheet
      title={`${tpl.kode_produk} — ${produk?.nama ?? "—"}`}
      onClose={onClose}
      headerExtra={<OverflowMenu items={menuItems} label={`Menu ${tpl.kode_produk}`} />}
      footer={
        onShare && (
          <button
            type="button"
            onClick={() => onShare(tpl)}
            className="w-full py-3.5 flex items-center justify-center gap-2 font-editorial text-sm tracking-[0.15em] uppercase text-white bg-[#25D366] hover:bg-[#1eb558] transition"
          >
            <WhatsApp className="w-4 h-4" />
            Bagikan ke WhatsApp
          </button>
        )
      }
    >
      <div className="space-y-4">
        {gelaran > 1 && (
          <p className="text-xs text-skin-accent-text">Gelaran: {gelaran} produk per potong</p>
        )}

        <div className="border-2 border-skin-accent bg-skin-gold p-3 flex items-center justify-between">
          <span className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-accent-text">
            Total HPP
          </span>
          <span className="text-xl font-bold text-skin-accent-text">{fmtRp(tpl.total_hpp)}</span>
        </div>

        {(tpl.bahan_items ?? []).length > 0 && (
          <div>
            <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-2">
              Bahan
            </p>
            {tpl.bahan_items.map((b, i) => {
              const nBaju = Math.max(Number(b.untuk_n_baju) || 1, 1);
              const qpb = Number(b.qty_per_baju) || calcQtyPerBaju(b);
              const subtotal = Number(b.subtotal) || Math.round(qpb * (Number(b.harga_satuan) || 0));
              const isMotif = b.jenis === "motif";
              const warnaQtys = isMotif ? (b.warna_qtys ?? []).filter((w) => Number(w.qty) > 0) : [];
              return (
                <div key={i} className="py-1.5 border-b border-skin-bdr-lt last:border-0 space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-skin-text2 font-medium">
                      {b.nama_bahan}
                      <span className="ml-1 text-skin-text3 font-normal">
                        ({isMotif ? "motif" : "tambahan"})
                      </span>
                    </span>
                    <span className="text-skin-accent-text font-semibold">{fmtRp(subtotal)}</span>
                  </div>
                  {isMotif && warnaQtys.length > 0 ? (
                    <div className="space-y-0.5 pl-1 border-l-2 border-skin-bdr">
                      {warnaQtys.map((w, wi) => (
                        <p key={wi} className="text-xs text-skin-text3">
                          {w.warna || `Warna ${wi + 1}`}: {fmt4(Number(w.qty) / nBaju)} {b.satuan_ukur || b.satuan}/baju
                        </p>
                      ))}
                      <p className="text-xs text-skin-text3">
                        {fmt4(qpb)} {b.satuan}/baju × {fmtRp(b.harga_satuan)}/{b.satuan}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-skin-text3">
                      {fmt4(qpb)} {b.satuan}/baju × {fmtRp(b.harga_satuan)}/{b.satuan}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {biayaLain.length > 0 && (
          <div>
            <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-2">
              Biaya Lain
            </p>
            <div className="space-y-1 text-xs">
              {biayaLain.map((b) => (
                <div key={b.label} className="flex justify-between">
                  <span className="text-skin-text3">{b.label}</span>
                  <span>{fmtRp(b.val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tpl.catatan && (
          <div>
            <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1">
              Catatan
            </p>
            <p className="text-xs text-skin-text2">{tpl.catatan}</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
