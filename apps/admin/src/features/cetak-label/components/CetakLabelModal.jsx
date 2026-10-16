/**
 * CetakLabelModal.jsx — cetak label QR 40×30 mm per ukuran. Jumlah default = jumlah produksi
 * ukuran itu (bisa diedit). Link & teks otomatis dari kode produk.
 */
import { useEffect, useState } from "react";
import { useLabelPrint, labelDataUrl, labelText, labelUrl } from "../hooks";

export default function CetakLabelModal({ kode, onClose }) {
  const { rows, isLoading, setQty, total, print, busy, progress, error } = useLabelPrint(kode);
  const [preview, setPreview] = useState(null);
  const firstSize = rows[0]?.size;
  useEffect(() => {
    let cancelled = false;
    if (!firstSize) return undefined;
    labelDataUrl({ kode, size: firstSize })
      .then((u) => !cancelled && setPreview(u))
      .catch(() => !cancelled && setPreview(null));
    return () => {
      cancelled = true;
    };
  }, [kode, firstSize]);

  async function onPrint() {
    if (await print()) onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-skin-text">Cetak Label QR</h2>
            <p className="text-xs text-skin-text3 truncate">{kode} · kertas 40×30 mm</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="text-2xl px-2 text-skin-text3">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {preview && (
            <div className="flex flex-col items-center gap-1">
              <img src={preview} alt="Pratinjau label" className="border border-skin-bdr bg-white" style={{ width: 240 }} />
              <p className="text-[11px] text-skin-text4 break-all text-center">{labelUrl(kode)}</p>
            </div>
          )}
          {isLoading && <p className="text-sm text-skin-text3 text-center">Memuat data produksi…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-skin-text3 text-center">Belum ada data produksi untuk produk ini, jadi belum ada ukuran yang bisa dicetak.</p>
          )}
          <div className="divide-y divide-skin-bdr-lt">
            {rows.map((r) => (
              <div key={r.size} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-skin-text">{labelText(kode, r.size)}</p>
                  <p className="text-[11px] text-skin-text4">Produksi {r.produced} pcs</p>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  aria-label={`Jumlah label ${r.size}`}
                  value={r.qty}
                  onChange={(e) => setQty(r.size, e.target.value)}
                  className="w-20 text-center bg-skin-page border border-skin-bdr py-2 text-base text-skin-text focus:outline-none focus:border-skin-accent"
                />
              </div>
            ))}
          </div>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 space-y-2">
          {progress && <p className="text-xs text-skin-text3 text-center">{progress.stage === "connect" ? "Menyambung ke printer…" : `Mengirim ${progress.pct}%`}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={busy} className="px-4 py-3 border-2 border-skin-bdr text-sm uppercase tracking-[0.1em] text-skin-text2">Batal</button>
            <button
              onClick={onPrint}
              disabled={busy || total === 0}
              className="flex-1 py-3 bg-skin-accent text-skin-on-accent text-sm tracking-[0.1em] uppercase font-semibold hover:bg-skin-accent-hover disabled:opacity-40"
            >
              {busy ? "Mencetak…" : `Print ${total} label`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
