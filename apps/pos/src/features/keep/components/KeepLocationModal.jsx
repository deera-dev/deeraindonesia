import { LOCATIONS, LOCATION_LABELS } from "@deera/shared/lib/marketDay";

// Saran admin (November 2026): keep yang disimpan sambil lupa ganti dropdown
// "Pasar" di atas (mis. abis edit keep lokasi lain, lupa balikin) bikin stok
// LOKASI YANG SALAH berkurang pas keep itu dibayar — dropdown "Pasar" dipakai
// dobel utk "saya lagi di mana sekarang" (penjualan biasa) DAN "keep ini utk
// lokasi mana", padahal dua hal beda. Keep BARU (bukan edit) wajib konfirmasi
// lokasi tujuannya di sini dulu — satu kali tap, bukan modal bertingkat,
// supaya tetap cocok dgn ritme pasar yang serba cepat.
export default function KeepLocationModal({ currentLocation, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="relative bg-skin-card w-full max-w-sm mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl overflow-hidden">
        <div className="bg-skin-header px-4 py-3 flex items-center justify-between">
          <span className="text-sm tracking-[0.1em] uppercase text-white font-medium">Keep untuk Pasar Mana?</span>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition text-xl">
            ✕
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-skin-text3 leading-relaxed mb-4">
            Pastikan lokasinya benar — stok baru berkurang di lokasi ini nanti pas keep dibayar.
          </p>
          <div className="space-y-2">
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => onConfirm(loc)}
                className={`w-full py-3 text-sm tracking-[0.08em] uppercase font-semibold border-2 transition ${
                  loc === currentLocation
                    ? "border-skin-accent bg-skin-gold text-skin-accent-text"
                    : "border-skin-bdr text-skin-text2 hover:border-skin-accent hover:text-skin-accent-text"
                }`}
              >
                {LOCATION_LABELS[loc] ?? loc}
                {loc === currentLocation ? " (saat ini)" : ""}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-full mt-3 py-2.5 text-xs tracking-[0.08em] uppercase text-skin-text3 hover:text-skin-text transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
