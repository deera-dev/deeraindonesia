import { useState } from "react";
import BottomSheet from "../../../../shared/components/BottomSheet";

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 flex-shrink-0 text-skin-accent-text" aria-hidden="true">
      <path d="M4 10.5L8 14.5L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionRow({ item, active, onClick, pinned }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`w-full text-left flex items-start gap-3 px-3.5 py-3 border transition ${
        active
          ? "border-skin-accent bg-skin-accent/10"
          : "border-skin-bdr-lt hover:border-skin-bdr bg-skin-card"
      } ${pinned ? "mb-4" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm sm:text-base font-semibold break-words ${active ? "text-skin-accent-text" : "text-skin-text"}`}>
          {item.label}
        </p>
        {item.description && (
          <p className="text-xs text-skin-text3 leading-snug break-words mt-0.5">{item.description}</p>
        )}
      </div>
      {active && <CheckIcon />}
    </button>
  );
}

export default function SectionPicker({ groups, activeKey, onSelect }) {
  const [open, setOpen] = useState(false);

  const pinnedGroup = groups.find((g) => g.groupLabel == null);
  const labeledGroups = groups.filter((g) => g.groupLabel != null);
  const allItems = groups.flatMap((g) => g.items);
  const activeItem = allItems.find((i) => i.key === activeKey);

  function pick(key) {
    onSelect(key);
    setOpen(false);
  }

  return (
    <div className="px-4 py-2.5 md:px-8 border-t border-skin-bdr-lt">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden w-full flex items-center justify-between gap-3 px-3.5 py-2.5 border border-skin-bdr bg-skin-card hover:border-skin-accent transition"
      >
        <div className="min-w-0 text-left">
          <p className="text-[10px] tracking-[0.15em] uppercase text-skin-text3">Halaman Saat Ini</p>
          <p className="text-sm sm:text-base font-semibold text-skin-text break-words">
            {activeItem?.label ?? "Pilih Halaman"}
          </p>
        </div>
        <span className="flex items-center gap-1 flex-shrink-0 text-skin-text3">
          <span className="text-[11px] tracking-[0.1em] uppercase hidden sm:inline">Ganti Halaman</span>
          <ChevronIcon />
        </span>
      </button>

      <div className="hidden md:flex md:flex-wrap md:gap-2">
        {pinnedGroup?.items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => pick(item.key)}
            aria-current={item.key === activeKey ? "page" : undefined}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.06em] border transition ${
              item.key === activeKey
                ? "bg-skin-accent text-skin-on-accent border-skin-accent"
                : "border-skin-bdr text-skin-text3 hover:border-skin-accent hover:text-skin-text2"
            }`}
          >
            {item.label}
          </button>
        ))}
        {pinnedGroup && labeledGroups.length > 0 && (
          <span className="w-px bg-skin-bdr-lt mx-1" aria-hidden="true" />
        )}
        {labeledGroups.map((g, gi) => (
          <div key={g.groupLabel} className="flex flex-wrap gap-2">
            {g.items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => pick(item.key)}
                aria-current={item.key === activeKey ? "page" : undefined}
                className={`px-3.5 py-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.06em] border transition ${
                  item.key === activeKey
                    ? "bg-skin-accent text-skin-on-accent border-skin-accent"
                    : "border-skin-bdr text-skin-text3 hover:border-skin-accent hover:text-skin-text2"
                }`}
              >
                {item.label}
              </button>
            ))}
            {gi < labeledGroups.length - 1 && (
              <span className="w-px bg-skin-bdr-lt mx-1" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      {open && (
        <BottomSheet title="Pilih Halaman" onClose={() => setOpen(false)}>
          {pinnedGroup && (
            <div>
              {pinnedGroup.items.map((item) => (
                <SectionRow key={item.key} item={item} active={item.key === activeKey} onClick={() => pick(item.key)} pinned />
              ))}
            </div>
          )}
          <div className="space-y-5">
            {labeledGroups.map((g) => (
              <div key={g.groupLabel}>
                <h3 className="text-[11px] font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-2">
                  {g.groupLabel}
                </h3>
                <div className="space-y-2">
                  {g.items.map((item) => (
                    <SectionRow key={item.key} item={item} active={item.key === activeKey} onClick={() => pick(item.key)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pb-6" style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }} aria-hidden="true" />
        </BottomSheet>
      )}
    </div>
  );
}
