import { useMemo, useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useBatalKirimCmtJahit, useCmtJahitKirim } from "../hooks";
import { groupKirimByNo } from "../utils";
import CmtJahitCard from "./CmtJahitCard";
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
            <CmtJahitCard
              key={g.kirimNo}
              group={g}
              onSetor={setSetorTarget}
              onBatal={handleBatal}
              onSuratJalan={setSuratJalanTarget}
            />
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
