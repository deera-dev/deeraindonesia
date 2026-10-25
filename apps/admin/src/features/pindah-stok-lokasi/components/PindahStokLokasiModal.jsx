import { useState } from "react";
import { LOCATIONS, LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { toast } from "@deera/shared/features/toast/hooks";
import { useMoveStokLokasi } from "../hooks";

const inputCls =
  "w-full bg-skin-card border-2 border-skin-bdr px-4 py-3 text-skin-text text-base focus:outline-none focus:border-skin-accent disabled:opacity-40 transition";
const labelCls = "block text-sm tracking-[0.2em] text-skin-text2 mb-2 uppercase";

export default function PindahStokLokasiModal({ onClose, onDone }) {
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const moveStokLokasi = useMoveStokLokasi();

  const sameLocation = fromLocation && fromLocation === toLocation;
  const canSubmit =
    fromLocation && toLocation && !sameLocation && password && confirmText.trim().toUpperCase() === "PINDAH";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setErrMsg("");
    setSaving(true);
    try {
      const result = await moveStokLokasi({ fromLocation, toLocation, password });
      toast.success(
        `Stok dipindah: ${result?.total_pcs ?? 0} pcs dari ${LOCATION_LABELS[fromLocation]} ke ${LOCATION_LABELS[toLocation]}.`,
      );
      onDone?.();
    } catch (err) {
      setErrMsg(err.message ?? String(err));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={saving ? undefined : onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative bg-skin-card w-full max-w-lg mx-auto border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col h-[100dvh] md:h-auto md:max-h-[90dvh]"
      >
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr">
          <h2 className="text-skin-accent-text text-2xl leading-none font-headline">Pindahkan Stok Lokasi</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center text-skin-text3 hover:text-red-500 transition text-2xl disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-6">
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-300 text-sm text-amber-800 leading-relaxed">
            ⚠ Seluruh stok (semua produk, ukuran, warna) di lokasi asal akan dipindahkan ke lokasi tujuan dan
            lokasi asal akan menjadi 0. Aksi ini tidak bisa dibatalkan.
          </div>

          <div className="mb-5">
            <label className={labelCls} htmlFor="pindah-stok-from">Dari Lokasi</label>
            <select
              id="pindah-stok-from"
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              disabled={saving}
              className={inputCls}
            >
              <option value="">Pilih lokasi asal...</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className={labelCls} htmlFor="pindah-stok-to">Ke Lokasi</label>
            <select
              id="pindah-stok-to"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              disabled={saving}
              className={inputCls}
            >
              <option value="">Pilih lokasi tujuan...</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>
            {sameLocation && (
              <p className="mt-2 text-sm text-red-600">Lokasi asal dan tujuan tidak boleh sama.</p>
            )}
          </div>

          <div className="mb-5">
            <label className={labelCls} htmlFor="pindah-stok-confirm">
              Ketik <span className="text-skin-accent-text">PINDAH</span> untuk konfirmasi
            </label>
            <input
              id="pindah-stok-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={saving}
              placeholder="PINDAH"
              className={inputCls}
            />
          </div>

          <div className="mb-2">
            <label className={labelCls} htmlFor="pindah-stok-password">Password Akun Anda</label>
            <input
              id="pindah-stok-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
              placeholder="Masukkan password untuk konfirmasi"
              className={inputCls}
              autoComplete="current-password"
            />
          </div>

          {errMsg && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">{errMsg}</p>
          )}
        </div>

        <div className="flex-shrink-0 border-t-2 border-skin-bdr p-4 flex gap-3">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="flex-1 py-4 bg-red-600 text-white text-base tracking-[0.2em] uppercase hover:bg-red-700 transition disabled:opacity-40"
          >
            {saving ? "Memindahkan..." : "Pindahkan Stok"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-8 py-4 border-2 border-skin-bdr text-base tracking-[0.2em] uppercase text-skin-text3 hover:text-skin-text hover:border-skin-text transition disabled:opacity-40"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
