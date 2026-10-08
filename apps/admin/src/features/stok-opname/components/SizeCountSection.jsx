/**
 * SizeCountSection.jsx — hitung satu ukuran produk di SATU lokasi.
 *
 * Dua cara, di layar yang sama (tidak ada "mode" yang harus dipilih):
 *  - isi angka tiap warna langsung, atau
 *  - isi "Total dihitung" dulu, warna menyusul — sisa yang belum dibagi ke
 *    warna ditandai ⚠ "belum masukin warna".
 * Kolom kosong = belum dihitung (stok sekarang dipertahankan).
 */
import { SIZE_COLORS, computeSizeCount, parseCount, NO_WARNA, bukuKey, bukuSummary } from "../utils";

const inputCls =
  "w-20 text-center py-2.5 px-1 text-base border focus:outline-none focus:border-[#CAB170] transition bg-skin-card text-skin-text placeholder:text-skin-text3";

export default function SizeCountSection({
  kode,
  size,
  sizeRows,
  loc,
  entries,
  totalRaw,
  dikerjakan = 0,
  buku = {},
  onEntry,
  onTotal,
}) {
  const c = computeSizeCount({ kode, size, sizeRows, loc, entries, totalRaw });

  function plusOneAll() {
    for (const it of c.items) onEntry(it.row.id, String(it.next + 1));
  }

  return (
    <section className="px-4 py-3" data-testid={`size-${size}`}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <h3 className={`text-sm font-black uppercase ${SIZE_COLORS[size] ?? "text-skin-text"}`}>{size}</h3>
        <span className="text-xs text-skin-text3">stok sekarang {c.systemTotal} pcs</span>
        {dikerjakan > 0 && (
          <span className="text-xs text-skin-text3" title="Sudah dikerjakan Tim Jahit (info pembanding)">
            ✂ {dikerjakan} dikerjakan
          </span>
        )}
      </div>

      {bukuSummary(buku, sizeRows) && (
        <p data-testid={`buku-${size}`} className="text-xs text-skin-text2 mb-2">
          📒 Buku potongan: dipotong {bukuSummary(buku, sizeRows).expected}, terjual{" "}
          {bukuSummary(buku, sizeRows).sold} → seharusnya masih ada{" "}
          <b>{bukuSummary(buku, sizeRows).seharusnya} pcs</b> (semua lokasi)
        </p>
      )}

      {c.hasColors && (
        <div className="flex items-center justify-between gap-3 mb-2 px-3 py-2 bg-skin-gold border border-skin-bdr-gold">
          <label className="text-sm font-medium text-skin-text" htmlFor={`total-${size}`}>
            Total dihitung <span className="text-xs text-skin-text3">(boleh dulu, warna menyusul)</span>
          </label>
          <input
            id={`total-${size}`}
            data-count-input
            type="number"
            inputMode="numeric"
            enterKeyHint="next"
            min="0"
            aria-label={`Total dihitung ${size}`}
            value={totalRaw}
            placeholder={String(c.systemTotal)}
            onChange={(e) => onTotal(size, e.target.value)}
            className={`${inputCls} border-skin-bdr`}
          />
        </div>
      )}

      <div className="divide-y divide-skin-bdr-lt">
        {c.items.map(({ row, old, entered }) => {
          const warnaLabel = row.warna && row.warna !== NO_WARNA ? row.warna : "Stok";
          const val = parseCount(entries[row.id]);
          const diff = val === null ? 0 : val - old;
          return (
            <div key={row.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-skin-text truncate">{warnaLabel}</p>
                <p className="text-xs text-skin-text3">
                  stok sekarang {old}
                  {buku[bukuKey(row.kode, row.size, row.warna)] && (
                    <span title="Menurut buku potongan: dipotong − terjual, semua lokasi">
                      {" "}
                      · seharusnya {buku[bukuKey(row.kode, row.size, row.warna)].seharusnya}
                    </span>
                  )}
                  {entered && diff !== 0 && (
                    <span className={diff < 0 ? " text-red-500 font-bold" : " text-emerald-600 font-bold"}>
                      {" "}
                      ({diff > 0 ? "+" : ""}
                      {diff})
                    </span>
                  )}
                </p>
              </div>
              <input
                data-count-input
                type="number"
                inputMode="numeric"
                enterKeyHint="next"
                min="0"
                aria-label={`${warnaLabel}, ukuran ${size}`}
                value={entries[row.id] ?? ""}
                placeholder="—"
                onChange={(e) => onEntry(row.id, e.target.value)}
                className={`${inputCls} ${entered ? "border-[#CAB170]" : "border-skin-bdr"}`}
              />
            </div>
          );
        })}
      </div>

      {c.hasColors && (
        <div
          data-testid={`pending-${size}`}
          className={`flex items-center justify-between mt-2 px-3 py-2 text-sm ${
            c.pending.next > 0
              ? "bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400"
              : "text-skin-text3"
          }`}
        >
          <span>{c.pending.next > 0 ? "⚠ Belum masukin warna" : "✓ Semua sudah berwarna"}</span>
          <span className="font-bold tabular-nums">{c.pending.next} pcs</span>
        </div>
      )}
      {c.over && (
        <p className="text-xs text-red-500 mt-1">
          Jumlah warna ({c.colorSum}) lebih besar dari total — naikkan total atau kurangi warna.
        </p>
      )}

      {c.items.length > 1 && (
        <button
          type="button"
          onClick={plusOneAll}
          className="mt-2 text-xs px-3 py-1.5 border border-[#CAB170] text-[#A8925A] hover:bg-[#CAB170] hover:text-white transition font-bold uppercase tracking-wide"
        >
          + Seri lengkap (tambah 1 tiap warna)
        </button>
      )}
    </section>
  );
}
