import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@deera/shared/features/toast/hooks";
import FinanceLayout from "../../../shared/components/FinanceLayout";
import { fmtRp, fmtTanggalPendek } from "../../../shared/lib/format";
import { useDeleteGajianPeriode, useGajianList } from "../hooks";
import BuatPeriodeModal from "../components/BuatPeriodeModal";

const TIM_BREAKDOWN = [
  ["total_potong", "Potong"],
  ["total_jahit", "Jahit"],
  ["total_finishing", "Finishing"],
  ["total_kreatif", "Kreatif"],
  ["total_cmt", "CMT"],
];

/** GajianListPage.jsx — Daftar periode gajian_minggu. */
export default function GajianListPage() {
  const navigate = useNavigate();
  const { gajianList, loading } = useGajianList();
  const deleteGajianPeriode = useDeleteGajianPeriode();
  const [showBuat, setShowBuat] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function handleDelete(g, e) {
    e.stopPropagation();
    const isFinal = g.status === "final";
    const msg = `Hapus periode "Sabtu ${fmtTanggalPendek(g.tanggal_sabtu)}"${isFinal ? " (status: Final)" : ""}?\nSemua data gaji dalam periode ini akan ikut terhapus.`;
    if (!confirm(msg)) return;
    setDeleting(g.id);
    try {
      await deleteGajianPeriode(g.id);
      toast.success("Periode dihapus.");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setDeleting(null);
    }
  }

  const headerAction = (
    <button
      onClick={() => setShowBuat(true)}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Periode Baru
    </button>
  );

  return (
    <FinanceLayout title="Gajian" headerAction={headerAction}>
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : gajianList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-skin-text3 mb-4">Belum ada periode gajian.</p>
          <button
            onClick={() => setShowBuat(true)}
            className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
          >
            Buat Periode Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-3 md:space-y-0 md:items-start">
          {gajianList.map((g) => (
            <div
              key={g.id}
              onClick={() => navigate(`/gajian/${g.id}`)}
              className="bg-skin-raised p-3 cursor-pointer hover:border-[#CAB170] border border-transparent transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-editorial text-sm font-semibold text-skin-text">
                  Sabtu {fmtTanggalPendek(g.tanggal_sabtu)}
                </span>
                <span
                  className={`text-[10px] font-editorial tracking-[0.12em] uppercase px-2 py-0.5 border rounded-full ${
                    g.status === "final" ? "border-emerald-500 text-emerald-500" : "border-amber-500 text-amber-500"
                  }`}
                >
                  {g.status}
                </span>
              </div>
              <p className="font-numeric text-sm text-[#CAB170] font-semibold mt-1">
                {g.total_gaji ? fmtRp(g.total_gaji) : "—"}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {TIM_BREAKDOWN.map(([key, label]) => {
                  const val = g[key];
                  if (!val) return null;
                  return (
                    <span key={key} className="font-editorial text-[11px] text-skin-text4">
                      {label}: <span className="font-numeric">{fmtRp(val)}</span>
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-skin-bdr-lt">
                <span className="font-editorial text-xs text-skin-text3">
                  Request: <span className="font-numeric">{fmtRp(g.total_request ?? 0)}</span>
                </span>
                <button
                  onClick={(e) => handleDelete(g, e)}
                  disabled={deleting === g.id}
                  className="text-xs font-editorial text-red-400 hover:text-red-300 transition disabled:opacity-50"
                >
                  {deleting === g.id ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuat && (
        <BuatPeriodeModal
          onClose={() => setShowBuat(false)}
          onSave={(id) => {
            setShowBuat(false);
            navigate(`/gajian/${id}`);
          }}
        />
      )}
    </FinanceLayout>
  );
}
