import { useScrollVisibility } from "../hooks/useScrollVisibility";

const NAV_CLEAR_OFFSET_PX = 88;
const NO_NAV_OFFSET_PX = 24;

export default function BackToTop({
  threshold = 300,
  scrollEl = null,
  withBottomNav = true,
  offsetPx = null,
  showLabel = true,
  className = "",
}) {
  const visible = useScrollVisibility({ threshold, scrollEl });

  function scrollToTop() {
    const el = scrollEl?.current ?? null;
    if (el) {
      el.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const resolvedOffset = offsetPx ?? (withBottomNav ? NAV_CLEAR_OFFSET_PX : NO_NAV_OFFSET_PX);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{ bottom: `calc(${resolvedOffset}px + env(safe-area-inset-bottom))` }}
      className={`fixed z-40 flex items-center justify-center gap-1.5 h-12 min-w-[48px] px-3 bg-skin-card border-2 border-skin-bdr shadow-md text-skin-text3 transition-all duration-200 ease-out hover:text-skin-accent-text hover:border-skin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 active:scale-95 ${
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-2 scale-95 pointer-events-none"
      } ${className || "right-4"}`}
    >
      <span aria-hidden="true" className="text-base leading-none">
        ↑
      </span>
      {showLabel && (
        <span
          aria-hidden="true"
          className="hidden sm:inline font-editorial text-[11px] tracking-[0.15em] uppercase leading-none"
        >
          Atas
        </span>
      )}
    </button>
  );
}
