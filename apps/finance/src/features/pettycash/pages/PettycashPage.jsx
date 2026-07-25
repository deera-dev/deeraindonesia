/**
 * PettycashPage.jsx — Dana kas kecil, terpisah dari Kas utama.
 * "Isi Ulang" menambah saldo, "Pengeluaran" mengurangi saldo.
 * Saldo yang ditampilkan selalu all-time (berjalan), terlepas dari filter
 * bulan/jenis yang hanya memengaruhi daftar & ringkasan periode di bawahnya.
 */
import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import FinanceLayout from "../../../shared/components/FinanceLayout";
import { fmtRp, fmtTanggalPendek } from "../../../shared/lib/format";
import { useDeletePettycash, usePettycashAll } from "../hooks";
import PettycashForm from "../components/PettycashForm";
import PettycashShareModal from "../components/PettycashShareModal";

export default function PettycashPage() {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [filterJenis, setFilterJenis] = useState("semua");
  const [filterBulan, setFilterBulan] = useState(() => new Date().toISOString().slice(0, 7));

  const { rows, saldo, loading, loadError } = usePettycashAll();
  const deletePettycash = useDeletePettycash();

  async function handleDelete(id) {
    if (!confirm("Hapus entri petty cash ini?")) return;
    await deletePettycash(id);
    toast.success("Entri dihapus.");
  }

  // Daftar & ringkasan periode — ini yang terpengaruh filter bulan/jenis.
  // (Saldo all-time di atas dihitung dari SEMUA baris oleh usePettycashAll().)
  const filtered = rows.filter((r) => {
    if (filterBulan && !r.tanggal?.startsWith(filterBulan)) return false;
    if (filterJenis !== "semua" && r.jenis !== filterJenis) return false;
    return true;
  });
  const periodeIsi = filtered.filter((r) => r.jenis === "isi").reduce((s, r) => s + (r.jumlah || 0), 0);
  const periodeKeluar = filtered.filter((r) => r.jenis === "keluar").reduce((s, r) => s + (r.jumlah || 0), 0);

  const headerAction = (
    <div className="flex gap-2">
      <button
        onClick={() => setShowShare(true)}
        className="px-3 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-skin-text3 border border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170] transition whitespace-nowrap"
      >
        ↗ Share
      </button>
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
      >
        + Catat
      </button>
    </div>
  );

  return (
    <FinanceLayout title="Petty Cash" headerAction={headerAction}>
      {/* Saldo berjalan — all-time, selalu tampil di atas */}
      <div className="bg-skin-card border-2 border-[#CAB170] px-4 py-4 mb-4 text-center">
        <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Saldo Petty Cash Sekarang</p>
        <p className={`font-headline text-2xl leading-none mt-1 ${saldo >= 0 ? "text-[#CAB170]" : "text-red-400"}`}>{fmtRp(saldo)}</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          type="month"
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="bg-skin-input border border-skin-bdr text-skin-text px-3 py-2 font-editorial text-sm outline-none focus:border-[#CAB170] transition"
        />
        {["semua", "isi", "keluar"].map((j) => (
          <button
            key={j}
            onClick={() => setFilterJenis(j)}
            className={`px-3 py-1.5 font-editorial text-[11px] tracking-[0.12em] uppercase border transition ${
              filterJenis === j ? "border-[#CAB170] text-[#CAB170] bg-skin-gold" : "border-skin-bdr text-skin-text3"
            }`}
          >
            {j === "semua" ? "Semua" : j === "isi" ? "↓ Isi Ulang" : "↑ Pengeluaran"}
          </button>
        ))}
      </div>

      {/* Ringkasan periode (terpengaruh filter di atas) */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Isi Ulang (periode ini)</p>
          <p className="font-headline text-emerald-500 text-base leading-none mt-1">{fmtRp(periodeIsi)}</p>
        </div>
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Pengeluaran (periode ini)</p>
          <p className="font-headline text-red-400 text-base leading-none mt-1">{fmtRp(periodeKeluar)}</p>
        </div>
      </div>

      {/* List */}
      {loadError && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-editorial">
          ⚠ Gagal memuat petty cash: {loadError}. Pastikan tabel pettycash sudah dibuat di Supabase.
        </div>
      )}
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Tidak ada transaksi petty cash.</p>
      ) : (
        <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-3 md:space-y-0">
          {filtered.map((r) => (
            <div key={r.id} className="bg-skin-card border border-skin-bdr p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-editorial text-[10px] tracking-[0.1em] uppercase ${r.jenis === "isi" ? "text-emerald-500" : "text-red-400"}`}>
                      {r.jenis === "isi" ? "↓" : "↑"} {r.jenis === "isi" ? "isi ulang" : "keluar"}
                    </span>
                    <span className="font-editorial text-[10px] text-skin-text4 uppercase tracking-wide">{r.kategori}</span>
                  </div>
                  <p className="font-editorial text-sm text-skin-text truncate">{r.keterangan ?? "—"}</p>
                  <p className="font-editorial text-xs text-skin-text3 mt-0.5">{fmtTanggalPendek(r.tanggal)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-headline text-base leading-none ${r.jenis === "isi" ? "text-emerald-500" : "text-red-400"}`}>
                    {r.jenis === "isi" ? "+" : "-"}{fmtRp(r.jumlah)}
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

      {showForm && <PettycashForm onClose={() => setShowForm(false)} onSave={() => setShowForm(false)} />}
      {editTarget && <PettycashForm initial={editTarget} onClose={() => setEditTarget(null)} onSave={() => setEditTarget(null)} />}
      {showShare && (
        <PettycashShareModal rows={rows} saldo={saldo} onClose={() => setShowShare(false)} />
      )}
    </FinanceLayout>
  );
}
