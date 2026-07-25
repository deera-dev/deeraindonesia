/**
 * FavoriteButton — toggle bintang favorit, dipakai di CatalogSlide (pojok
 * kanan-atas slide) & ProductDetailPage (dekat kode/nama produk).
 * preventDefault+stopPropagation supaya aman ditumpuk di atas elemen
 * klikable lain (mis. Link overlay penuh satu slide di CatalogSlide).
 */
export default function FavoriteButton({ active, onToggle, size = "md", className = "" }) {
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
      <span className={active ? "text-[#cab170]" : "text-white/50"}>
        {active ? "★" : "☆"}
      </span>
    </button>
  );
}
