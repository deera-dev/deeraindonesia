import { useMemo, useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useBatalKirimCmtJahit, useCmtJahitKirim } from "../hooks";
import { groupKirimByNo, statusLabel } from "../utils";
import KirimForm from "./KirimForm";
import SetorModal from "./SetorModal";
import SuratJalanCmtModal from "./SuratJalanCmtModal";

export default function CmtJahitTab() {
  const { rows, loading } = useCmtJahitKirim();
  const batalKirim = useBatalKirimCmtJahit();
  const [showForm, setShowForm] = useState(false);
  const [setorTarget, setSetorTarget] = useState(null);
  const [suratJalanTarget, setSuratJalanTarget] = useState(null);

  const groups = useMemo(() => groupKirimByNo(rows), [rows]);

  async function handleBatal(group) {
    if (!confirm(`Batalkan pengiriman ${group.kirimNo} ke ${group.namaVendor}?`)) return;
    try {
      await batalKirim({
        kirimNo: group.kirimNo,
        ids: group.rows.filter((r) => r.status !== "selesai").map((r) => r.id),
      });
      toast.success("Pengiriman dibatalkan.");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full mb-4 py-3 text-sm font-editorial tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition"
      >
        + Kirim Potongan ke CMT
      </button>

      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Belum ada pengiriman ke CMT.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.kirimNo} className="bg-skin-card border border-skin-bdr p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-skin-text truncate">{g.namaVendor}</p>
                  <p className="text-[11px] text-skin-text4">
                    {g.kirimNo} · kirim {g.tanggalKirim}
                    {g.estimasiSelesai ? ` · estimasi ${g.estimasiSelesai}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[9px] font-editorial tracking-[0.08em] uppercase px-1.5 py-0.5 border bg-skin-raised text-skin-text3 border-skin-bdr">
                  {statusLabel(g.status)}
                </span>
              </div>
              <div className="text-[11px] text-skin-text3 space-y-0.5">
                {g.rows.map((r) => (
                  <p key={r.id}>
                    {r.kode_produk} · {r.size} · {r.warna === "_" ? "(tanpa warna)" : r.warna} —{" "}
                    {r.qty} pcs
                    {r.qty_setor != null && ` (setor ${r.qty_setor})`}
                  </p>
                ))}
              </div>
              <p className="text-[11px] text-skin-text3">Upah/pcs: {g.hargaUpah}</p>
              <button
                type="button"
                onClick={() => setSuratJalanTarget(g)}
                className="w-full py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text2"
              >
                Surat Jalan
              </button>
              {g.status === "dikirim" && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSetorTarget(g)}
                    className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition"
                  >
                    Setor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatal(g)}
                    className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text2"
                  >
                    Batalkan
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && <KirimForm onClose={() => setShowForm(false)} />}
      {setorTarget && <SetorModal group={setorTarget} onClose={() => setSetorTarget(null)} />}
      {suratJalanTarget && (
        <SuratJalanCmtModal group={suratJalanTarget} onClose={() => setSuratJalanTarget(null)} />
      )}
    </div>
  );
}
