/**
 * FotoCantikModal.jsx — pilih foto produk dari satu transaksi lalu kirim ke
 * WhatsApp pembeli (Web Share API, fallback wa.me teks).
 */
import { useState, useMemo, useEffect } from "react";
import { useFotoCantik, sharePhotos } from "../hooks";

export default function FotoCantikModal({ sale, onClose }) {
  const { photos, loading } = useFotoCantik(sale);
  const urls = useMemo(() => Object.fromEntries(photos.filter((p) => p.blob).map((p) => [p.kode, URL.createObjectURL(p.blob)])), [photos]);
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL?.(u)), [urls]);
  const [off, setOff] = useState({}); // kode → true bila dimatikan
  const [sharing, setSharing] = useState(false);
  const [err, setErr] = useState("");
  const selected = photos.filter((p) => !off[p.kode]);
  const withPhoto = selected.filter((p) => p.blob).length;

  async function share() {
    setSharing(true);
    try {
      const r = await sharePhotos(sale, selected);
      if (r.method === "unsupported") setErr("Perangkat ini belum mendukung menu share. Coba dari HP atau Chrome terbaru.");
      else if (r.method !== "aborted") onClose();
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-skin-text">Share Foto Cantik</h2>
            <p className="text-xs text-skin-text3 truncate">{sale.buyer_name || "Pembeli"} · pilih foto yang dikirim</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="text-2xl px-2 text-skin-text3">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-center text-sm text-skin-text3 py-10">Menyiapkan foto…</p>}
          {!loading && photos.length === 0 && <p className="text-center text-sm text-skin-text3 py-10">Transaksi ini tidak punya produk.</p>}
          <div className="grid grid-cols-2 gap-3">
            {photos.map((p) => {
              const active = !off[p.kode];
              return (
                <button
                  key={p.kode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setOff((o) => ({ ...o, [p.kode]: active }))}
                  className={`relative border-2 text-left ${active ? "border-skin-accent" : "border-skin-bdr opacity-50"}`}
                >
                  {p.blob ? (
                    <img src={urls[p.kode]} alt={p.kode} className="w-full aspect-[3/4] object-cover" />
                  ) : (
                    <div className="w-full aspect-[3/4] flex items-center justify-center text-xs text-skin-text4 bg-skin-raised">Tidak ada foto</div>
                  )}
                  <p className="px-2 py-1.5 text-xs font-mono text-skin-text truncate">{p.kode}</p>
                </button>
              );
            })}
          </div>
        </div>

        {err && <p role="alert" className="px-4 pb-2 text-xs text-red-500">{err}</p>}
        <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
          <button onClick={onClose} className="px-4 py-3 border-2 border-skin-bdr text-sm uppercase tracking-[0.1em] text-skin-text2">Batal</button>
          <button
            onClick={share}
            disabled={loading || sharing || selected.length === 0}
            className="flex-1 py-3 bg-skin-accent text-skin-on-accent text-sm tracking-[0.1em] uppercase font-semibold hover:bg-skin-accent-hover disabled:opacity-40"
          >
            {sharing ? "Membuka…" : `Bagikan${withPhoto ? ` (${withPhoto} foto)` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
