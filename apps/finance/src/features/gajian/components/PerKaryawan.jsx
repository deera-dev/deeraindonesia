import { fmtRp } from "../../../shared/lib/format";
import { usePerKaryawanRincian } from "../hooks";

export default function PerKaryawan({ gajianId, kasbonDeds = [] }) {
  const { perKaryawan, loading } = usePerKaryawanRincian(gajianId, { includeQC: false });

  if (loading || perKaryawan.length === 0) return null;

  const dedByNama = {};
  for (const d of kasbonDeds) {
    const nama = d.nama || "—";
    dedByNama[nama] = (dedByNama[nama] ?? 0) + (Number(d.jumlah) || 0);
  }

  return (
    <div className="space-y-3">
      <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3">Rincian Per Karyawan</p>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3 items-start">
      {perKaryawan.map(([nama, data]) => {
        const potongan = dedByNama[nama] ?? 0;
        const transfer = Math.max(data.total - potongan, 0);
        return (
          <div key={nama} className="bg-skin-raised p-3 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="font-editorial text-sm font-semibold text-skin-text">{nama}</span>
              <span className="font-numeric text-sm font-bold text-skin-accent-text">{fmtRp(transfer)}</span>
            </div>
            {(data.nama_bank || data.no_rekening) && (
              <p className="font-editorial text-[11px] text-skin-text4 mt-0.5">
                {[data.nama_bank, data.no_rekening].filter(Boolean).join(" · ")}
              </p>
            )}
            {potongan > 0 && (
              <p className="font-editorial text-[11px] text-red-400 mt-0.5">
                <span className="font-numeric">{fmtRp(data.total)}</span> − Kasbon <span className="font-numeric">{fmtRp(potongan)}</span>
              </p>
            )}
            {data.rincian.length > 0 && (
              <div className="mt-2 pt-2 border-t border-skin-bdr-lt space-y-0.5">
                {data.rincian.map((r, i) => (
                  <div key={i} className="flex justify-between font-editorial text-[11px] text-skin-text3">
                    <span>{r.label}</span>
                    <span className="font-numeric">{fmtRp(r.sub)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
