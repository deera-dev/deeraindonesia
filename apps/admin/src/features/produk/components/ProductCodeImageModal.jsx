/**
 * ProductCodeImageModal.jsx
 * Modal "Simpan Gambar" — preview kartu ProductCodeCard (foto + kode besar +
 * ukuran) & tombol unduh PNG (permintaan Denny 2026-08). Kalau produk punya
 * lebih dari 1 ukuran (varian harga > 0), tampilkan picker ukuran dulu
 * ("bisa pilih mau save dengan ukuran yang mana" — jawaban Denny) — pilih
 * ukuran langsung update preview & nama file yang diunduh.
 *
 * Props:
 * - product : objek produk
 * - onClose : () => void
 */
import { useRef, useState } from "react";
import ProductCodeCard, { CARD_WIDTH, CARD_HEIGHT } from "./ProductCodeCard";

// Kartu asli berukuran A4 penuh (794×1123px, lihat ProductCodeCard.jsx) —
// terlalu besar utk preview di dalam modal, jadi ditampilkan diperkecil
// pakai CSS transform pada WRAPPER LUAR (bukan pada elemen yg di-ref oleh
// cardRef). html-to-image meng-capture elemen ref apa adanya (ukuran
// layout asli, tidak ikut ter-scale oleh transform milik wrapper di
// luarnya), jadi hasil unduhan tetap resolusi penuh A4 walau preview-nya
// kelihatan kecil.
const PREVIEW_SCALE = 0.4;

export default function ProductCodeImageModal({ product, onClose }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const variants = (product.variants ?? []).filter((v) => v.harga > 0);
  const [selectedSize, setSelectedSize] = useState(variants[0]?.size ?? null);

  async function handleDownload() {
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const a = document.createElement("a");
      a.href = dataUrl;
      const sizePart = selectedSize ? `-${selectedSize.replace(/\s+/g, "")}` : "";
      a.download = `${product.kode}${sizePart}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex md:items-center md:justify-center bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0 hidden md:block" onClick={onClose} />
      <div className="relative bg-skin-card w-full h-full md:h-auto md:max-w-sm md:max-h-[90vh] flex flex-col md:border-2 border-skin-bdr shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-skin-bdr-lt flex-shrink-0">
          <h3 className="font-headline text-lg text-skin-text">Simpan Gambar</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Picker ukuran — hanya kalau produk punya >1 ukuran berharga */}
        {variants.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-skin-bdr-lt flex-shrink-0">
            {variants.map((v) => (
              <button
                key={v.size}
                type="button"
                onClick={() => setSelectedSize(v.size)}
                className={`px-3 py-1.5 text-xs font-semibold tracking-[0.06em] uppercase transition border ${
                  selectedSize === v.size
                    ? "bg-[#CAB170] text-white border-[#CAB170]"
                    : "border-skin-bdr text-skin-text3 hover:text-skin-text2 hover:border-[#CAB170]"
                }`}
              >
                {v.size}
              </button>
            ))}
          </div>
        )}

        {/* Preview — di-capture ke PNG. Wrapper luar ini yang di-scale
            visual (bukan kartu itu sendiri), lihat komentar PREVIEW_SCALE
            di atas. */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex justify-center">
            <div
              style={{
                width: CARD_WIDTH * PREVIEW_SCALE,
                height: CARD_HEIGHT * PREVIEW_SCALE,
              }}
            >
              <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
                <ProductCodeCard ref={cardRef} product={product} size={selectedSize} />
              </div>
            </div>
          </div>
        </div>

        {/* Aksi */}
        <div className="flex-shrink-0 border-t border-skin-bdr-lt p-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleDownload}
            className="w-full py-3 text-sm font-editorial tracking-[0.12em] uppercase bg-[#CAB170] text-white hover:bg-[#A8925A] transition disabled:opacity-50"
          >
            {busy ? "Memproses..." : "Unduh Gambar"}
          </button>
        </div>
      </div>
    </div>
  );
}
