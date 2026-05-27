import { useEffect, useRef, useState } from "react";

/**
 * BackToTop — tombol floating yang muncul setelah scroll > threshold px.
 * Klik untuk scroll halus kembali ke atas.
 *
 * Props:
 *   threshold  — berapa px scroll sebelum tombol muncul (default 300)
 *   scrollEl   — React ref ke elemen yang di-scroll. Jika tidak diisi,
 *                memakai window (untuk halaman dengan scroll normal).
 */
export default function BackToTop({
  threshold = 300,
  scrollEl = null,
  className = "",
  bottomClass = "bottom-6",
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollEl?.current ?? null;

    function onScroll() {
      const scrollTop = el ? el.scrollTop : window.scrollY;
      setVisible(scrollTop > threshold);
    }

    const target = el ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // cek saat mount
    return () => target.removeEventListener("scroll", onScroll);
  }, [threshold, scrollEl]);

  if (!visible) return null;

  function scrollToTop() {
    const el = scrollEl?.current ?? null;
    if (el) {
      el.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <button
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      className={`fixed ${bottomClass} z-40 w-10 h-10 flex items-center justify-center bg-skin-card border-2 border-skin-bdr shadow-md text-skin-text3 hover:text-[#CAB170] hover:border-[#CAB170] active:scale-95 transition ${className || "right-4"}`}
    >
      ↑
    </button>
  );
}
