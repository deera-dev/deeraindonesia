import { useEffect, useRef, useState } from "react";

/**
 * useScrollVisibility — hook reusable lintas-app untuk melacak "apakah
 * user sudah scroll melewati threshold tertentu". SATU implementasi
 * listener scroll untuk SELURUH aplikasi (dipakai `BackToTop.jsx`, bisa
 * dipakai ulang untuk kebutuhan lain di masa depan, mis. sticky header
 * show/hide) — bukan setiap komponen membuat listener scroll sendiri.
 *
 * ── Performance ──────────────────────────────────────────────────────
 * - `{ passive: true }` — listener TIDAK memblokir scrolling browser.
 * - Throttle via `requestAnimationFrame` — pengukuran scrollTop hanya
 *   dilakukan sekali per frame render (maks ~60x/detik), bukan pada
 *   SETIAP event scroll mentah (yang bisa terpicu ratusan kali/detik di
 *   perangkat tertentu). `tickingRef` mencegah rAF ganda menumpuk.
 * - `setVisible` hanya dipanggil dengan nilai boolean — React otomatis
 *   melewati re-render kalau nilainya sama dengan sebelumnya (bailout).
 *
 * Mendukung 2 mode (sama seperti versi lama `BackToTop`):
 *   - `scrollEl` tidak diisi → melacak `window.scrollY` (halaman dengan
 *     scroll normal, mayoritas kasus).
 *   - `scrollEl` diisi (React ref) → melacak `el.scrollTop` (halaman
 *     dengan scroll di dalam elemen tertentu, bukan window).
 */
export function useScrollVisibility({ threshold = 300, scrollEl = null } = {}) {
  const [visible, setVisible] = useState(false);
  const tickingRef = useRef(false);

  useEffect(() => {
    const el = scrollEl?.current ?? null;
    const target = el ?? window;

    function measure() {
      const scrollTop = el ? el.scrollTop : window.scrollY;
      setVisible(scrollTop > threshold);
      tickingRef.current = false;
    }

    function onScroll() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(measure);
    }

    target.addEventListener("scroll", onScroll, { passive: true });
    measure(); // cek posisi awal saat mount, tanpa menunggu event scroll pertama
    return () => target.removeEventListener("scroll", onScroll);
  }, [threshold, scrollEl]);

  return visible;
}

export default useScrollVisibility;
