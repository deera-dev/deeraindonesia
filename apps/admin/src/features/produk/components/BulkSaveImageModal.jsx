import { localDateStr } from "@deera/shared/lib/bepUtils";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { useMemo, useRef, useState } from "react";
import ProductCodeCard from "./ProductCodeCard";

function firstUkuranBerharga(product) {
  const variants = (product.variants ?? []).filter((v) => v.harga > 0);
  return variants[0]?.size ?? null;
}

function waitForCardImages(el) {
  const imgs = el ? el.querySelectorAll("img") : [];
  return Promise.all(
    Array.from(imgs).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }),
  );
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function base64FromDataUrl(dataUrl) {
  return dataUrl.split(",")[1] ?? "";
}

export default function BulkSaveImageModal({ products, onClose, onSaved }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [exportProduct, setExportProduct] = useState(null);
  const cardRef = useRef(null);

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

  async function handleBulkDownload() {
    if (selected.size === 0 || exporting) return;
    const list = (products ?? []).filter((p) => selected.has(p.kode));
    setExporting(true);
    setProgress({ current: 0, total: list.length });
    try {
      const [{ toPng }, { default: JSZip }] = await Promise.all([
        import("html-to-image"),
        import("jszip"),
      ]);
      const zip = new JSZip();
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        setExportProduct(p);
        setProgress({ current: i + 1, total: list.length });
        await waitFrame();
        await waitForCardImages(cardRef.current);
        const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
        const size = firstUkuranBerharga(p);
        const sizePart = size ? `-${size.replace(/\s+/g, "")}` : "";
        zip.file(`${p.kode}${sizePart}.png`, base64FromDataUrl(dataUrl), { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simpan-gambar-${localDateStr()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      onSaved?.(list.length);
      onClose();
    } finally {
      setExporting(false);
      setExportProduct(null);
    }
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.kode));

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={exporting ? undefined : onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">
            Unduh Gambar Banyak
          </h2>
          <button
            onClick={onClose}
            disabled={exporting}
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
            disabled={exporting}
            className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition placeholder:text-skin-text4 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-skin-text3 font-editorial">{selected.size} produk dipilih</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={allVisibleSelected ? clearSelection : selectAllVisible}
                disabled={exporting}
                className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-accent-text hover:text-skin-accent-text underline disabled:opacity-40"
              >
                {allVisibleSelected ? "Batal Pilih Semua" : "Pilih Semua"}
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={exporting}
                  className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 hover:text-red-500 underline disabled:opacity-40"
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
                disabled={exporting}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition disabled:opacity-60 ${
                  isSelected ? "bg-skin-accent/10" : "hover:bg-skin-page"
                }`}
              >
                <span
                  className={`flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center text-xs font-bold ${
                    isSelected
                      ? "bg-skin-accent border-skin-accent text-skin-on-accent"
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
                  <span className="block text-sm font-semibold text-skin-text truncate">
                    {p.kode}
                  </span>
                  <span className="block text-xs text-skin-text3 truncate">{p.nama}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 space-y-2">
          {exporting && (
            <p className="text-xs text-skin-text3 font-editorial text-center">
              Memproses {progress.current}/{progress.total}
              {exportProduct ? ` — ${exportProduct.kode}` : ""}...
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={exporting}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-40"
            >
              Batal
            </button>
            <button
              onClick={handleBulkDownload}
              disabled={selected.size === 0 || exporting}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exporting ? "Memproses..." : `Unduh Gambar (${selected.size})`}
            </button>
          </div>
        </div>
      </div>

      {exportProduct && (
        <div style={{ position: "fixed", top: 0, left: -9999, pointerEvents: "none" }}>
          <ProductCodeCard
            ref={cardRef}
            product={exportProduct}
            size={firstUkuranBerharga(exportProduct)}
          />
        </div>
      )}
    </div>
  );
}
