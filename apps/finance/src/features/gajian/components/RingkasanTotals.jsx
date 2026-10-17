import { fmtRp } from "../../../shared/lib/format";

const TIM_LABELS = [
  ["potong", "Tim Potong"],
  ["jahit", "Tim Jahit"],
  ["finishing", "Tim Finishing"],
  ["qa", "Tim QC"],
  ["kreatif", "Tim Kreatif"],
  ["cmt", "CMT Luar"],
];

export default function RingkasanTotals({ gajian, v }) {
  const { isFinal, totals, loadingTotals, totalGaji, pettycash, fullTambahan, sKasbonDed, totalRequest } = v;
  const pettyNominal = isFinal ? (gajian.pettycash ?? 0) : Number(pettycash) || 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      <div className="bg-skin-raised p-3 rounded-xl">
        <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3 mb-2">Total Per Tim</p>
        {loadingTotals ? (
          <p className="text-sm text-skin-text3 py-2">Memuat...</p>
        ) : (
          <>
            {TIM_LABELS.map(([key, label]) => {
              const val = isFinal ? gajian[`total_${key}`] : totals?.[key];
              if (!val) return null;
              return (
                <div key={key} className="flex justify-between text-sm py-0.5">
                  <span className="text-skin-text3">{label}</span>
                  <span className="font-numeric text-skin-text">{fmtRp(val)}</span>
                </div>
              );
            })}
            <div className="flex justify-between text-sm font-semibold pt-2 mt-1 border-t border-skin-bdr-lt">
              <span className="text-skin-text">Total Gaji</span>
              <span className="font-numeric text-skin-accent-text">{fmtRp(totalGaji)}</span>
            </div>
          </>
        )}
      </div>

      <div className="bg-skin-gold border border-skin-accent p-3 space-y-1 rounded-xl">
        {pettyNominal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-skin-text3">+ Uang Denny &amp; Wulan Terpakai</span>
            <span className="font-numeric text-skin-text">{fmtRp(pettyNominal)}</span>
          </div>
        )}
        {(isFinal ? gajian.tambahan ?? [] : fullTambahan).filter((t) => Number(t.jumlah) > 0).map((t, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-skin-text3">+ {t.label || "Tambahan"}</span>
            <span className="font-numeric text-skin-text">{fmtRp(t.jumlah)}</span>
          </div>
        ))}
        {!isFinal && sKasbonDed > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-red-400">− Potongan Kasbon</span>
            <span className="font-numeric text-red-400">−{fmtRp(sKasbonDed)}</span>
          </div>
        )}
        {isFinal && (gajian.kasbon_deductions ?? []).filter((k) => Number(k.jumlah) > 0).map((k, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-red-400">− Kasbon {k.nama}</span>
            <span className="font-numeric text-red-400">−{fmtRp(k.jumlah)}</span>
          </div>
        ))}
        <div className="flex justify-between text-base font-bold pt-1.5 mt-1 border-t border-skin-accent/40">
          <span className="text-skin-accent-text">Total Mingguan</span>
          <span className="font-numeric text-skin-accent-text">{fmtRp(totalRequest)}</span>
        </div>
      </div>
    </div>
  );
}
