/**
 * StokPanel.jsx — Tab "Stok Bahan": ringkasan masuk/keluar/sisa dari view v_stok_bahan.
 */
import { useStokBahan } from "../hooks";

export default function StokPanel() {
  const { data, loading } = useStokBahan();

  if (loading) return <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>;
  if (!data.length)
    return <p className="text-sm text-skin-text3 text-center py-8">Belum ada data bahan.</p>;

  return (
    <div className="space-y-2">
      {data.map((row, i) => (
        <div key={i} className="bg-skin-card border border-skin-bdr p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-sm text-skin-text">{row.nama_bahan}</p>
              <p className="text-xs text-skin-text3">{row.satuan}</p>
            </div>
            <span
              className={`text-lg font-bold ${
                Number(row.stok_sisa) < 0
                  ? "text-red-500"
                  : Number(row.stok_sisa) === 0
                    ? "text-amber-500"
                    : "text-emerald-500"
              }`}
            >
              {Number(row.stok_sisa).toFixed(2)}
            </span>
          </div>
          <div className="flex gap-4 text-xs text-skin-text3">
            <span>
              Masuk:{" "}
              <span className="text-skin-text font-medium">
                {Number(row.total_masuk).toFixed(2)}
              </span>
            </span>
            <span>
              Keluar:{" "}
              <span className="text-skin-text font-medium">
                {Number(row.total_keluar).toFixed(2)}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
