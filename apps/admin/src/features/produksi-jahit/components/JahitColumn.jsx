import { useMemo } from "react";
import JahitCard from "./JahitCard";
import { groupCardsByKode } from "../utils";

export default function JahitColumn({ label, cards, active = true, ...cardHandlers }) {
  const groups = useMemo(() => groupCardsByKode(cards), [cards]);

  return (
    <div className={`${active ? "block" : "hidden"} md:block flex-1 min-w-0 bg-skin-raised border border-skin-bdr-lt`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-skin-bdr-lt">
        <p className="font-editorial text-[11px] tracking-[0.15em] uppercase text-skin-text2">{label}</p>
        <span className="text-xs font-semibold text-skin-text3">{cards.length}</span>
      </div>
      <div className="p-2 space-y-3">
        {cards.length === 0 ? (
          <p className="text-xs text-skin-text3 text-center py-6">Belum ada kartu.</p>
        ) : (
          groups.map((group) => (
            <div key={group.kode}>
              <div className="flex items-start justify-between gap-2 px-0.5 pb-1.5">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-skin-text truncate">{group.kode}</p>
                  <p className="text-xs text-skin-text3 truncate">{group.nama}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold text-skin-accent-text">{group.totalQty} pcs</p>
              </div>
              <div className="space-y-2">
                {group.cards.map((card) => (
                  <JahitCard key={card.id} card={card} showKode={false} {...cardHandlers} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
