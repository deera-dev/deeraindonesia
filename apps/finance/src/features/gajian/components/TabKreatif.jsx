import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useDeleteKreatif, useKreatif } from "../hooks";
import TabHeader from "./TabHeader";
import EntryCard from "./EntryCard";
import TotalBar from "./TotalBar";
import KreatifForm from "./KreatifForm";

function desc(r) {
  return [
    r.jumlah_video ? `${r.jumlah_video}v` : null,
    r.jumlah_foto ? `${r.jumlah_foto}f` : null,
    r.jumlah_logo ? `${r.jumlah_logo}l` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** TabKreatif.jsx — Tab Tim Kreatif: daftar entri gaji_kreatif + total. */
export default function TabKreatif({ gajianId, karyawanList }) {
  const { rows, loading } = useKreatif(gajianId);
  const deleteKreatif = useDeleteKreatif();
  const [form, setForm] = useState(null);

  async function handleDelete(id) {
    if (!confirm("Hapus?")) return;
    await deleteKreatif(id);
    toast.success("Entri dihapus.");
  }

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);

  return (
    <div>
      <TabHeader title="Tim Kreatif" onAdd={() => setForm("new")} />
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
              sub={desc(r)}
              amount={r.total_upah}
              onEdit={() => setForm(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
      {sistemTotal > 0 && <TotalBar label="Total Tim Kreatif" value={sistemTotal} />}

      {form && (
        <KreatifForm
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
