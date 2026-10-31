import { toast } from "@deera/shared/features/toast/hooks";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FinanceLayout from "../../../shared/components/FinanceLayout";
import { fmtRp, fmtTanggalPendek } from "../../../shared/lib/format";
import BuatPeriodeModal from "../components/BuatPeriodeModal";
import { useDeleteGajianPeriode, useGajianList } from "../hooks";
import { buildRequestBreakdown } from "../utils";

const TIM_BREAKDOWN = [
  ["total_potong", "Potong"],
  ["total_jahit", "Jahit"],
  ["total_finishing", "Finishing"],
  ["total_kreatif", "Kreatif"],
  ["total_cmt", "CMT"],
];

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
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition whitespace-nowrap"
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
            className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition"
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
              className="bg-skin-card border border-skin-bdr p-4 cursor-pointer hover:border-skin-accent transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-editorial text-sm font-semibold text-skin-text">
                  Sabtu, {fmtTanggalPendek(g.tanggal_sabtu)}
                </span>
                <span
                  className={`text-[10px] font-editorial tracking-[0.12em] uppercase px-2 py-0.5 border ${
                    g.status === "final"
                      ? "border-emerald-500/40 text-emerald-500"
                      : "border-amber-400/40 text-amber-400"
                  }`}
                >
                  {g.status}
                </span>
              </div>
              <p className="font-numeric text-lg leading-none text-skin-accent-text mt-1.5">
                {g.total_gaji ? fmtRp(g.total_gaji) : "—"}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
                {TIM_BREAKDOWN.map(([key, label]) => {
                  const val = g[key];
                  if (!val) return null;
                  return (
                    <span key={key} className="font-editorial text-xs text-skin-text3">
                      {label}: <span className="font-numeric">{fmtRp(val)}</span>
                    </span>
                  );
                })}
              </div>
              <div className="mt-3 pt-2 border-t border-skin-bdr-lt">
                {(() => {
                  const bd = buildRequestBreakdown(g);
                  return (
                    <div className="space-y-0.5" data-testid="request-breakdown">
                      <div className="flex justify-between text-xs text-skin-text3 font-editorial">
                        <span>Total Gaji</span>
                        <span className="font-numeric">{fmtRp(bd.gaji)}</span>
                      </div>
                      {bd.parts.map((p) => (
                        <div
                          key={p.key}
                          className="flex justify-between text-xs text-skin-text3 font-editorial"
                        >
                          <span>
                            {p.sign} {p.label}
                          </span>
                          <span className={`font-numeric ${p.sign === "−" ? "text-red-500" : ""}`}>
                            {p.sign === "−" ? "−" : ""}
                            {fmtRp(p.value)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-editorial font-semibold text-skin-text pt-1">
                        <span>= Request</span>
                        <span className="font-numeric">{fmtRp(bd.request)}</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={(e) => handleDelete(g, e)}
                    disabled={deleting === g.id}
                    className="text-xs font-editorial text-red-500 hover:text-red-400 transition disabled:opacity-50"
                  >
                    {deleting === g.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
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
