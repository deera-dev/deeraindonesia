import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp } from "../../../shared/lib/format";
import { useDeletePotong, usePotong } from "../hooks";
import TabHeader from "./TabHeader";
import EntryCard from "./EntryCard";
import TotalBar from "./TotalBar";
import PotongForm from "./PotongForm";

/** TabPotong.jsx — Tab Tim Potong: daftar entri gaji_potong + total. */
export default function TabPotong({ gajianId, karyawanList }) {
  const { rows, loading } = usePotong(gajianId);
  const deletePotong = useDeletePotong();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  async function handleDelete(id) {
    if (!confirm("Hapus?")) return;
    await deletePotong(id);
    toast.success("Entri dihapus.");
  }

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);

  return (
    <div>
      <TabHeader title="Tim Potong" onAdd={() => setShowForm(true)} />
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
              sub={`${r.qty_potongan} pcs × ${fmtRp(r.tarif_potongan)} · ${r.jumlah_pola} pola · ${r.jumlah_sampel} sampel`}
              amount={r.total_upah}
              onEdit={() => setEditTarget(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
      {sistemTotal > 0 && <TotalBar label="Total Tim Potong" value={sistemTotal} />}

      {showForm && (
        <PotongForm gajianId={gajianId} karyawanList={karyawanList} onClose={() => setShowForm(false)} onSave={() => setShowForm(false)} />
      )}
      {editTarget && (
        <PotongForm gajianId={gajianId} initial={editTarget} karyawanList={karyawanList} onClose={() => setEditTarget(null)} onSave={() => setEditTarget(null)} />
      )}
    </div>
  );
}
