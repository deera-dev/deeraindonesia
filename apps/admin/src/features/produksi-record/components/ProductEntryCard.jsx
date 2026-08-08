/**
 * ProductEntryCard.jsx — Kartu accordion satu entry produk di BatchForm
 * (mode tambah, atau "tambah produk ke batch ini" saat edit).
 */
import { buildKode, entryTotalKain, fmtRp, inputCls, labelCls } from "../utils";

export default function ProductEntryCard({
  entry,
  idx,
  canRemove,
  onToggleExpand,
  onRemove,
  onKodeAngkaChange,
  onKodeBahanChange,
  onNamaChange,
  onBahanChange,
  onToggleVariant,
  onSetQty,
  onUpahJahitChange,
}) {
  const entryKode = buildKode(entry.kodeAngka, entry.kodeBahan);
  const activeV = entry.variants.filter((v) => v.aktif);
  const effWarna = entry.warnaList.length > 0 ? entry.warnaList : ["_"];
  const totalK = entryTotalKain(entry);
  const isExpanded = entry.expanded;

  return (
    <div className="border border-skin-bdr bg-skin-raised">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-3 py-3 cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <div className="min-w-0 flex-1">
          {entryKode ? (
            <p className="text-sm font-semibold text-skin-text">{entryKode}</p>
          ) : (
            <p className="text-sm text-skin-text3">Produk {idx + 1}</p>
          )}
          {entry.nama && <p className="text-xs text-skin-text3 truncate">{entry.nama}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalK > 0 && <span className="text-xs text-[#CAB170] font-medium">{totalK} baju</span>}
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-red-400 hover:text-red-600 text-lg leading-none"
            >
              ×
            </button>
          )}
          <span className="text-skin-text3 text-xs">{isExpanded ? "▴" : "▾"}</span>
        </div>
      </div>

      {/* Card body (expanded) */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-skin-bdr-lt space-y-4 pt-3">
          {/* Kode */}
          <div>
            <label className={labelCls}>Kode Produk</label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-skin-text3 shrink-0">D -</span>
              <input
                type="text"
                placeholder="07"
                className={inputCls + " flex-1"}
                value={entry.kodeAngka}
                onChange={(e) => onKodeAngkaChange(e.target.value)}
              />
              <span className="text-sm text-skin-text3 shrink-0">-</span>
              <input
                type="text"
                placeholder="OSK"
                className={inputCls + " flex-1 uppercase"}
                value={entry.kodeBahan}
                onChange={(e) => onKodeBahanChange(e.target.value)}
              />
            </div>
            {entryKode && (
              <p className="text-xs text-skin-text3 mt-1">
                Kode: <span className="font-semibold text-[#CAB170]">{entryKode}</span>
                {entry.loadingTpl && <span className="ml-2">Mengecek HPP...</span>}
                {!entry.loadingTpl && entry.template && (
                  <span className="ml-2 text-emerald-600">
                    ✓ HPP ({fmtRp(entry.template.total_hpp)}/baju)
                  </span>
                )}
                {!entry.loadingTpl && entry.template === false && (
                  <span className="ml-2 text-amber-500">⚠ Belum ada Template HPP</span>
                )}
              </p>
            )}
            {!entry.loadingTpl && entry.template === false && (
              <p className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1.5 mt-1 leading-snug">
                Pemakaian bahan produk ini TIDAK akan tercatat di Stok Bahan sampai Template HPP
                dibuat (menu Produksi HPP). Batch tetap bisa disimpan — sinkronkan pemakaian
                bahannya nanti lewat tombol &ldquo;Sinkronkan&rdquo; di kartu batch.
              </p>
            )}
          </div>

          {/* Nama */}
          <div>
            <label className={labelCls}>Nama Produk</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Cth: Gamis Wolfis Polos"
              value={entry.nama}
              onChange={(e) => onNamaChange(e.target.value)}
            />
          </div>

          {/* Bahan */}
          <div>
            <label className={labelCls}>Bahan / Fabric</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Cth: Wolfis Premium"
              value={entry.bahan}
              onChange={(e) => onBahanChange(e.target.value)}
            />
          </div>

          {/* Upah Jahit — dibaca apps/finance utk auto-isi form Tim Jahit,
              SENGAJA terpisah dari "Upah Jahit" di Template HPP (§ komentar
              newEntry() di utils.js). */}
          <div>
            <label className={labelCls}>
              Upah Jahit{" "}
              <span className="normal-case text-skin-text3">
                (Rp/pcs — dipakai Finance, terpisah dari HPP)
              </span>
            </label>
            <input
              type="number"
              min="0"
              className={inputCls}
              placeholder="Cth: 25000"
              value={entry.upahJahit}
              onChange={(e) => onUpahJahitChange(e.target.value)}
            />
          </div>

          {/* Ukuran */}
          <div>
            <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt mb-2">
              Ukuran <span className="normal-case text-skin-text3">(harga jual diisi nanti)</span>
            </p>
            {entry.variants.map((v, vidx) => (
              <label key={v.size} className="flex items-center gap-3 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#CAB170]"
                  checked={v.aktif}
                  onChange={() => onToggleVariant(vidx)}
                />
                <span className="text-sm text-skin-text2">{v.size}</span>
                <span className="text-xs text-skin-text3">
                  LD {v.ld} · PB {v.pb}
                </span>
              </label>
            ))}
          </div>

          {/* Qty */}
          {activeV.length > 0 && (
            <div>
              <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt mb-2">
                Qty Produksi <span className="normal-case text-skin-text3">({totalK} total)</span>
              </p>
              <p className="text-xs text-skin-text3 italic mb-2">
                Qty rencana. Stok aktual diinput lewat Stok Opname.
              </p>
              {activeV.map((v) => (
                <div key={v.size} className="mb-3">
                  <p className="text-xs font-semibold text-skin-text2 mb-2">{v.size}</p>
                  <div className="space-y-2">
                    {effWarna.map((w) => (
                      <div key={w} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-sm text-skin-text3">
                          {w === "_" ? "— (tanpa warna)" : w}
                        </span>
                        <input
                          type="number"
                          min="0"
                          className={inputCls}
                          placeholder="0"
                          value={entry.qtyMap[v.size]?.[w] ?? ""}
                          onChange={(e) => onSetQty(v.size, w, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* HPP preview */}
          {entry.template && (
            <div className="bg-skin-card border border-skin-bdr p-3 space-y-2">
              <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">
                HPP & Bahan (dari template)
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-skin-text3">HPP per baju</span>
                <span className="font-bold text-[#CAB170]">{fmtRp(entry.template.total_hpp)}</span>
              </div>
              {entry.template.bahan_items?.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-skin-bdr-lt">
                  {entry.template.bahan_items.some((b) => !(Number(b.qty_per_baju) > 0)) && (
                    <p className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1">
                      ⚠ Ada bahan dengan qty/baju = 0. Simpan ulang Template HPP agar pemakaian bahan
                      tercatat.
                    </p>
                  )}
                  {entry.template.bahan_items.map((b, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span
                        className={`${!(Number(b.qty_per_baju) > 0) ? "text-amber-500" : "text-skin-text3"}`}
                      >
                        {b.nama_bahan}
                      </span>
                      <span className="text-skin-text2">
                        {totalK > 0
                          ? `${((Number(b.qty_per_baju) || 0) * totalK).toFixed(2)} ${b.satuan} total`
                          : `${b.qty_per_baju || 0} ${b.satuan}/baju`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
