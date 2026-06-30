/**
 * ProductBukuCard.jsx — Kartu akordion satu produk di Buku Potongan.
 *
 * Props:
 *   product       — object produk {kode, nama}
 *   rows          — array {kode, size, warna}
 *   isOpen        — boolean
 *   onToggle      — (kode) => void
 *   changed       — { [rowKey]: qty } map perubahan belum disimpan
 *   expectedMap   — { [rowKey]: qty } dari DB
 *   actualMap     — { [rowKey]: qty } stok aktual
 *   onChangeExpected — (kode, size, warna, val) => void
 */
import { rowKey, selisihCls, selisihLabel } from "../utils";

export default function ProductBukuCard({
  product,
  rows,
  isOpen,
  onToggle,
  changed,
  expectedMap,
  actualMap,
  onChangeExpected,
}) {
  function getExpected(kode, size, warna) {
    const k = rowKey(kode, size, warna);
    return changed[k] ?? expectedMap[k] ?? 0;
  }

  function getActual(kode, size, warna) {
    return actualMap[rowKey(kode, size, warna)] ?? 0;
  }

  // Hitung ringkasan produk
  let totalExpected = 0,
    totalActual = 0;
  for (const r of rows) {
    totalExpected += getExpected(r.kode, r.size, r.warna);
    totalActual += getActual(r.kode, r.size, r.warna);
  }
  const totalSelisih = totalActual - totalExpected;
  const hasChanged = rows.some((r) => changed[rowKey(r.kode, r.size, r.warna)] !== undefined);

  return (
    <div className="bg-skin-card border border-skin-bdr overflow-hidden">
      {/* ── Header ── */}
      <button
        onClick={() => onToggle(product.kode)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-skin-page transition"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-skin-text">{product.kode}</span>
            {hasChanged && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold tracking-wide uppercase">
                diubah
              </span>
            )}
            {totalSelisih !== 0 && !hasChanged && (
              <span
                className={`text-[10px] px-1.5 py-0.5 border font-bold tracking-wide uppercase ${
                  totalSelisih > 0
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-red-500/10 text-red-600 border-red-500/30"
                }`}
              >
                {selisihLabel(totalSelisih)}
              </span>
            )}
          </div>
          <p className="text-xs text-skin-text3 truncate mt-0.5">{product.nama}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-skin-text3">
          <span>
            E:{totalExpected} · S:{totalActual}
          </span>
          <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* ── Expanded ── */}
      {isOpen && (
        <div className="border-t border-skin-bdr divide-y divide-skin-bdr-lt">
          {rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-skin-text4 italic">
              Tidak ada data stok untuk produk ini.
            </p>
          ) : (
            <>
              {rows.map((row) => {
                const exp = getExpected(row.kode, row.size, row.warna);
                const act = getActual(row.kode, row.size, row.warna);
                const selisih = act - exp;
                const isRowChanged = changed[rowKey(row.kode, row.size, row.warna)] !== undefined;

                return (
                  <div
                    key={rowKey(row.kode, row.size, row.warna)}
                    className={`px-4 py-3 ${isRowChanged ? "bg-amber-500/10" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-skin-text uppercase">
                          {row.size}
                        </span>
                        {row.warna && row.warna !== "_" && (
                          <span className="text-xs text-skin-text3">{row.warna}</span>
                        )}
                        {isRowChanged && (
                          <span className="text-[10px] px-1 py-0.5 bg-amber-500/15 text-amber-600 border border-amber-500/40 font-bold uppercase tracking-wide">
                            diubah
                          </span>
                        )}
                      </div>
                      <span className={`text-sm ${selisihCls(selisih)}`}>
                        {exp === 0 && act === 0 ? "—" : selisihLabel(selisih)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-skin-text3 uppercase tracking-wide block mb-1">
                          Expected (Buku)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={exp || ""}
                          placeholder="0"
                          onChange={(e) =>
                            onChangeExpected(row.kode, row.size, row.warna, e.target.value)
                          }
                          className={`w-full text-right py-1.5 px-2 text-sm border focus:outline-none focus:border-[#CAB170] transition bg-skin-card text-skin-text ${
                            isRowChanged ? "border-amber-500" : "border-skin-bdr"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-skin-text3 uppercase tracking-wide block mb-1">
                          Stok Saat Ini
                        </label>
                        <div
                          className={`py-1.5 px-2 text-sm text-right font-semibold bg-skin-page border border-skin-bdr-lt ${act === 0 ? "text-skin-text4" : "text-skin-text"}`}
                        >
                          {act}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Total footer */}
              <div className="px-4 py-2.5 bg-skin-page flex items-center justify-between">
                <span className="text-xs font-bold text-skin-text uppercase tracking-wide">
                  Total Produk
                </span>
                <div className="flex items-center gap-4 text-xs text-skin-text3">
                  <span>
                    E: <span className="font-bold text-skin-text2">{totalExpected}</span>
                  </span>
                  <span>
                    S: <span className="font-bold text-skin-text">{totalActual}</span>
                  </span>
                  <span className={`text-sm ${selisihCls(totalSelisih)}`}>
                    {totalExpected === 0 && totalActual === 0 ? "—" : selisihLabel(totalSelisih)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
