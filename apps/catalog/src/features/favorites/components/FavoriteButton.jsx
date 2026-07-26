import { useEffect, useRef, useState } from "react";

/**
 * FavoriteButton — toggle bintang favorit, dipakai di CatalogSlide (pojok
 * kanan-atas slide) & ProductDetailPage (dekat kode/nama produk).
 * preventDefault+stopPropagation supaya aman ditumpuk di atas elemen
 * klikable lain (mis. Link overlay penuh satu slide di CatalogSlide).
 *
 * Animasi "pop" singkat (scale+rotate) diputar setiap kali `active` berubah
 * jadi true — baik dari klik tombol ini sendiri maupun dari toggle di
 * tempat lain (mis. FavoritesPage), supaya selalu konsisten sinkron dengan
 * state sebenarnya, bukan cuma react ke klik lokal.
 */
export default function FavoriteButton({ active, onToggle, size = "md", className = "" }) {
  const [pop, setPop] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!active) return;
    setPop(true);
    const t = setTimeout(() => setPop(false), 400);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={active ? "Hapus dari favorit" : "Tambah ke favorit"}
      aria-pressed={active}
      className={
        "flex items-center justify-center transition active:scale-90 " +
        (size === "lg" ? "w-11 h-11 text-2xl" : "w-9 h-9 text-lg") +
        " " +
        className
      }
    >
      <span
        className={
          "inline-block " +
          (active ? "text-[#cab170]" : "text-white/50") +
          (pop ? " animate-favorite-pop" : "")
        }
      >
        {active ? "★" : "☆"}
      </span>
    </button>
  );
}
