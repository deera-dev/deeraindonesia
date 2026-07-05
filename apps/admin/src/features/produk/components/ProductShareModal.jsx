/**
 * ProductShareModal.jsx
 * Modal berbagi produk: tampilkan kartu produk + tombol WA (share image+teks langsung)
 * + unduh PNG + salin teks WA.
 */
import { useRef, useState } from "react";
import { generateWAText } from "@deera/shared/lib/waFormat";
import ProductShareCard from "./ProductShareCard";

export default function ProductShareModal({ product, onClose }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const waText = generateWAText(product);

  /** Hasilkan blob PNG dari kartu */
  async function generateBlob() {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
    const res = await fetch(dataUrl);
    return { blob: await res.blob(), dataUrl };
  }

  /** Salin teks WA ke clipboard */
  async function copyText() {
    try {
      await navigator.clipboard.writeText(waText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = waText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  /**
   * WA share: share gambar + teks sekaligus via navigator.share (Web Share API).
   * Fallback ke buka WA link dengan teks saja jika API tidak support file sharing.
   */
  async function shareViaWA() {
    setGenerating(true);
    try {
      const { blob, dataUrl } = await generateBlob();
      const file = new File([blob], `produk-${product.kode}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: product.kode, text: waText });
      } else {
        // Fallback: buka WA dengan teks, download gambar otomatis
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
        setTimeout(() => {
          window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");
        }, 300);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");
      }
    } finally {
      setGenerating(false);
    }
  }

  /** Unduh PNG */
  async function downloadImage() {
    setGenerating(true);
    try {
      const { dataUrl } = await generateBlob();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `produk-${product.kode}.png`;
      a.click();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex md:items-center md:justify-center bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0 hidden md:block" onClick={onClose} />
      <div className="relative bg-skin-card w-full h-full md:h-auto md:max-w-sm md:max-h-[90vh] flex flex-col md:border-2 border-skin-bdr shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-skin-bdr-lt flex-shrink-0">
          <h3 className="font-headline text-lg text-skin-text">Bagikan Produk</h3>
          <button type="button" onClick={onClose} className="text-skin-text3 hover:text-skin-text text-xl leading-none w-8 h-8 flex items-center justify-center">
            ×
          </button>
        </div>

        {/* Kartu produk — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex justify-center">
            <ProductShareCard ref={cardRef} product={product} />
          </div>
        </div>

        {/* Aksi */}
        <div className="flex-shrink-0 border-t border-skin-bdr-lt p-3 space-y-2">
          {/* WA share — utama */}
          <button
            type="button"
            disabled={generating}
            onClick={shareViaWA}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-editorial tracking-[0.12em] uppercase bg-[#25D366] text-white hover:bg-[#20bb5a] transition disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {generating ? "Memproses..." : "Kirim ke WhatsApp"}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyText}
              className="flex-1 py-2.5 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-skin-text transition"
            >
              {copied ? "✓ Tersalin" : "Salin Teks"}
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={downloadImage}
              className="flex-1 py-2.5 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-skin-text transition disabled:opacity-50"
            >
              {generating ? "..." : "Unduh PNG"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
