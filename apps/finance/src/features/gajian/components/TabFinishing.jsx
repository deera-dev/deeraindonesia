import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp } from "../../../shared/lib/format";
import { useDeleteFinishing, useFinishing } from "../hooks";
import TabHeader from "./TabHeader";
import TotalBar from "./TotalBar";
import FinishingForm from "./FinishingForm";

/** TabFinishing.jsx — Tab Finishing: satu entri per periode (gaji_finishing). */
export default function TabFinishing({ gajianId }) {
  const { record, loading } = useFinishing(gajianId);
  const deleteFinishing = useDeleteFinishing();
  const [showForm, setShowForm] = useState(false);

  async function handleDelete() {
    if (!confirm("Hapus data finishing?")) return;
    await deleteFinishing(record.id);
    toast.success("Data finishing dihapus.");
  }

  if (loading) return <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>;

  return (
    <div>
      <TabHeader title="Finishing" />
      <p className="font-editorial text-[11px] text-skin-text4 mb-3">1 entri per periode</p>

      {!record ? (
        <div className="text-center py-8">
          <p className="text-sm text-skin-text3 mb-3">Belum ada data finishing.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
          >
            + Input Finishing
          </button>
        </div>
      ) : (
        <div className="bg-skin-raised p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-editorial text-sm text-skin-text">{(record.items ?? []).length} produk</span>
            <span className="font-numeric text-sm font-semibold text-skin-text">{fmtRp(record.total_upah)}</span>
          </div>
          <div className="space-y-1 border-t border-skin-bdr-lt pt-2">
            {(record.items ?? []).map((it, i) => (
              <p key={i} className="font-editorial text-xs text-skin-text3">
                {it.nama_produk || `Produk ${i + 1}`} — {it.jumlah} pcs finishing
                {it.kancing_qty ? ` + ${it.kancing_qty} kancing` : ""}
              </p>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(true)} className="text-xs font-editorial text-[#CAB170] hover:text-[#A8925A] transition">
              Edit
            </button>
            <button type="button" onClick={handleDelete} className="text-xs font-editorial text-red-400">
              Hapus
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <FinishingForm gajianId={gajianId} initial={record} onClose={() => setShowForm(false)} onSave={() => setShowForm(false)} />
      )}
    </div>
  );
}
