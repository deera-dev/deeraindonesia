import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useDeleteQC, useQC } from "../hooks";
import TabHeader from "./TabHeader";
import EntryCard from "./EntryCard";
import TotalBar from "./TotalBar";
import QCForm from "./QCForm";

/** TabQC.jsx — Tab Tim QC: daftar entri gaji_qc + total. */
export default function TabQC({ gajianId, karyawanList }) {
  const { rows, loading } = useQC(gajianId);
  const deleteQC = useDeleteQC();
  const [form, setForm] = useState(null);

  async function handleDelete(id) {
    if (!confirm("Hapus?")) return;
    await deleteQC(id);
    toast.success("Entri dihapus.");
  }

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);

  return (
    <div>
      <TabHeader title="Tim QC" onAdd={() => setForm("new")} />
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Belum ada entri.</p>
      ) : (
        <div className="space-y-2 mb-3 md:grid md:grid-cols-2 2xl:grid-cols-3 md:gap-2 md:space-y-0">
          {rows.map((r) => (
            <EntryCard
              key={r.id}
              nama={r.karyawan?.nama ?? "—"}
              sub={(r.nama_produk ? `${r.nama_produk} · ` : "") + `${r.jumlah_pcs} pcs`}
              amount={r.total_upah}
              onEdit={() => setForm(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
      {sistemTotal > 0 && <TotalBar label="Total Tim QC" value={sistemTotal} />}

      {form && (
        <QCForm
          gajianId={gajianId}
          initial={form === "new" ? null : form}
          karyawanList={karyawanList}
          onClose={() => setForm(null)}
          onSave={() => setForm(null)}
        />
      )}
    </div>
  );
}
