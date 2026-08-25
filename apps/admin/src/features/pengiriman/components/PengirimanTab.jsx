/**
 * PengirimanTab.jsx
 * Konten kategori "Pengiriman" di halaman Transfer — kirim barang ke
 * ekspedisi (JNE/J&T/dll), murni alat bantu bikin surat jalan (gambar) +
 * riwayat pengiriman. TIDAK menyentuh stok/produk sama sekali (beda dgn
 * kategori "Transfer Stok" di TransferPage.jsx).
 */
import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { usePengiriman, useDeletePengiriman } from "../hooks";
import PengirimanForm from "./PengirimanForm";
import PengirimanCard from "./PengirimanCard";
import SuratJalanPengiriman from "./SuratJalanPengiriman";
import DeleteConfirmModal from "./DeleteConfirmModal";
import DaftarPenerimaModal from "./DaftarPenerimaModal";

function resolveDateRange(preset, customFrom, customTo) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (preset === "today") return { from: todayStr, to: todayStr };
  if (preset === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().split("T")[0], to: todayStr };
  }
  if (preset === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: d.toISOString().split("T")[0], to: todayStr };
  }
  if (preset === "custom") return { from: customFrom || todayStr, to: customTo || todayStr };
  return { from: null, to: null };
}

export default function PengirimanTab() {
  const [datePreset, setDatePreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [suratJalan, setSuratJalan] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // "Daftar Penerima" (permintaan Denny 2026-08) — pilih penerima yg
  // datanya sudah lengkap → buka PengirimanForm baru dgn field ter-prefill,
  // BUKAN mode edit (prefillPelanggan, bukan initialData — lihat PengirimanForm.jsx).
  const [showDaftarPenerima, setShowDaftarPenerima] = useState(false);
  const [prefillPelanggan, setPrefillPelanggan] = useState(null);

  const { from: dateFrom, to: dateTo } = resolveDateRange(datePreset, customFrom, customTo);
  const { pengirimanList, loading, reload } = usePengiriman(dateFrom, dateTo);
  const deletePengiriman = useDeletePengiriman();

  function handleFormSaved(pengiriman) {
    setShowForm(false);
    setEditTarget(null);
    setPrefillPelanggan(null);
    reload();
    toast.success(`Pengiriman ${pengiriman.pengiriman_no} berhasil disimpan.`);
    setSuratJalan(pengiriman);
  }

  function handlePickFromDaftarPenerima(p) {
    setShowDaftarPenerima(false);
    setPrefillPelanggan(p);
    setShowForm(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deletePengiriman(deleteTarget);
      setDeleteTarget(null);
      toast.success("Pengiriman dihapus.");
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      {/* Header aksi + filter tanggal */}
      <div className="px-4 pt-4 md:px-8 md:max-w-6xl md:mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-skin-text3">Surat jalan untuk pengiriman ke ekspedisi.</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDaftarPenerima(true)}
              className="px-4 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase text-[#CAB170] border border-[#CAB170] hover:bg-[#CAB170]/10 transition"
            >
              Daftar Penerima
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
            >
              + Pengiriman
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-3">
          {[
            { key: "today", label: "Hari Ini" },
            { key: "week", label: "7 Hari" },
            { key: "month", label: "Bulan Ini" },
            { key: "custom", label: "Custom" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              className={`px-3 py-1 text-xs font-semibold tracking-[0.06em] uppercase transition border ${
                datePreset === p.key
                  ? "bg-[#CAB170] text-white border-[#CAB170]"
                  : "border-skin-bdr text-skin-text3 hover:text-skin-text2 hover:border-[#CAB170]"
              }`}
            >
              {p.label}
            </button>
          ))}
          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5 ml-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-skin-bdr bg-skin-card text-skin-text text-xs px-2 py-1 focus:outline-none focus:border-[#CAB170]"
              />
              <span className="text-xs text-skin-text3">—</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border border-skin-bdr bg-skin-card text-skin-text text-xs px-2 py-1 focus:outline-none focus:border-[#CAB170]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Daftar */}
      <div className="px-4 py-4 md:px-8 md:max-w-6xl md:mx-auto space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 xl:grid-cols-3">
        {loading && <p className="text-center text-sm text-skin-text3 py-12">Memuat data...</p>}

        {!loading && pengirimanList.length === 0 && (
          <div className="text-center py-16 md:col-span-full">
            <p className="text-sm text-skin-text4">Belum ada pengiriman</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-6 py-3 bg-[#CAB170] text-white text-sm tracking-[0.1em] uppercase font-semibold hover:bg-[#A8925A] transition"
            >
              + Buat Pengiriman Pertama
            </button>
          </div>
        )}

        {pengirimanList.map((pengiriman) => (
          <PengirimanCard
            key={pengiriman.id}
            pengiriman={pengiriman}
            onSuratJalan={setSuratJalan}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {/* Modals */}
      {showForm && (
        <PengirimanForm
          prefillPelanggan={prefillPelanggan}
          onClose={() => {
            setShowForm(false);
            setPrefillPelanggan(null);
          }}
          onSaved={handleFormSaved}
        />
      )}

      {showDaftarPenerima && (
        <DaftarPenerimaModal
          onPick={handlePickFromDaftarPenerima}
          onClose={() => setShowDaftarPenerima(false)}
        />
      )}

      {editTarget && (
        <PengirimanForm
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(pengiriman) => {
            setEditTarget(null);
            reload();
            toast.success(`Pengiriman ${pengiriman.pengiriman_no} diperbarui.`);
          }}
        />
      )}

      {suratJalan && (
        <SuratJalanPengiriman pengiriman={suratJalan} onClose={() => setSuratJalan(null)} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          pengiriman={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </>
  );
}
