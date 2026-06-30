/**
 * KaryawanPage.jsx — CRUD master data karyawan.
 * Kolom: nama, tim, no_rekening, nama_bank, aktif
 */
import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import FinanceLayout from "../../../shared/components/FinanceLayout";
import { TIM_OPTIONS, timLabel } from "../utils";
import { useKaryawanList, useToggleKaryawanAktif } from "../hooks";
import KaryawanForm from "../components/KaryawanForm";
import KaryawanCard from "../components/KaryawanCard";

const TIM_ALL = [{ value: "semua", label: "Semua Tim" }, ...TIM_OPTIONS];

export default function KaryawanPage() {
  const { karyawan, loading } = useKaryawanList();
  const toggleAktif = useToggleKaryawanAktif();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [filterTim, setFilterTim] = useState("semua");
  const [showNonAktif, setShowNonAktif] = useState(false);

  async function handleToggleAktif(k) {
    try {
      await toggleAktif(k);
      toast.success(k.aktif ? "Karyawan dinonaktifkan." : "Karyawan diaktifkan.");
    } catch (err) {
      toast.error("Gagal update: " + err.message);
    }
  }

  const filtered = karyawan.filter((k) => {
    if (!showNonAktif && !k.aktif) return false;
    if (filterTim !== "semua" && k.tim !== filterTim) return false;
    return true;
  });

  // Group by tim
  const byTim = filtered.reduce((acc, k) => {
    const t = k.tim ?? "lainnya";
    if (!acc[t]) acc[t] = [];
    acc[t].push(k);
    return acc;
  }, {});

  const headerAction = (
    <button
      onClick={() => setShowForm(true)}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Tambah
    </button>
  );

  return (
    <FinanceLayout title="Karyawan" headerAction={headerAction}>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {TIM_ALL.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterTim(t.value)}
              className={`px-3 py-1.5 font-editorial text-[11px] tracking-[0.12em] uppercase border transition ${
                filterTim === t.value
                  ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                  : "border-skin-bdr text-skin-text3 hover:border-skin-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNonAktif((v) => !v)}
          className={`px-3 py-1.5 font-editorial text-[11px] tracking-[0.12em] uppercase border transition ${
            showNonAktif
              ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
              : "border-skin-bdr text-skin-text3"
          }`}
        >
          + Non-aktif
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Tidak ada karyawan.</p>
      ) : (
        <div className="space-y-5">
          {Object.entries(byTim).map(([tim, list]) => (
            <div key={tim}>
              <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3 mb-2">
                {timLabel(tim)} · {list.length} orang
              </p>
              <div className="space-y-2">
                {list.map((k) => (
                  <KaryawanCard
                    key={k.id}
                    k={k}
                    onEdit={setEditTarget}
                    onToggleAktif={handleToggleAktif}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah */}
      {showForm && (
        <KaryawanForm
          onClose={() => setShowForm(false)}
          onSave={() => setShowForm(false)}
        />
      )}

      {/* Modal Edit */}
      {editTarget && (
        <KaryawanForm
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => setEditTarget(null)}
        />
      )}
    </FinanceLayout>
  );
}
