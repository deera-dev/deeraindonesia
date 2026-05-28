/**
 * ProductList.jsx
 * Daftar produk di halaman Kasir — tersedia dua tampilan:
 * - Foto mode : grid 2 kolom dengan gambar produk
 * - Teks mode : list ringkas tanpa gambar (lebih cepat di pasar)
 *
 * Props:
 * - products   : produk yang sudah difilter & disorting
 * - showPhotos : boolean — foto atau teks mode
 * - location   : string — untuk tampilkan stok lokasi saat ini
 * - loading    : boolean
 * - onAddItem  : (product, variant) => void — tambah ke cart / buka warna panel
 */
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { formatHarga } from "@deera/shared/lib/constants";
import { getTotalStokVariant } from "../../lib/salesUtils";

export default function ProductList({ products, showPhotos, location, loading, onAddItem }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg text-skin-text3 tracking-[0.15em]">Memuat produk...</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-base text-skin-text4">Produk tidak ditemukan</p>
      </div>
    );
  }

  return showPhotos ? (
    <FotoGrid products={products} location={location} onAddItem={onAddItem} />
  ) : (
    <TeksList products={products} location={location} onAddItem={onAddItem} />
  );
}

// ── Foto Grid ────────────────────────────────────────────────────────────────
function FotoGrid({ products, location, onAddItem }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 p-3">
      {products.map((product) => {
        // Tampilkan semua ukuran yang ada di variants ATAU di stokByWarna
        const variantMap = {};
        for (const v of (product.variants ?? [])) variantMap[v.size] = v;
        const stokSizes = Object.keys(product.stokByWarna ?? {});
        const allSizes = [...new Set([...(product.variants ?? []).map((v) => v.size), ...stokSizes])];
        const avail = allSizes.map((s) => variantMap[s] ?? { size: s, harga: 0 });
        return (
          <div key={product.kode} className="bg-skin-card border-2 border-skin-bdr flex flex-col">
            {/* Gambar produk */}
            <div className="aspect-[3/4] overflow-hidden bg-skin-raised relative">
              {product.image && (
                <img
                  src={cldUrl(product.image, { width: 320 })}
                  alt={product.kode}
                  loading="lazy"
                  className="object-cover w-full h-full"
                />
              )}
              {product.warna?.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-2 py-1.5 text-center">
                  <p className="text-sm text-white font-medium">{product.warna.length} warna</p>
                </div>
              )}
            </div>

            {/* Info + tombol varian */}
            <div className="p-3 flex flex-col gap-2.5">
              <div>
                <p className="text-xl text-[#CAB170] leading-tight font-headline">{product.kode}</p>
              </div>

              {/* Tombol per ukuran — layout vertikal agar rapi walau nama panjang */}
              <div className="flex flex-col gap-2">
                {avail.map((v) => {
                  const stok = getTotalStokVariant(product, v.size, location);
                  return (
                    <button
                      key={v.size}
                      onClick={() => stok > 0 && v.harga > 0 && onAddItem(product, v)}
                      disabled={stok === 0 || v.harga === 0}
                      className={`w-full px-3 pt-3 pb-3 border-2 text-left transition ${
                        stok === 0 || v.harga === 0
                          ? "opacity-40 cursor-not-allowed bg-skin-page border-skin-bdr"
                          : "bg-skin-page border-skin-bdr hover:border-[#CAB170] hover:bg-skin-gold active:bg-skin-gold-deep"
                      }`}
                    >
                      {/* Ukuran — label kecil di atas */}
                      <p className="text-xs tracking-[0.18em] text-skin-text3 uppercase mb-1 font-medium">
                        {v.size}
                      </p>

                      {/* Harga — elemen utama, besar & terbaca */}
                      <p className="text-2xl text-[#CAB170] leading-tight font-headline">
                        {v.harga > 0 ? `Rp ${formatHarga(v.harga)}` : "—"}
                      </p>

                      {/* Baris bawah: stok + HPP */}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-base text-skin-text3 font-medium">
                          HPP {formatHarga(product.hpp)}
                        </span>
                        {stok === 0 ? (
                          <span className="text-sm font-bold text-red-600 tracking-[0.05em]">
                            HABIS
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-skin-text">{stok} pcs</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Teks List ─────────────────────────────────────────────────────────────────
function TeksList({ products, location, onAddItem }) {
  return (
    <div className="flex flex-col gap-2 p-3">
      {products.map((product) => {
        const variantMap2 = {};
        for (const v of (product.variants ?? [])) variantMap2[v.size] = v;
        const stokSizes2 = Object.keys(product.stokByWarna ?? {});
        const allSizes2 = [...new Set([...(product.variants ?? []).map((v) => v.size), ...stokSizes2])];
        const avail = allSizes2.map((s) => variantMap2[s] ?? { size: s, harga: 0 });
        const totalStok = avail.reduce(
          (sum, v) => sum + getTotalStokVariant(product, v.size, location),
          0,
        );
        return (
          <div key={product.kode} className="bg-skin-card border-2 border-skin-bdr">
            {/* Header produk */}
            <div className="px-4 py-3 border-b border-skin-bdr-lt flex items-center gap-2">
              <span className="text-xl text-[#CAB170] leading-none font-headline">
                {product.kode}
              </span>

              {product.warna?.length > 0 && (
                <span className="text-sm text-skin-text2 bg-skin-page border border-skin-bdr px-2 py-1 flex-shrink-0">
                  {product.warna.length} warna
                </span>
              )}

              <span className="ml-auto text-sm font-bold text-skin-text flex-shrink-0">
                {totalStok === 0 ? <span className="text-red-600">HABIS</span> : `${totalStok} pcs`}
              </span>
            </div>

            {/* Baris per ukuran — tap untuk tambah */}
            <div className="flex flex-col divide-y divide-skin-bdr-lt">
              {avail.map((v) => {
                const stok = getTotalStokVariant(product, v.size, location);
                return (
                  <button
                    key={v.size}
                    onClick={() => stok > 0 && v.harga > 0 && onAddItem(product, v)}
                    disabled={stok === 0 || v.harga === 0}
                    className={`flex items-center gap-3 px-4 py-3.5 transition text-left w-full ${
                      stok === 0 || v.harga === 0
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-skin-gold active:bg-skin-gold-deep"
                    }`}
                  >
                    {/* Ukuran */}
                    <span className="text-base font-bold text-skin-text uppercase tracking-[0.05em] shrink-0 w-28">
                      {v.size}
                    </span>

                    {/* HPP — tengah */}
                    <span className="text-sm text-skin-text3 flex-1">
                      HPP {formatHarga(product.hpp)}
                    </span>

                    {/* Harga — kanan, utama */}
                    <span className="text-xl text-[#CAB170] leading-none shrink-0 font-headline">
                      {v.harga > 0 ? `Rp. ${formatHarga(v.harga)}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
