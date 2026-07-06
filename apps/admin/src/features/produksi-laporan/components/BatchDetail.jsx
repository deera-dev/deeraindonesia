import { fmtRp } from "../utils";

// Expand satu batch: tampilkan ukuran + warna + bahan dipakai.
export default function BatchDetail({ batch }) {
  const sizes = batch.sizes ?? [];
  const bahan = batch.bahan_dipakai ?? [];
  const totalModal = (batch.hpp_per_item || 0) * (batch.total_kain || 0);

  return (
    <div className="px-3 pb-3 pt-2 border-t border-skin-bdr-lt space-y-3">
      {/* Total modal batch ini */}
      {totalModal > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-skin-text3">Total Modal Batch</span>
          <span className="font-semibold text-[#CAB170]">{fmtRp(totalModal)}</span>
        </div>
      )}

      {/* Breakdown ukuran × warna */}
      {sizes.length > 0 && (
        <div>
          <p className="text-[10px] font-editorial tracking-[0.12em] uppercase text-skin-text3 mb-1.5">
            Ukuran & Warna
          </p>
          <div className="space-y-1">
            {sizes.map((sz, i) => (
              <div key={i} className="text-xs">
                <span className="text-skin-text2 font-medium">{sz.size}</span>
                <span className="text-skin-text3 ml-2">
                  {(sz.warna ?? [])
                    .map((w) => `${w.warna === "_" ? "—" : w.warna}: ${w.qty}`)
                    .join(" · ")}
                </span>
                <span className="text-skin-text3 ml-2">
                  = {(sz.warna ?? []).reduce((s, w) => s + (w.qty || 0), 0)} baju
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bahan dipakai */}
      {bahan.length > 0 && (
        <div>
          <p className="text-[10px] font-editorial tracking-[0.12em] uppercase text-skin-text3 mb-1.5">
            Bahan Dipakai
          </p>
          <div className="space-y-0.5">
            {bahan.map((bh, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-skin-text3 truncate max-w-[60%]">{bh.nama_bahan}</span>
                <span className="text-skin-text font-medium">
                  {Number(bh.jumlah).toFixed(2)} <span className="text-skin-text3">{bh.satuan}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bahan.length === 0 && (
        <p className="text-xs text-amber-600">
          Bahan dipakai belum tercatat — jalankan migration backfill atau edit ulang batch.
        </p>
      )}

      {batch.catatan && (
        <p className="text-xs text-skin-text3 italic border-t border-skin-bdr-lt pt-2">{batch.catatan}</p>
      )}
    </div>
  );
}
