/**
 * KasPage.jsx — Pencatatan uang masuk & keluar.
 * Filter: bulan, jenis (masuk/keluar)
 */
import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import FinanceLayout from "../../../shared/components/FinanceLayout";
import { fmtRp, fmtTanggalPendek } from "../../../shared/lib/format";
import { useDeleteKas, useKasList } from "../hooks";
import KasForm from "../components/KasForm";

export default function KasPage() {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [filterJenis, setFilterJenis] = useState("semua");
  const [filterBulan, setFilterBulan] = useState(() => new Date().toISOString().slice(0, 7));

  const { rows, loading, loadError } = useKasList(filterBulan, filterJenis);
  const deleteKas = useDeleteKas();

  async function handleDelete(id) {
    if (!confirm("Hapus entri kas ini?")) return;
    await deleteKas(id);
    toast.success("Entri dihapus.");
  }

  const totalMasuk  = rows.filter((r) => r.jenis === "masuk").reduce((s, r) => s + (r.jumlah || 0), 0);
  const totalKeluar = rows.filter((r) => r.jenis === "keluar").reduce((s, r) => s + (r.jumlah || 0), 0);
  const saldo = totalMasuk - totalKeluar;

  const headerAction = (
    <button
      onClick={() => setShowForm(true)}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Catat
    </button>
  );

  return (
    <FinanceLayout title="Kas" headerAction={headerAction}>
      {/* Filter */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          type="month"
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="bg-skin-input border border-skin-bdr text-skin-text px-3 py-2 font-editorial text-sm outline-none focus:border-[#CAB170] transition"
        />
        {["semua", "masuk", "keluar"].map((j) => (
          <button
            key={j}
            onClick={() => setFilterJenis(j)}
            className={`px-3 py-1.5 font-editorial text-[11px] tracking-[0.12em] uppercase border transition ${
              filterJenis === j ? "border-[#CAB170] text-[#CAB170] bg-skin-gold" : "border-skin-bdr text-skin-text3"
            }`}
          >
            {j === "semua" ? "Semua" : j === "masuk" ? "↓ Masuk" : "↑ Keluar"}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Masuk</p>
          <p className="font-headline text-emerald-500 text-base leading-none mt-1">{fmtRp(totalMasuk)}</p>
        </div>
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Keluar</p>
          <p className="font-headline text-red-400 text-base leading-none mt-1">{fmtRp(totalKeluar)}</p>
        </div>
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Saldo</p>
          <p className={`font-headline text-base leading-none mt-1 ${saldo >= 0 ? "text-[#CAB170]" : "text-red-400"}`}>{fmtRp(saldo)}</p>
        </div>
      </div>

      {/* List */}
      {loadError && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-editorial">
          ⚠ Gagal memuat kas: {loadError}. Pastikan tabel kas sudah dibuat di Supabase.
        </div>
      )}
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Tidak ada transaksi kas.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="bg-skin-card border border-skin-bdr p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-editorial text-[10px] tracking-[0.1em] uppercase ${r.jenis === "masuk" ? "text-emerald-500" : "text-red-400"}`}>
                      {r.jenis === "masuk" ? "↓" : "↑"} {r.jenis}
                    </span>
                    <span className="font-editorial text-[10px] text-skin-text4 uppercase tracking-wide">{r.kategori}</span>
                  </div>
                  <p className="font-editorial text-sm text-skin-text truncate">{r.keterangan ?? "—"}</p>
                  <p className="font-editorial text-xs text-skin-text3 mt-0.5">{fmtTanggalPendek(r.tanggal)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-headline text-base leading-none ${r.jenis === "masuk" ? "text-emerald-500" : "text-red-400"}`}>
                    {r.jenis === "masuk" ? "+" : "-"}{fmtRp(r.jumlah)}
                  </p>
                  <div className="flex gap-2 mt-1 justify-end">
                    <button onClick={() => setEditTarget(r)} className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3 hover:text-[#CAB170] transition">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="font-editorial text-[10px] uppercase tracking-wide text-red-400 hover:text-red-600 transition">Hapus</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <KasForm onClose={() => setShowForm(false)} onSave={() => setShowForm(false)} />}
      {editTarget && <KasForm initial={editTarget} onClose={() => setEditTarget(null)} onSave={() => setEditTarget(null)} />}
    </FinanceLayout>
  );
}
