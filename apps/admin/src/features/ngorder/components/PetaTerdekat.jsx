/**
 * PetaTerdekat.jsx — hasil "Terdekat": toko terurut jarak TEMPUH asli dari
 * titik Anda (lihat rankNearestByRoad di geocode.js). Tap baris = pilih/batal
 * utk rute; "Pilih semua" lalu Urutkan Rute di PetaTab.
 */
export default function PetaTerdekat({ items, selected, onToggle, onSelectAll, onClose }) {
  if (!items.length) return null;
  const estimate = items.some((i) => i.isEstimate);
  return (
    <div className="px-4">
      <div className="border border-skin-bdr-lt bg-skin-card">
        <div className="flex items-center justify-between px-4 py-2 border-b border-skin-bdr-lt">
          <span className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3">
            Terdekat{estimate ? " (garis lurus)" : ""}
          </span>
          <div className="flex items-center gap-3 text-xs">
            <button type="button" onClick={onSelectAll} className="text-[#A8925A] underline">
              Pilih semua
            </button>
            <button type="button" onClick={onClose} aria-label="Tutup" className="text-skin-text3 text-base leading-none">
              ×
            </button>
          </div>
        </div>
        <div className="divide-y divide-skin-bdr-lt">
          {items.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggle(t)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-skin-bg2"
            >
              <span
                className={`flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center text-xs font-bold ${
                  selected.has(t.id) ? "bg-[#CAB170] border-[#CAB170] text-white" : "border-skin-bdr text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="flex-1 min-w-0 text-sm text-skin-text truncate">
                {i + 1}. {t.nama}
              </span>
              <span className="flex-shrink-0 text-xs text-skin-text3">
                {t.distanceKm.toFixed(1)} km{t.durationMin != null ? ` · ${Math.round(t.durationMin)} mnt` : ""}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
