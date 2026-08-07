import { useMemo, useState } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { useSalesByPelanggan } from "../hooks";
import { fmtRp, fmtDate, groupSaleItems } from "../utils";

// Baris 1 item (kode+size, qty gabungan lintas warna) — SENGAJA tidak
// pakai nama produk (instruksi Denny: kode saja). Gambar produk (kalau
// ada) langsung tampil penuh di samping (tanpa toggle) — tap gambarnya
// buat buka lightbox ukuran penuh (onImageClick, lihat komponen induk).
function SaleItemRow({ row, image, onImageClick }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      {image && (
        <button
          type="button"
          onClick={() => onImageClick(image)}
          className="flex-shrink-0"
          title="Lihat gambar penuh"
        >
          <img
            src={cldUrl(image, { width: 200 })}
            alt={row.kode}
            loading="lazy"
            className="w-16 h-16 sm:w-20 sm:h-20 object-cover border border-skin-bdr hover:border-[#CAB170] transition"
          />
        </button>
      )}
      <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-skin-text font-mono truncate">
            {row.kode}
            {row.size ? ` · ${row.size}` : ""}
          </p>
          <p className="text-xs text-skin-text4">
            {row.qty} pcs &times; {fmtRp(row.harga)}
            {row.warnaBreakdown.length > 0 &&
              ` (${row.warnaBreakdown.map((w) => `${w.warna} ${w.qty}`).join(", ")})`}
          </p>
        </div>
        <p className="flex-shrink-0 text-skin-text2 font-medium">{fmtRp(row.subtotal)}</p>
      </div>
    </div>
  );
}

// Lightbox sederhana — overlay TERPISAH dari modal utama, z-index lebih
// tinggi (z-[60] > z-50) supaya menumpuk DI ATAS PelangganDetailModal,
// bukan menggantikannya (modal riwayat tetap ada di belakang).
function ImageLightbox({ image, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl w-10 h-10 flex items-center justify-center"
      >
        ×
      </button>
      <img
        src={cldUrl(image, { width: 1000 })}
        alt=""
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export default function PelangganDetailModal({ pelanggan, onClose }) {
  const { sales, loading } = useSalesByPelanggan(pelanggan?.id);
  const { products } = useProducts();

  const imageMap = useMemo(() => {
    const map = {};
    (products ?? []).forEach((p) => (map[p.kode] = p.image));
    return map;
  }, [products]);

  const [lightboxImage, setLightboxImage] = useState(null);

  const totalTransaksi = sales.length;
  const totalOmzet = sales.reduce(
    (sum, s) => sum + (s.type === "retur" ? -1 : 1) * (Number(s.total) || 0),
    0,
  );
  // Kalau transaksi banyak, default collapsed (accordion) supaya tidak
  // membanjiri layar — kalau sedikit (<=3), langsung expand semua.
  const defaultOpen = totalTransaksi <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-editorial text-base text-skin-text truncate">{pelanggan?.nama}</h2>
            {pelanggan?.no_hp && (
              <a
                href={`tel:${pelanggan.no_hp}`}
                className="text-sm text-[#CAB170] hover:underline mt-0.5 block"
              >
                {pelanggan.no_hp}
              </a>
            )}
            {!loading && (
              <p className="text-xs text-skin-text4 mt-1">
                {totalTransaksi} transaksi &middot; {fmtRp(totalOmzet)} bersih
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <p className="text-center text-sm text-skin-text3 py-10 font-editorial">Memuat...</p>
          )}
          {!loading && sales.length === 0 && (
            <p className="text-center text-sm text-skin-text4 py-10 font-editorial">
              Belum ada riwayat pembelian tercatat untuk pelanggan ini.
            </p>
          )}

          {!loading &&
            sales.map((s) => {
              const rows = groupSaleItems(s.items);
              const isRetur = s.type === "retur";
              return (
                <details
                  key={s.id}
                  open={defaultOpen}
                  className={`group border-2 ${isRetur ? "border-red-300" : "border-skin-bdr"}`}
                >
                  <summary className="cursor-pointer select-none list-none px-3 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="inline-block flex-shrink-0 text-skin-text4 transition-transform group-open:rotate-90">
                        ›
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-skin-text">{fmtDate(s.date)}</p>
                        <p className="text-xs text-skin-text4">
                          {LOCATION_LABELS[s.location] ?? s.location}
                          {s.created_by_name ? ` · ${s.created_by_name}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {isRetur && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-red-600 border border-red-300">
                          Retur
                        </span>
                      )}
                      <span className="text-sm font-semibold text-skin-text">{fmtRp(s.total)}</span>
                    </div>
                  </summary>

                  <div className="px-3 pb-3 space-y-2 border-t border-skin-bdr-lt pt-2">
                    {rows.map((r, i) => (
                      <SaleItemRow
                        key={i}
                        row={r}
                        image={imageMap[r.kode]}
                        onImageClick={setLightboxImage}
                      />
                    ))}
                    {s.discount > 0 && (
                      <p className="text-xs text-skin-text4 text-right">Diskon {fmtRp(s.discount)}</p>
                    )}
                  </div>
                </details>
              );
            })}
        </div>
      </div>

      {lightboxImage && (
        <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
