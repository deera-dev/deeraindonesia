import { useState } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "@deera/shared/features/products/hooks";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { useFavorites } from "../hooks";
import { shareFavoritesViaWA } from "../utils";
import FavoriteButton from "./FavoriteButton";

export default function FavoritesPage() {
  const { products, loading } = useProducts();
  const { favoriteKodes, toggle, clear, count } = useFavorites();
  const [sharing, setSharing] = useState(false);

  const favoriteProducts = (products ?? []).filter((p) => favoriteKodes.has(p.kode));

  async function handleShareAll() {
    setSharing(true);
    try {
      await shareFavoritesViaWA(favoriteProducts);
    } finally {
      setSharing(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 sm:px-10 md:px-16">
      <div className="flex items-center justify-between mb-8">
        <Link
          to="/catalog"
          className="font-editorial text-sm tracking-[0.3em] text-white/30 uppercase hover:text-white/60 transition py-2"
        >
          ← Katalog
        </Link>
        <p className="font-editorial text-xs tracking-[0.2em] text-white/40 uppercase">
          {count} favorit
        </p>
      </div>

      <p className="font-headline text-[#cab170] text-4xl mb-8">Favorit Saya</p>

      {loading && (
        <p className="font-editorial text-white/30 text-xs tracking-[0.2em]">MEMUAT...</p>
      )}

      {!loading && favoriteProducts.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-editorial text-white/30 text-xs tracking-[0.25em] mb-6">
            BELUM ADA PRODUK FAVORIT
          </p>
          <Link
            to="/catalog"
            className="inline-block px-6 py-3 font-editorial text-xs tracking-[0.3em] uppercase border border-white/25 text-white/70 hover:border-white hover:text-white transition"
          >
            Jelajahi Katalog
          </Link>
        </div>
      )}

      {!loading && favoriteProducts.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {favoriteProducts.map((p) => (
              <div key={p.kode} className="relative">
                <Link to={`/code/${p.kode}`} className="block">
                  <img
                    src={cldUrl(p.image, { width: 400 })}
                    alt={p.nama}
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <p className="mt-2 font-headline text-[#cab170] text-sm">{p.kode}</p>
                  <p className="font-script text-white/50 text-sm truncate">{p.nama}</p>
                </Link>
                <FavoriteButton
                  active
                  onToggle={() => toggle(p.kode)}
                  className="absolute top-1 right-1 bg-black/50 backdrop-blur"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleShareAll}
              disabled={sharing}
              className="flex-1 py-4 font-editorial text-sm tracking-[0.2em] uppercase border border-[#cab170]/60 text-[#cab170] hover:bg-[#cab170] hover:text-black transition disabled:opacity-40"
            >
              {sharing ? "MEMBAGIKAN..." : `Share ${favoriteProducts.length} Produk`}
            </button>
            <button
              onClick={clear}
              className="py-4 px-6 font-editorial text-sm tracking-[0.2em] uppercase border border-white/20 text-white/40 hover:text-white/80 hover:border-white/40 transition"
            >
              Hapus Semua
            </button>
          </div>
        </>
      )}
    </main>
  );
}
