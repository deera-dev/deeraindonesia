/**
 * KasbonPage.jsx — Pinjaman karyawan, cicilan, status lunas/belum.
 */
import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useKaryawanAktif } from "../../karyawan/hooks";
import FinanceLayout from "../../../shared/components/FinanceLayout";
import { fmtRp } from "../../../shared/lib/format";
import { useDeleteKasbon, useKasbonList } from "../hooks";
import KasbonForm from "../components/KasbonForm";
import CicilanModal from "../components/CicilanModal";
import KasbonCard from "../components/KasbonCard";

export default function KasbonPage() {
  const { rows, loading: kasbonLoading } = useKasbonList();
  const { karyawan: karyawanList, loading: karyawanLoading } = useKaryawanAktif();
  const loading = kasbonLoading || karyawanLoading;
  const deleteKasbon = useDeleteKasbon();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [cicilanTarget, setCicilanTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState("belum");

  async function handleDelete(id) {
    if (!confirm("Hapus kasbon ini?")) return;
    await deleteKasbon(id);
    toast.success("Kasbon dihapus.");
  }

  const filtered = filterStatus === "semua" ? rows : rows.filter((r) => r.status === filterStatus);
  const totalSisa = rows.filter((r) => r.status === "belum").reduce((s, r) => s + (r.sisa || 0), 0);

  const headerAction = (
    <button
      onClick={() => setShowForm(true)}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Kasbon Baru
    </button>
  );

  return (
    <FinanceLayout title="Kasbon" headerAction={headerAction}>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Total Sisa</p>
          <p className="font-numeric text-amber-500 text-base leading-none mt-1">{fmtRp(totalSisa)}</p>
        </div>
        <div className="bg-skin-card border border-skin-bdr px-3 py-3 text-center">
          <p className="font-editorial text-[10px] uppercase tracking-wide text-skin-text3">Belum Lunas</p>
          <p className="font-headline text-skin-text text-base leading-none mt-1">
            {rows.filter((r) => r.status === "belum").length} orang
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["belum", "lunas", "semua"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`flex-1 py-2 font-editorial text-[11px] tracking-[0.12em] uppercase border transition ${
              filterStatus === s ? "border-[#CAB170] text-[#CAB170] bg-skin-gold" : "border-skin-bdr text-skin-text3"
            }`}
          >
            {s === "belum" ? "Belum Lunas" : s === "lunas" ? "Lunas" : "Semua"}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Tidak ada kasbon.</p>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-3 md:space-y-0">
          {filtered.map((k) => (
            <KasbonCard
              key={k.id}
              k={k}
              onEdit={setEditTarget}
              onCicilan={setCicilanTarget}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showForm && (
        <KasbonForm karyawanList={karyawanList} existingRows={rows} onClose={() => setShowForm(false)} onSave={() => setShowForm(false)} />
      )}
      {editTarget && (
        <KasbonForm initial={editTarget} karyawanList={karyawanList} existingRows={rows} onClose={() => setEditTarget(null)} onSave={() => setEditTarget(null)} />
      )}
      {cicilanTarget && (
        <CicilanModal kasbon={cicilanTarget} onClose={() => setCicilanTarget(null)} onSave={() => setCicilanTarget(null)} />
      )}
    </FinanceLayout>
  );
}
