import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp } from "../../../shared/lib/format";
import { useCmt, useDeleteCmt } from "../hooks";
import TabHeader from "./TabHeader";
import EntryCard from "./EntryCard";
import TotalBar from "./TotalBar";
import CmtForm from "./CmtForm";

/** TabCmt.jsx — Tab CMT Luar: daftar entri gaji_cmt + total. */
export default function TabCmt({ gajianId }) {
  const { rows, loading } = useCmt(gajianId);
  const deleteCmt = useDeleteCmt();
  const [form, setForm] = useState(null);

  async function handleDelete(id) {
    if (!confirm("Hapus?")) return;
    await deleteCmt(id);
    toast.success("Entri dihapus.");
  }

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);

  return (
    <div>
      <TabHeader title="CMT Luar" onAdd={() => setForm("new")} />
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Belum ada entri.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {rows.map((r) => (
            <EntryCard
              key={r.id}
              nama={r.nama_vendor || "Vendor"}
              sub={`Kirim ${r.jumlah_kirim} / Terima ${r.jumlah_terima} · ${fmtRp(r.harga_upah)}/pcs`}
              amount={r.total_upah}
              onEdit={() => setForm(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
      {sistemTotal > 0 && <TotalBar label="Total CMT Luar" value={sistemTotal} />}

      {form && (
        <CmtForm gajianId={gajianId} initial={form === "new" ? null : form} onClose={() => setForm(null)} onSave={() => setForm(null)} />
      )}
    </div>
  );
}
