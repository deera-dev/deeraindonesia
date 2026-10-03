/**
 * SampelProductPicker.jsx — pilih produk (search + multi-select) utk
 * dikirim sebagai sampel. `statusByKode` (dari summarizeTokoItems) dipakai
 * utk kasih tanda produk yang masih "Menunggu" keputusan toko (dicegah
 * dikirim ulang dobel selagi belum ada keputusan) — produk yang sudah
 * "Dipilih"/"Tidak Dipilih" ATAU belum pernah dikirim tetap boleh dipilih
 * (kirim ulang yang sebelumnya ditolak, atau kirim baru).
 */
import { useMemo, useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";

const STATUS_TAG = { dipilih: "Dipilih", tidak_dipilih: "Tidak Dipilih", pending: "Menunggu" };

export default function SampelProductPicker({ products, statusByKode, selectedKodes, onChange }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products ?? [];
    return (products ?? []).filter(
      (p) => p.kode.toLowerCase().includes(q) || (p.nama ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  function toggle(kode, disabled) {
    if (disabled) return;
    const next = new Set(selectedKodes);
    if (next.has(kode)) next.delete(kode);
    else next.add(kode);
    onChange(next);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 space-y-2 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kode atau nama produk..."
          className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
        />
        <p className="text-xs text-skin-text3 font-editorial">{selectedKodes.size} produk dipilih</p>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
        {filtered.map((p) => {
          const isSelected = selectedKodes.has(p.kode);
          const existingStatus = statusByKode?.get(p.kode)?.status;
          const disabled = existingStatus === "pending";
          return (
            <button
              key={p.kode}
              type="button"
              onClick={() => toggle(p.kode, disabled)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                disabled ? "opacity-40 cursor-not-allowed" : isSelected ? "bg-[#CAB170]/10" : "hover:bg-skin-page"
              }`}
            >
              <span
                className={`flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center text-xs font-bold ${
                  isSelected
                    ? "bg-[#CAB170] border-[#CAB170] text-white"
                    : "border-skin-bdr text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="flex-shrink-0 w-10 h-10 bg-skin-raised overflow-hidden">
                {p.image ? (
                  <img src={cldUrl(p.image, { width: 80 })} alt={p.kode} loading="lazy" className="object-cover w-full h-full" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-skin-text4 text-xs">—</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-skin-text truncate">{p.kode}</span>
                <span className="block text-xs text-skin-text3 truncate">{p.nama}</span>
              </span>
              {existingStatus && (
                <span className="flex-shrink-0 text-[10px] font-editorial tracking-[0.05em] uppercase text-skin-text4">
                  {STATUS_TAG[existingStatus]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
