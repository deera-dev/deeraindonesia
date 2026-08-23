/**
 * ProductDetailModal.jsx
 * Modal detail produk di Admin — fullscreen di mobile, centered di desktop.
 *
 * Props:
 * - product  : objek produk
 * - stok     : { gudang, cideng, tegalgubug, sizes? }
 * - onClose  : () => void
 * - onEdit   : () => void
 */
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { formatHarga } from "@deera/shared/lib/constants";
import { useSalesByKode, useProducedByKode } from "../hooks";

const LOCS = [
  { key: "gudang", label: "Gudang" },
  { key: "cideng", label: "Cideng" },
  { key: "tegalgubug", label: "Tegalgubug" },
];

export default function ProductDetailModal({ product: p, stok = {}, onClose, onEdit }) {
  const total = (stok.gudang ?? 0) + (stok.cideng ?? 0) + (stok.tegalgubug ?? 0);
  const isHabis = total === 0;
  const variants = (p.variants ?? []).filter((v) => v.harga > 0);
  const { data: sales, isLoading: salesLoading } = useSalesByKode(p.kode);
  const { producedBySize, isLoading: producedLoading } = useProducedByKode(p.kode);
  const producedSizes = Object.entries(producedBySize);
  const producedTotal = producedSizes.reduce((s, [, qty]) => s + qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr flex-shrink-0">
          <h3 className="text-2xl text-[#CAB170] leading-none font-headline">{p.kode}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-skin-text3 hover:text-skin-text text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Foto */}
          {p.image && (
            <div className="aspect-[3/4] max-h-64 overflow-hidden bg-skin-raised mx-auto w-full">
              <img
                src={cldUrl(p.image, { width: 480 })}
                alt={p.kode}
                className="object-cover object-top w-full h-full"
              />
            </div>
          )}

          {/* Info dasar */}
          <div className="space-y-1">
            <p className="text-lg text-skin-text font-semibold leading-snug">{p.nama}</p>
            {p.bahan && <p className="text-base text-skin-text2">{p.bahan}</p>}
            {p.hpp > 0 && <p className="text-base text-skin-text3">HPP: Rp {formatHarga(p.hpp)}</p>}
          </div>

          {/* Ukuran & harga */}
          {variants.length > 0 && (
            <div className="border-t border-skin-bdr-lt pt-4">
              <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-2">
                Ukuran & Harga
              </p>
              <div className="space-y-1.5">
                {variants.map((v, i) => (
                  <div key={i} className="flex justify-between items-baseline">
                    <span className="text-base font-semibold text-skin-text uppercase tracking-wide">
                      {v.size}
                    </span>
                    <span className="text-base text-[#CAB170] font-semibold">
                      Rp {formatHarga(v.harga)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stok per lokasi / ukuran */}
          <div className="border-t border-skin-bdr-lt pt-4">
            <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-3">
              Stok
            </p>

            {stok.sizes && Object.keys(stok.sizes).length > 1 ? (
              /* Kartu bertumpuk, bukan <table> — kolom seperti "Tegalgubug"
                 gampang membuat <table> melebihi lebar layar HP dan
                 memaksa scroll horizontal. Grid 3 kolom di bawah selalu
                 pas di layar sempit karena labelnya pendek & seragam. */
              <div className="space-y-2">
                {Object.entries(stok.sizes).map(([size, vals]) => {
                  const sizeTotal =
                    (vals.gudang ?? 0) + (vals.cideng ?? 0) + (vals.tegalgubug ?? 0);
                  return (
                    <div key={size} className="border border-skin-bdr-lt p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-skin-text uppercase tracking-wide">
                          {size}
                        </span>
                        <span
                          className={`text-base font-bold ${sizeTotal === 0 ? "text-skin-text4" : "text-skin-text"}`}
                        >
                          {sizeTotal === 0 ? "HABIS" : sizeTotal}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {LOCS.map((l) => (
                          <div key={l.key} className="text-center">
                            <p className="text-[10px] text-skin-text3 uppercase tracking-wide mb-0.5">
                              {l.label}
                            </p>
                            <p
                              className={`text-sm font-semibold ${vals[l.key] === 0 ? "text-skin-text4" : "text-skin-text2"}`}
                            >
                              {vals[l.key] ?? 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Total keseluruhan */}
                <div className="border-2 border-skin-bdr p-3 bg-skin-page">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-skin-text uppercase tracking-wide">
                      Total
                    </span>
                    <span
                      className={`text-lg font-bold ${isHabis ? "text-red-500" : "text-skin-text"}`}
                    >
                      {isHabis ? "HABIS" : total}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {LOCS.map((l) => (
                      <div key={l.key} className="text-center">
                        <p className="text-[10px] text-skin-text3 uppercase tracking-wide mb-0.5">
                          {l.label}
                        </p>
                        <p
                          className={`text-sm font-semibold ${(stok[l.key] ?? 0) === 0 ? "text-skin-text4" : "text-skin-text2"}`}
                        >
                          {stok[l.key] ?? 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {LOCS.map(({ key, label }) => {
                  const val = stok[key] ?? 0;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-base text-skin-text2 font-medium">{label}</span>
                      <span
                        className={`text-3xl font-bold leading-none ${val === 0 ? "text-skin-text4" : "text-skin-text"}`}
                      >
                        {val}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t-2 border-skin-bdr pt-3">
                  <span className="text-base text-skin-text font-bold uppercase tracking-wide">
                    Total
                  </span>
                  <span
                    className={`text-4xl font-bold leading-none ${isHabis ? "text-red-500" : "text-skin-text"}`}
                  >
                    {isHabis ? "HABIS" : total}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Riwayat Penjualan */}
          <div className="border-t border-skin-bdr-lt pt-4">
            <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-3">
              Riwayat Penjualan
            </p>
            {salesLoading ? (
              <p className="text-sm text-skin-text4">Memuat...</p>
            ) : (
              <div className="space-y-2">
                {LOCS.map(({ key, label }) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-skin-text2">{label}</span>
                    <span className="text-sm font-semibold text-skin-text">{sales[key] ?? 0}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-skin-bdr-lt pt-2">
                  <span className="text-sm font-bold text-skin-text uppercase tracking-wide">
                    Total Terjual
                  </span>
                  <span className="text-sm font-bold text-[#CAB170]">{sales.total ?? 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Stok Sesuai Produksi — total qty yang PERNAH diproduksi per
              ukuran (dijumlah dari semua produksi_batch milik kode ini),
              beda dari "Stok" (angka aktual saat ini) dan "Riwayat
              Penjualan" (angka terjual) — permintaan Denny 2026-08. */}
          <div className="border-t border-skin-bdr-lt pt-4">
            <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-3">
              Stok Sesuai Produksi
            </p>
            {producedLoading ? (
              <p className="text-sm text-skin-text4">Memuat...</p>
            ) : producedSizes.length === 0 ? (
              <p className="text-sm text-skin-text4">Belum ada data produksi.</p>
            ) : (
              <div className="space-y-2">
                {producedSizes.map(([size, qty]) => (
                  <div key={size} className="flex justify-between">
                    <span className="text-sm text-skin-text2 uppercase tracking-wide">{size}</span>
                    <span className="text-sm font-semibold text-skin-text">{qty}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-skin-bdr-lt pt-2">
                  <span className="text-sm font-bold text-skin-text uppercase tracking-wide">
                    Total
                  </span>
                  <span className="text-sm font-bold text-[#CAB170]">{producedTotal}</span>
                </div>
              </div>
            )}
          </div>

          {/* Warna */}
          {p.warna?.length > 0 && (
            <div className="border-t border-skin-bdr-lt pt-4">
              <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-2">
                {p.warna.length} Warna
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.warna.map((w, i) => (
                  <span
                    key={i}
                    className="text-sm text-skin-text2 border border-skin-bdr bg-skin-page px-2.5 py-1"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Aksi */}
        <div className="flex-shrink-0 border-t-2 border-skin-bdr">
          <button
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="w-full py-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-[#CAB170] hover:bg-skin-gold transition"
          >
            ✎ Edit Produk
          </button>
        </div>
      </div>
    </div>
  );
}
