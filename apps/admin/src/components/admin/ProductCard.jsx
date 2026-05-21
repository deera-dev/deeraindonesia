import { cldUrl } from "@deera/shared/lib/cloudinary";
import { formatHarga } from "@deera/shared/lib/constants";

export default function ProductCard({ product: p, onEdit, onDelete, onCopyWA, isCopied }) {
  const activeVariants = (p.variants ?? []).filter((v) => v.harga > 0);

  // Stok diagregasi dari dalam variants
  const stokGudang    = (p.variants ?? []).reduce((s, v) => s + (v.stok_gudang     ?? 0), 0);
  const stokCideng    = (p.variants ?? []).reduce((s, v) => s + (v.stok_cideng     ?? 0), 0);
  const stokTegal     = (p.variants ?? []).reduce((s, v) => s + (v.stok_tegalgubug ?? 0), 0);
  const totalStok     = stokGudang + stokCideng + stokTegal;

  return (
    <article className="flex flex-col bg-black border border-white/10 hover:border-white/25 transition">
      {/* FOTO */}
      <div className="aspect-[3/4] overflow-hidden bg-white/5 relative">
        {p.image && (
          <img src={cldUrl(p.image, { width: 400 })} alt={p.nama} loading="lazy"
            className="object-cover w-full h-full" />
        )}
        <div className={`absolute top-2 right-2 px-2 py-0.5 font-editorial text-[9px] tracking-[0.1em] border ${totalStok === 0 ? "border-red-500/40 text-red-400 bg-black/70" : "border-white/20 text-white/60 bg-black/70"}`}>
          {totalStok === 0 ? "Habis" : `Stok ${totalStok}`}
        </div>
      </div>

      {/* INFO */}
      <div className="p-3 flex-1">
        <p className="font-headline text-[#cab170] text-base leading-tight truncate">{p.kode}</p>
        <p className="mt-1 font-editorial text-[10px] tracking-[0.15em] text-white/55 truncate uppercase">{p.nama}</p>

        {activeVariants.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {activeVariants.map((v, i) => (
              <span key={i} className="font-editorial text-[8px] tracking-[0.1em] text-[#cab170]/60 border border-[#cab170]/20 px-1.5 py-0.5 uppercase">
                {v.size}
              </span>
            ))}
          </div>
        )}

        {/* STOK per lokasi (total semua ukuran) */}
        <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-0.5">
          {[
            { label: "Gudang",      val: stokGudang },
            { label: "Cideng",      val: stokCideng },
            { label: "Tegalgubug",  val: stokTegal  },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between">
              <span className="font-editorial text-[9px] text-white/30">{label}</span>
              <span className={`font-editorial text-[9px] ${val === 0 ? "text-white/20" : "text-white/60"}`}>{val}</span>
            </div>
          ))}
          <div className="flex justify-between pt-0.5 border-t border-white/[0.06]">
            <span className="font-editorial text-[9px] text-white/40">Total</span>
            <span className={`font-editorial text-[9px] ${totalStok === 0 ? "text-red-400" : "text-white/80"}`}>{totalStok}</span>
          </div>
        </div>

        {p.hpp > 0 && (
          <p className="mt-2 font-editorial text-[9px] text-white/25">HPP: Rp {formatHarga(p.hpp)}</p>
        )}
      </div>

      {/* ACTIONS */}
      <div className="border-t border-white/10">
        <div className="grid grid-cols-2 divide-x divide-white/10">
          <button onClick={onEdit} className="py-2 font-editorial text-[9px] tracking-[0.2em] uppercase text-white/50 hover:text-white hover:bg-white/5 transition">Edit</button>
          <button onClick={onDelete} className="py-2 font-editorial text-[9px] tracking-[0.2em] uppercase text-white/30 hover:text-red-400 hover:bg-red-900/20 transition">Hapus</button>
        </div>
        <button onClick={onCopyWA}
          className={`w-full py-2 font-editorial text-[9px] tracking-[0.2em] uppercase border-t border-white/10 transition ${isCopied ? "bg-green-900/30 text-green-400" : "text-[#cab170]/70 hover:bg-[#cab170]/10 hover:text-[#cab170]"}`}>
          {isCopied ? "Tersalin!" : "Copy WA"}
        </button>
      </div>
    </article>
  );
}
