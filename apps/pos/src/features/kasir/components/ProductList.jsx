import { cldUrl } from "@deera/shared/lib/cloudinary";
import { formatHarga } from "@deera/shared/lib/constants";
import { getTotalStokVariant, getCombinedStokVariant } from "../../../shared/lib/salesUtils";

export default function ProductList({ products, showPhotos, location, loading, gabungan, onAddItem }) {
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
    <FotoGrid products={products} location={location} gabungan={gabungan} onAddItem={onAddItem} />
  ) : (
    <TeksList products={products} location={location} gabungan={gabungan} onAddItem={onAddItem} />
  );
}

function FotoGrid({ products, location, gabungan, onAddItem }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 lg:gap-2 xl:grid-cols-4 2xl:grid-cols-6 p-3 lg:p-2">
      {products.map((product) => {
        const variantMap = {};
        for (const v of (product.variants ?? [])) variantMap[v.size] = v;
        const stokSizes = Object.keys(product.stokByWarna ?? {});
        const allSizes = [...new Set([...(product.variants ?? []).map((v) => v.size), ...stokSizes])];
        const avail = allSizes.map((s) => variantMap[s] ?? { size: s, harga: 0 });
        return (
          <div key={product.kode} className="bg-skin-card border-2 border-skin-bdr flex flex-col">
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
                <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-2 py-1.5 lg:py-1 text-center">
                  <p className="text-sm lg:text-xs text-white font-medium">{product.warna.length} warna</p>
                </div>
              )}
            </div>

            <div className="p-3 lg:p-2 flex flex-col gap-2.5 lg:gap-1.5">
              <div>
                <p className="text-xl lg:text-base text-skin-accent-text leading-tight font-headline">{product.kode}</p>
              </div>

              <div className="flex flex-col gap-2 lg:gap-1">
                {avail.map((v) => {
                  const stok = gabungan
                    ? getCombinedStokVariant(product, v.size)
                    : getTotalStokVariant(product, v.size, location);
                  return (
                    <button
                      key={v.size}
                      onClick={() => stok > 0 && v.harga > 0 && onAddItem(product, v)}
                      disabled={stok === 0 || v.harga === 0}
                      className={`w-full px-3 pt-3 pb-3 lg:px-2 lg:pt-1.5 lg:pb-1.5 border-2 text-left transition ${
                        stok === 0 || v.harga === 0
                          ? "opacity-40 cursor-not-allowed bg-skin-page border-skin-bdr"
                          : "bg-skin-page border-skin-bdr hover:border-skin-accent hover:bg-skin-gold active:bg-skin-gold-deep"
                      }`}
                    >
                      <p className="text-xs lg:text-[10px] tracking-[0.18em] text-skin-text3 uppercase mb-1 lg:mb-0 font-medium">
                        {v.size}
                      </p>

                      <p className="text-2xl lg:text-lg text-skin-accent-text leading-tight font-headline">
                        {v.harga > 0 ? `Rp ${formatHarga(v.harga)}` : "—"}
                      </p>

                      <div className="flex items-center justify-between mt-1.5 lg:mt-0.5">
                        <span className="text-base lg:text-xs text-skin-text3 font-medium">
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

function TeksList({ products, location, gabungan, onAddItem }) {
  return (
    <div className="grid grid-cols-1 gap-2 p-3 lg:gap-1.5 lg:p-2 xl:grid-cols-2 2xl:grid-cols-3 items-start">
      {products.map((product) => {
        const variantMap2 = {};
        for (const v of (product.variants ?? [])) variantMap2[v.size] = v;
        const stokSizes2 = Object.keys(product.stokByWarna ?? {});
        const allSizes2 = [...new Set([...(product.variants ?? []).map((v) => v.size), ...stokSizes2])];
        const avail = allSizes2.map((s) => variantMap2[s] ?? { size: s, harga: 0 });
        const totalStok = avail.reduce(
          (sum, v) =>
            sum + (gabungan ? getCombinedStokVariant(product, v.size) : getTotalStokVariant(product, v.size, location)),
          0,
        );
        return (
          <div key={product.kode} className="bg-skin-card border-2 border-skin-bdr">
            <div className="px-4 py-3 lg:px-3 lg:py-1.5 border-b border-skin-bdr-lt flex items-center gap-2">
              <span className="text-xl lg:text-lg text-skin-accent-text leading-none font-headline">
                {product.kode}
              </span>

              {product.warna?.length > 0 && (
                <span className="text-sm lg:text-xs text-skin-text2 bg-skin-page border border-skin-bdr px-2 py-1 lg:py-0.5 flex-shrink-0">
                  {product.warna.length} warna
                </span>
              )}

              <span className="ml-auto text-sm font-bold text-skin-text flex-shrink-0">
                {totalStok === 0 ? <span className="text-red-600">HABIS</span> : `${totalStok} pcs`}
              </span>
            </div>

            <div className="flex flex-col divide-y divide-skin-bdr-lt">
              {avail.map((v) => {
                const stok = gabungan
                  ? getCombinedStokVariant(product, v.size)
                  : getTotalStokVariant(product, v.size, location);
                return (
                  <button
                    key={v.size}
                    onClick={() => stok > 0 && v.harga > 0 && onAddItem(product, v)}
                    disabled={stok === 0 || v.harga === 0}
                    className={`flex items-center gap-3 px-4 py-3.5 lg:px-3 lg:py-2 transition text-left w-full ${
                      stok === 0 || v.harga === 0
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-skin-gold active:bg-skin-gold-deep"
                    }`}
                  >
                    <span className="text-base lg:text-sm font-bold text-skin-text uppercase tracking-[0.05em] shrink-0 w-28 lg:w-24">
                      {v.size}
                    </span>

                    <span className="text-sm lg:text-xs text-skin-text3 flex-1">
                      HPP {formatHarga(product.hpp)}
                    </span>

                    <span className="text-xl lg:text-lg text-skin-accent-text leading-none shrink-0 font-headline">
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
