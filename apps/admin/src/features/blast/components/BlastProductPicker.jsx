/**
 * BlastProductPicker.jsx — Step 1 BlastCreateModal: pilih produk yang mau
 * ditawarkan. Search + multi-select, gaya sama seperti BulkShareModal
 * (features/produk) supaya familiar bagi admin yang sudah pakai "Share
 * Banyak", tapi dipakai di sini sbg bagian dari alur Blast (bukan share
 * WA langsung).
 */
import { useMemo, useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";

export default function BlastProductPicker({ products, selectedKodes, onChange }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products ?? [];
    return (products ?? []).filter(
      (p) => p.kode.toLowerCase().includes(q) || (p.nama ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  function toggle(kode) {
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
          return (
            <button
              key={p.kode}
              type="button"
              onClick={() => toggle(p.kode)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                isSelected ? "bg-[#CAB170]/10" : "hover:bg-skin-page"
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
