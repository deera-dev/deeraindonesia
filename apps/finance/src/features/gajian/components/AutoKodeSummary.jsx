export function AutoKodeSummary({ state, onEdit }) {
  const tambah = state.rows.reduce((a, r) => a + (Number(r.qtyDitambahkan) || 0), 0);
  return (
    <div className="border border-skin-bdr-lt">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-skin-raised">
        <p className="font-semibold text-sm text-skin-text min-w-0 truncate">
          <span className="text-emerald-600">✓</span> {state.kode} — {state.nama}
        </p>
        <button type="button" onClick={onEdit} className="text-[11px] font-editorial uppercase tracking-[0.12em] text-skin-accent-text shrink-0">
          Ubah
        </button>
      </div>
      <div className="px-3 py-2 space-y-0.5">
        {state.rows.map((r, i) => (
          <div key={i} className="flex justify-between gap-2 text-xs text-skin-text2">
            <span className="min-w-0 truncate">{r.size} · {r.warna === "_" ? "(tanpa warna)" : r.warna}</span>
            <span className="shrink-0">
              {r.qtyKartu} pcs → <b className="text-skin-accent-text">+{r.qtyDitambahkan}</b>
            </span>
          </div>
        ))}
        <p className="text-[11px] text-skin-text3 pt-1">
          Kartu {state.cardsSum} pcs = Finance {state.jumlahFinance} pcs · tambah Gudang {tambah} pcs
        </p>
      </div>
    </div>
  );
}
