/**
 * BulkShareModal.jsx — Pilih beberapa produk sekaligus lalu kirim satu kali
 * ke WhatsApp (share massal). Dibuka dari tombol "Share Banyak" di
 * AdminPage.jsx (lihat handleBulkShareWA di sana untuk toast/close).
 *
 * Kirim dilakukan lewat shareProductsViaWA() di ../utils.js — satu pesan
 * teks gabungan (generateWABulkText) + (kalau browser mendukung
 * navigator.share dgn banyak file) satu foto per produk terlampir
 * bersamaan. Lihat komentar panjang di shareProductsViaWA utk detail
 * kenapa fallback wa.me TIDAK bisa melampirkan foto sama sekali —
 * keterbatasan nyata WhatsApp Web link, bukan bug.
 *
 * Modal ini TIDAK melakukan fetch data sendiri — menerima `products` (list
 * lengkap, sudah dimuat AdminPage lewat useProducts()) sebagai prop, dan
 * punya search box LOKAL sendiri (independen dari search box utama
 * AdminPage) supaya user tetap bisa memilih dari seluruh katalog walau
 * sedang mem-filter grid utama.
 */
import { useMemo, useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { shareProductsViaWA } from "../utils";

export default function BulkShareModal({ products, onClose, onShared }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products ?? [];
    return (products ?? []).filter(
      (p) => p.kode.toLowerCase().includes(q) || (p.nama ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  function toggle(kode) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode);
      else next.add(kode);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((p) => next.add(p.kode));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleSend() {
    if (selected.size === 0 || sending) return;
    setSending(true);
    setError("");
    try {
      const selectedProducts = (products ?? []).filter((p) => selected.has(p.kode));
      const { method } = await shareProductsViaWA(selectedProducts);
      if (method === "aborted") {
        // User membatalkan share sheet — biarkan modal terbuka, pilihan tetap ada.
        return;
      }
      if (method === "busy") {
        setError("Masih ada proses share yang berjalan, coba lagi sebentar.");
        return;
      }
      onShared?.(selectedProducts.length);
      onClose();
    } finally {
      setSending(false);
    }
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.kode));

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={sending ? undefined : onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">
            Bagikan Banyak Produk
          </h2>
          <button
            onClick={onClose}
            disabled={sending}
            className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 border-b border-skin-bdr-lt flex-shrink-0 space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama produk..."
            className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-skin-text3 font-editorial">
              {selected.size} produk dipilih
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={allVisibleSelected ? clearSelection : selectAllVisible}
                className="text-xs font-editorial tracking-[0.08em] uppercase text-[#CAB170] hover:text-[#A8925A] underline"
              >
                {allVisibleSelected ? "Batal Pilih Semua" : "Pilih Semua"}
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 hover:text-red-500 underline"
                >
                  Hapus Pilihan
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-skin-text4 py-12">Tidak ada produk cocok</p>
          )}
          {filtered.map((p) => {
            const isSelected = selected.has(p.kode);
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
                    <img
                      src={cldUrl(p.image, { width: 80 })}
                      alt={p.kode}
                      loading="lazy"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-skin-text4 text-xs">
                      —
                    </span>
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

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 space-y-2">
          {error && <p className="text-xs text-red-500 font-editorial">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-40"
            >
              Batal
            </button>
            <button
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#25D366] hover:bg-[#20bb5a] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? "Mengirim..." : `Kirim ke WhatsApp (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
