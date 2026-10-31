import OverflowMenu from "../../../shared/components/OverflowMenu";
import { WhatsApp } from "../../../shared/components/WhatsApp";
import { fmtRp } from "../utils";

export default function HPPCard({ tpl, produk, onEdit, onDelete, onShare, onOpenDetail }) {
  const gelaran = tpl.bahan_items?.[0]?.untuk_n_baju ?? 1;

  const menuItems = [
    { key: "edit", label: "Edit", onClick: () => onEdit(tpl) },
    { key: "hapus", label: "Hapus", onClick: () => onDelete(tpl), destructive: true },
  ];

  return (
    <div
      className="bg-skin-card border border-skin-bdr cursor-pointer hover:border-skin-accent/50 transition"
      onClick={() => onOpenDetail?.(tpl)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpenDetail?.(tpl);
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-skin-text">{tpl.kode_produk}</p>
              {gelaran > 1 && (
                <span className="text-[10px] px-1.5 py-0.5 border border-skin-accent/50 text-skin-accent-text leading-none">
                  {gelaran} gelaran
                </span>
              )}
            </div>
            <p className="text-xs text-skin-text3 truncate mt-0.5">{produk?.nama ?? "—"}</p>
          </div>
        </div>

        <p className="text-2xl font-bold text-skin-accent-text mt-2">{fmtRp(tpl.total_hpp)}</p>

        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(tpl)}
              className="flex-1 py-2 px-2 flex items-center justify-center gap-1.5 text-xs font-editorial tracking-[0.12em] uppercase border border-skin-bdr text-skin-text3 hover:border-skin-accent hover:text-skin-accent-text transition"
            >
              <WhatsApp className="w-3.5 h-3.5" />
              Bagikan
            </button>
          )}
          <OverflowMenu items={menuItems} label={`Menu ${tpl.kode_produk}`} />
        </div>
      </div>
    </div>
  );
}
