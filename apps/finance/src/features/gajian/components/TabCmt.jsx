import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp } from "../../../shared/lib/format";
import { useCmt, useDeleteCmt, usePendingCmtSetoran, useSyncPendingCmtIntoGajian } from "../hooks";
import TabHeader from "./TabHeader";
import EntryCard from "./EntryCard";
import TotalBar from "./TotalBar";
import CmtForm from "./CmtForm";

export default function TabCmt({ gajianId }) {
  const { rows, loading } = useCmt(gajianId);
  const deleteCmt = useDeleteCmt();
  const { groups: pendingGroups, loading: loadingPending } = usePendingCmtSetoran();
  const { syncPendingCmt, syncing } = useSyncPendingCmtIntoGajian();
  const [form, setForm] = useState(null);

  async function handleDelete(id) {
    if (!confirm("Hapus?")) return;
    await deleteCmt(id);
    toast.success("Entri dihapus.");
  }

  async function handleSyncPending(group) {
    try {
      await syncPendingCmt({ gajianId, group });
      toast.success(`${group.namaVendor}: ditambahkan ke Gajian minggu ini.`);
    } catch (err) {
      toast.error("Gagal: " + err.message);
    }
  }

  const sistemTotal = rows.reduce((s, r) => s + (r.total_upah || 0), 0);

  return (
    <div>
      <TabHeader title="CMT Luar" onAdd={() => setForm("new")} />

      {/* Setoran CMT (kirim-potongan-ke-vendor atau terima-barang-jadi dari
          fitur CMT di Admin) yang belum ditautkan ke gaji_cmt manapun —
          admin: "dihitungnya dengan cara otomatis". */}
      {!loadingPending && pendingGroups.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3">
            Setoran CMT Belum Tergaji
          </p>
          {pendingGroups.map((g) => (
            <div
              key={`${g.namaVendor}__${g.hargaUpah}`}
              className="flex items-center justify-between gap-2 bg-skin-raised border border-skin-bdr px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-skin-text truncate">{g.namaVendor}</p>
                <p className="text-[11px] text-skin-text4">
                  Terima {g.jumlahTerima} pcs · {fmtRp(g.hargaUpah)}/pcs = {fmtRp(g.totalUpah)}
                </p>
              </div>
              <button
                type="button"
                disabled={syncing}
                onClick={() => handleSyncPending(g)}
                className="shrink-0 px-2.5 py-1.5 text-[11px] font-editorial tracking-[0.08em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-50"
              >
                Tambahkan
              </button>
            </div>
          ))}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Belum ada entri.</p>
      ) : (
        <div className="space-y-2 mb-3 md:grid md:grid-cols-2 2xl:grid-cols-3 md:gap-2 md:space-y-0">
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
        <CmtForm
          gajianId={gajianId}
          initial={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSave={() => setForm(null)}
        />
      )}
    </div>
  );
}
