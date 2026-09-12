/**
 * JahitColumn.jsx — satu kolom kanban ("Belum Assign" / "On Progress" /
 * "Ready Finishing"). Stack vertikal penuh di mobile, jadi kolom
 * berdampingan di md+ lewat flex-row di ProduksiJahitPage.jsx (BUKAN CSS
 * grid/table — lihat aturan CLAUDE.md §13 utk konten yang perlu responsif
 * di mobile).
 */
import JahitCard from "./JahitCard";

export default function JahitColumn({ label, cards, ...cardHandlers }) {
  return (
    <div className="flex-1 min-w-0 bg-skin-raised border border-skin-bdr-lt">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-skin-bdr-lt">
        <p className="font-editorial text-[11px] tracking-[0.15em] uppercase text-skin-text2">{label}</p>
        <span className="text-xs font-semibold text-skin-text3">{cards.length}</span>
      </div>
      <div className="p-2 space-y-2">
        {cards.length === 0 ? (
          <p className="text-xs text-skin-text3 text-center py-6">Belum ada kartu.</p>
        ) : (
          cards.map((card) => <JahitCard key={card.id} card={card} {...cardHandlers} />)
        )}
      </div>
    </div>
  );
}
