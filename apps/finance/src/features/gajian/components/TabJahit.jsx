import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useDeleteJahit, useJahit } from "../hooks";
import TabHeader from "./TabHeader";
import EntryCard from "./EntryCard";
import TotalBar from "./TotalBar";
import JahitForm from "./JahitForm";

function kartuDesc(r) {
  const kartuTotal = (r.kartu_items ?? []).reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
  const permakTotal = (r.permak_items ?? []).length;
  return `${kartuTotal} pcs · ${permakTotal} permak`;
}

/** TabJahit.jsx — Tab Tim Jahit: daftar entri gaji_jahit + total. */
export default function TabJahit({ gajianId, karyawanList }) {
  const { rows, loading } = useJahit(gajianId);
  const deleteJahit = useDeleteJahit();
  const [form, setForm] = useState(null); // "new" | row | null

  async function handleDelete(id) {
    if (!confirm("Hapus?")) return;
    await deleteJahit(id);
    toast.success("Entri dihapus.");
  }

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);

  return (
    <div>
      <TabHeader title="Tim Jahit" onAdd={() => setForm("new")} />
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Belum ada entri.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {rows.map((r) => (
            <EntryCard
              key={r.id}
              nama={r.karyawan?.nama ?? "—"}
              sub={kartuDesc(r)}
              amount={r.total_upah}
              onEdit={() => setForm(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
      {sistemTotal > 0 && <TotalBar label="Total Tim Jahit" value={sistemTotal} />}

      {form && (
        <JahitForm
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
