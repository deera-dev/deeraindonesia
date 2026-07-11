/**
 * OverflowMenu.jsx — tombol kebab "⋮" generik + dropdown aksi (mis. Edit/Hapus).
 *
 * Dipisah dari aksi primer (mis. Bagikan) supaya aksi destruktif (Hapus)
 * tidak semudah aksi aman — butuh satu tap ekstra untuk membuka menu.
 *
 * items: [{ key, label, onClick, destructive? }]
 */
import { useState } from "react";

export default function OverflowMenu({ items, label = "Menu lainnya" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 flex items-center justify-center border border-skin-bdr text-skin-text3 hover:text-skin-text hover:border-[#CAB170] transition"
      >
        ⋮
      </button>

      {open && (
        <>
          {/* Backdrop transparan untuk menutup menu saat klik di luar — pola yang
              sama dipakai modal lain di app ini (absolute inset-0 + onClick). */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-skin-card border border-skin-bdr shadow-lg py-1"
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full text-left px-3 py-2 text-xs font-editorial tracking-[0.1em] uppercase transition ${
                  item.destructive
                    ? "text-red-400 hover:bg-red-500/10 hover:text-red-500"
                    : "text-skin-text2 hover:bg-skin-raised hover:text-[#CAB170]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
