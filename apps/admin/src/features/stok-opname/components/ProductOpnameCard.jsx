/**
 * ProductOpnameCard.jsx — Kartu akordion satu produk di Stok Opname.
 *
 * Props:
 *   product     — {kode, nama}
 *   rows         — baris stok_warna milik produk ini (sudah sorted)
 *   isOpen       — boolean accordion
 *   onToggle     — (kode) => void
 *   changed       — draft perubahan { [rowId]: {gudang?, cideng?, tegalgubug?} }
 *   getValue       — (row, loc) => number — nilai efektif (draft atau DB)
 *   onChangeRow     — (row, loc, val) => void
 */
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { LOCS, SIZE_COLORS } from "../utils";

export default function ProductOpnameCard({
  product,
  rows,
  isOpen,
  onToggle,
  changed,
  getValue,
  onChangeRow,
}) {
  const hasChanges = rows.some((r) => changed[r.id]);

  const totalGudang = rows.reduce((s, r) => s + getValue(r, "gudang"), 0);
  const totalCideng = rows.reduce((s, r) => s + getValue(r, "cideng"), 0);
  const totalTegal = rows.reduce((s, r) => s + getValue(r, "tegalgubug"), 0);
  const totalStok = totalGudang + totalCideng + totalTegal;

  const bySize = {};
  for (const r of rows) {
    if (!bySize[r.size]) bySize[r.size] = 0;
    bySize[r.size] += getValue(r, "gudang") + getValue(r, "cideng") + getValue(r, "tegalgubug");
  }
  const sizes = SIZE_PRESETS.map((p) => p.size).filter((s) => bySize[s] !== undefined);

  return (
    <div className="bg-skin-card border border-skin-bdr overflow-hidden">
      {/* ── Product header ── */}
      <button
        onClick={() => onToggle(product.kode)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-skin-page transition"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-skin-text">{product.kode}</span>
            {hasChanges && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold tracking-wide uppercase">
                diubah
              </span>
            )}
          </div>
          <p className="text-xs text-skin-text3 truncate mt-0.5">{product.nama}</p>
          {/* Size totals */}
          {rows.length > 0 && (
            <div className="flex gap-2 mt-1 flex-wrap">
              {sizes.map((size) => {
                const cls = SIZE_COLORS[size] ?? "text-skin-text3";
                return (
                  <span key={size} className={`text-xs font-black leading-none ${cls}`}>
                    {size} {bySize[size]}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <span
              className={`text-sm font-bold block ${totalStok === 0 ? "text-skin-text4" : "text-skin-text"}`}
            >
              {totalStok} pcs
            </span>
            <span className="flex items-center gap-2 justify-end mt-0.5">
              {[
                ["G", totalGudang, "text-sky-500 dark:text-sky-400"],
                ["C", totalCideng, "text-violet-500 dark:text-violet-400"],
                ["T", totalTegal, "text-rose-500 dark:text-rose-400"],
              ].map(([lbl, val, cls]) => (
                <span key={lbl} className={`text-xs font-black leading-none ${cls}`}>
                  {lbl}
                  {val}
                </span>
              ))}
            </span>
          </div>
          <span className="text-skin-text3 text-xs">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* ── Expanded: stok per varian ── */}
      {isOpen && (
        <div className="border-t border-skin-bdr divide-y divide-skin-bdr-lt">
          {rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-skin-text4 italic">
              Belum ada data stok untuk produk ini.
            </p>
          ) : (
            rows.map((row) => {
              const isRowChanged = !!changed[row.id];
              const g = getValue(row, "gudang");
              const c = getValue(row, "cideng");
              const t = getValue(row, "tegalgubug");
              const total = g + c + t;
              return (
                <div key={row.id} className={`px-4 py-3 ${isRowChanged ? "bg-amber-500/10" : ""}`}>
                  {/* Varian header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-skin-text uppercase">{row.size}</span>
                      {row.warna && row.warna !== "_" && (
                        <span className="text-xs text-skin-text3">{row.warna}</span>
                      )}
                      {isRowChanged && (
                        <span className="text-[10px] px-1 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold uppercase tracking-wide">
                          diubah
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-sm font-bold ${total === 0 ? "text-skin-text4" : "text-skin-text"}`}
                    >
                      {total} pcs
                    </span>
                  </div>
                  {/* Inputs per lokasi — 3 kolom */}
                  <div className="grid grid-cols-3 gap-2">
                    {LOCS.map((loc) => (
                      <div key={loc.key}>
                        <label className="text-[10px] text-skin-text3 uppercase tracking-wide block mb-1">
                          {loc.label}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={
                            changed[row.id]?.[loc.key] !== undefined ? changed[row.id][loc.key] : ""
                          }
                          placeholder={String(row[loc.key] ?? 0)}
                          onChange={(e) => onChangeRow(row, loc.key, e.target.value)}
                          className={`w-full text-right py-1.5 px-2 text-sm border focus:outline-none focus:border-[#CAB170] transition bg-skin-card text-skin-text placeholder:text-skin-text3 ${
                            isRowChanged ? "border-amber-500" : "border-skin-bdr"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
