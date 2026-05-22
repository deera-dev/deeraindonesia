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

export default function ProductList({
  products,
  showPhotos,
  location,
  loading,
  onAddItem,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg text-[#9C9690] tracking-[0.15em]">
          Memuat produk...
        </p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-base text-[#C8C4C0]">Produk tidak ditemukan</p>
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
        const avail = (product.variants ?? []).filter((v) => v.harga > 0);
        return (
          <div
            key={product.kode}
            className="bg-white border-2 border-[#E8E3DC] flex flex-col"
          >
            {/* Gambar produk */}
            <div className="aspect-[3/4] overflow-hidden bg-[#F2EDE6] relative">
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
                  <p className="text-sm text-white font-medium">
                    {product.warna.length} warna
                  </p>
                </div>
              )}
            </div>

            {/* Info + tombol varian */}
            <div className="p-3 flex flex-col gap-2.5">
              <div>
                <p
                  className="text-xl text-[#CAB170] leading-tight"
                  style={{ fontFamily: "'Braise', serif" }}
                >
                  {product.kode}
                </p>
              </div>

              {/* Tombol per ukuran — layout vertikal agar rapi walau nama panjang */}
              <div className="flex flex-col gap-2">
                {avail.map((v) => {
                  const stok = getTotalStokVariant(product, v.size, location);
                  return (
                    <button
                      key={v.size}
                      onClick={() => onAddItem(product, v)}
                      className="w-full px-3 pt-3 pb-3 border-2 text-left transition bg-[#F9F7F4] border-[#E8E3DC] hover:border-[#CAB170] hover:bg-[#FDF5E6] active:bg-[#EDD9A3]"
                    >
                      {/* Ukuran — label kecil di atas */}
                      <p className="text-xs tracking-[0.18em] text-[#9C9690] uppercase mb-1 font-medium">
                        {v.size}
                      </p>

                      {/* Harga — elemen utama, besar & terbaca */}
                      <p
                        className="text-2xl text-[#CAB170] leading-tight"
                        style={{ fontFamily: "'Braise', serif" }}
                      >
                        Rp {formatHarga(v.harga)}
                      </p>

                      {/* Baris bawah: stok + HPP */}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-base text-[#9C9690] font-medium">
                          HPP {formatHarga(product.hpp)}
                        </span>
                        {stok === 0 ? (
                          <span className="text-sm font-bold text-red-600 tracking-[0.05em]">
                            HABIS
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-[#1A1918]">
                            {stok} pcs
                          </span>
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
        const avail = (product.variants ?? []).filter((v) => v.harga > 0);
        const totalStok = avail.reduce(
          (sum, v) => sum + getTotalStokVariant(product, v.size, location),
          0,
        );
        return (
          <div
            key={product.kode}
            className="bg-white border-2 border-[#E8E3DC]"
          >
            {/* Header produk */}
            <div className="px-4 py-3 border-b border-[#F0EBE3] flex items-center gap-2">
              <span
                className="text-xl text-[#CAB170] leading-none"
                style={{ fontFamily: "'Braise', serif" }}
              >
                {product.kode}
              </span>

              {product.warna?.length > 0 && (
                <span className="text-sm text-[#6B6560] bg-[#F9F7F4] border border-[#E8E3DC] px-2 py-1 flex-shrink-0">
                  {product.warna.length} warna
                </span>
              )}

              <span className="ml-auto text-sm font-bold text-[#1A1918] flex-shrink-0">
                {totalStok === 0 ? (
                  <span className="text-red-600">HABIS</span>
                ) : (
                  `${totalStok} pcs`
                )}
              </span>
            </div>

            {/* Baris per ukuran — tap untuk tambah */}
            <div className="flex flex-col divide-y divide-[#F5F0EA]">
              {avail.map((v) => {
                const stok = getTotalStokVariant(product, v.size, location);
                return (
                  <button
                    key={v.size}
                    onClick={() => onAddItem(product, v)}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#FDF5E6] active:bg-[#EDD9A3] transition text-left w-full"
                  >
                    {/* Ukuran */}
                    <span className="text-base font-bold text-[#1A1918] uppercase tracking-[0.05em] shrink-0 w-28">
                      {v.size}
                    </span>

                    {/* HPP — tengah */}
                    <span className="text-sm text-[#9C9690] flex-1">
                      HPP {formatHarga(product.hpp)}
                    </span>

                    {/* Harga — kanan, utama */}
                    <span
                      className="text-xl text-[#CAB170] leading-none shrink-0"
                      style={{ fontFamily: "'Braise', serif" }}
                    >
                      Rp. {formatHarga(v.harga)}
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
