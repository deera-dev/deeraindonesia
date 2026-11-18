import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useCmtFullKirim, useCmtSetoranFull, useDeleteCmtFullKirim } from "../hooks";
import KirimBahanForm from "./KirimBahanForm";
import SetoranFullForm from "./SetoranFullForm";

export default function CmtFullTab() {
  const { rows: kirimRows, loading: loadingKirim } = useCmtFullKirim();
  const deleteKirimBahan = useDeleteCmtFullKirim();
  const { rows: setoranRows, loading: loadingSetoran } = useCmtSetoranFull();
  const [showKirimForm, setShowKirimForm] = useState(false);
  const [showSetoranForm, setShowSetoranForm] = useState(false);

  async function handleDeleteKirim(id) {
    if (!confirm("Hapus catatan pengiriman bahan ini?")) return;
    try {
      await deleteKirimBahan(id);
      toast.success("Dihapus.");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3 mb-2">
          Bahan Dikirim ke Vendor
        </p>
        <button
          type="button"
          onClick={() => setShowKirimForm(true)}
          className="w-full mb-3 py-3 text-sm font-editorial tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition"
        >
          + Kirim Bahan ke Vendor
        </button>

        {loadingKirim ? (
          <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
        ) : kirimRows.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-4">Belum ada bahan yang dikirim.</p>
        ) : (
          <div className="space-y-3">
            {kirimRows.map((r) => (
              <div key={r.id} className="bg-skin-card border border-skin-bdr p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-skin-text truncate">{r.nama_vendor}</p>
                    <p className="text-[11px] text-skin-text4">
                      {r.tanggal_kirim}
                      {r.estimasi_selesai ? ` · estimasi ${r.estimasi_selesai}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteKirim(r.id)}
                    className="shrink-0 text-xs font-editorial text-red-400"
                  >
                    Hapus
                  </button>
                </div>
                <div className="text-[11px] text-skin-text3 space-y-0.5">
                  {(r.bahan ?? []).map((b, i) => (
                    <p key={i}>
                      {b.nama_bahan} — {b.jumlah} {b.satuan}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="font-editorial text-[10px] tracking-[0.2em] uppercase text-skin-text3 mb-2">
          Barang Jadi Diterima
        </p>
        <button
          type="button"
          onClick={() => setShowSetoranForm(true)}
          className="w-full mb-3 py-3 text-sm font-editorial tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition"
        >
          + Terima Setoran CMT Full
        </button>

        {loadingSetoran ? (
          <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
        ) : setoranRows.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-4">Belum ada setoran CMT Full.</p>
        ) : (
          <div className="space-y-3">
            {setoranRows.map((r) => (
              <div key={r.id} className="bg-skin-card border border-skin-bdr p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-skin-text truncate">{r.nama_vendor}</p>
                    <p className="text-[11px] text-skin-text4">
                      {r.kode_produk} · {r.tanggal_setor}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-numeric text-skin-accent-text">
                    {Number(r.total_upah || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="text-[11px] text-skin-text3 space-y-0.5">
                  {(r.items ?? []).map((it, i) => (
                    <p key={i}>
                      {it.size} · {it.warna === "_" ? "(tanpa warna)" : it.warna} — {it.qty} pcs
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showKirimForm && <KirimBahanForm onClose={() => setShowKirimForm(false)} />}
      {showSetoranForm && <SetoranFullForm onClose={() => setShowSetoranForm(false)} />}
    </div>
  );
}
