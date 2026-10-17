import { useEffect, useRef, useState } from "react";

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
