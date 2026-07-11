/**
 * BottomSheet.jsx — wrapper modal generik, mengikuti pola resmi di
 * CLAUDE.md §14 "Komponen Modal" (full-screen di mobile, bottom-sheet
 * yang mengisi penuh layar; max-h + border biasa di desktop).
 *
 * Dipakai untuk detail Template HPP (Screen 1) dan edit Harga Dasar
 * (Screen 2) — satu komponen, dua pemakai, supaya konsisten & tidak
 * duplikasi struktur modal.
 *
 * Parent bertanggung jawab me-render/unmount BottomSheet secara kondisional
 * (`{target && <BottomSheet ...>}`), sama seperti pola modal lain di app ini.
 */
export default function BottomSheet({
  title,
  onClose,
  headerExtra,
  footer,
  children,
  maxWidthClass = "max-w-lg",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={`relative bg-skin-card w-full ${maxWidthClass} h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 min-w-0 truncate">
            {title}
          </h2>
          <div className="flex items-center gap-1 shrink-0">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="text-skin-text3 hover:text-skin-text transition text-xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {footer && (
          <div className="flex-shrink-0 border-t border-skin-bdr p-4 space-y-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
