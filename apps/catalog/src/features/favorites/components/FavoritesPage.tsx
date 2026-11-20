import { useProducts } from "@deera/shared/features/products/hooks";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
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
    <main className="min-h-screen bg-aurum-bg text-aurum-text px-6 py-10 sm:px-10 md:px-16">
      <div className="flex items-center justify-between mb-8">
        <Link
          to="/catalog"
          className="font-body text-sm tracking-[0.3em] text-aurum-text/30 uppercase hover:text-aurum-text/60 transition py-2"
        >
          ← Katalog
        </Link>
        <p className="font-body text-xs tracking-[0.2em] text-aurum-text/40 uppercase">
          {count} favorit
        </p>
      </div>

      <p className="font-display text-aurum-accent text-4xl mb-8">Favorit Saya</p>

      {loading && (
        <p className="font-body text-aurum-text/30 text-xs tracking-[0.2em]">MEMUAT...</p>
      )}

      {!loading && favoriteProducts.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-body text-aurum-text/30 text-xs tracking-[0.25em] mb-6">
            BELUM ADA PRODUK FAVORIT
          </p>
          <Link
            to="/catalog"
            className="inline-block px-6 py-3 font-body text-xs tracking-[0.3em] uppercase border border-aurum-border/25 text-aurum-text/70 hover:border-aurum-border hover:text-aurum-text transition"
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
                <Link to="/code/$kode" params={{ kode: p.kode }} className="block">
                  <img
                    src={cldUrl(p.image, { width: 400 })}
                    alt={p.nama}
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <p className="mt-2 font-display text-aurum-accent text-sm">{p.kode}</p>
                  <p className="font-display text-aurum-text/50 text-sm truncate">{p.nama}</p>
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
              className="flex-1 py-4 font-body text-sm tracking-[0.2em] uppercase border border-aurum-accent/60 text-aurum-accent hover:bg-aurum-accent hover:text-aurum-on-accent transition disabled:opacity-40"
            >
              {sharing ? "MEMBAGIKAN..." : `Share ${favoriteProducts.length} Produk`}
            </button>
            <button
              onClick={clear}
              className="py-4 px-6 font-body text-sm tracking-[0.2em] uppercase border border-aurum-border/20 text-aurum-text/40 hover:text-aurum-text/80 hover:border-aurum-border/40 transition"
            >
              Hapus Semua
            </button>
          </div>
        </>
      )}
    </main>
  );
}
