/**
 * ProduksiBahanPage.jsx — Halaman manajemen bahan baku.
 *
 * Tab "Pembelian" : daftar & catat beli bahan + jatuh tempo
 * Tab "Pinjam"    : daftar & catat bahan pinjam + surat jalan
 * Tab "Stok"      : ringkasan stok bahan (masuk - keluar produksi)
 */
import { useState } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import ProduksiLayout from "../../../shared/components/ProduksiLayout";
import { useBahanItems, useSaveBahan, useToggleLunas, useDeleteBahan } from "../hooks";
import { TABS, fmtRp, filterBahanItems, sumBelumLunas, findRelatedPinjamRows } from "../utils";
import Modal from "./Modal";
import PembelianBulkForm from "./PembelianBulkForm";
import PinjamBulkForm from "./PinjamBulkForm";
import BahanForm from "./BahanForm";
import BahanCard from "./BahanCard";
import StokPanel from "./StokPanel";
import SuratJalanPinjamModal from "./SuratJalanPinjamModal";
import MergeDupeModal from "./MergeDupeModal";
import TagihanBulanPanel from "./TagihanBulanPanel";

export default function ProduksiBahanPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pembelian");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suratJalan, setSuratJalan] = useState(null);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [showMerge, setShowMerge] = useState(false);

  const table = activeTab === "pinjam" ? "bahan_pinjam" : "bahan_pembelian";
  const { items, loading } = useBahanItems(table);
  const saveBahan = useSaveBahan(table);
  const toggleLunas = useToggleLunas(table);
  const deleteBahan = useDeleteBahan(table);

  async function handleSave(payload) {
    const meta = {
      created_by: user?.email,
      created_by_name: user?.user_metadata?.full_name ?? user?.email,
    };
    await saveBahan(payload, editing, meta, activeTab);
    toast.success(
      editing
        ? `${editing.nama_bahan ?? editing.kode_bahan ?? "Data"} berhasil diperbarui.`
        : `Data berhasil disimpan.`,
    );
    setShowForm(false);
    setEditing(null);
  }

  async function handleToggleLunas(item) {
    await toggleLunas(item);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteBahan(deleteTarget, activeTab);
    toast.success(`${deleteTarget.nama_bahan ?? deleteTarget.kode_bahan ?? "Data"} berhasil dihapus.`);
    setDeleteTarget(null);
  }

  const displayed = filterBahanItems(items, filterStatus, search);
  const totalBelum = sumBelumLunas(items);

  function openEdit(i) {
    setEditing(i);
    setShowForm(true);
  }

  function openSuratJalan(clicked) {
    setSuratJalan(findRelatedPinjamRows(items, clicked));
  }

  const formTitle =
    !editing && activeTab === "pembelian"
      ? "Tambah Pembelian Bahan"
      : !editing && activeTab === "pinjam"
        ? "Tambah Bahan Pinjam"
        : `Edit ${activeTab === "pinjam" ? "Bahan Pinjam" : "Pembelian Bahan"}`;

  return (
    <ProduksiLayout title="Bahan Baku">
      {/* Tab switcher */}
      <div className="flex border border-skin-bdr mb-5">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setSearch("");
              setFilterStatus("semua");
            }}
            className={`flex-1 py-2.5 font-editorial text-xs tracking-[0.18em] uppercase transition border-r last:border-r-0 border-skin-bdr ${
              activeTab === key
                ? "bg-[#CAB170] text-white"
                : "text-skin-text3 hover:text-skin-text bg-skin-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "stok" ? (
        <StokPanel />
      ) : (
        <>
          {/* Ringkasan tagihan belum lunas */}
          {totalBelum > 0 && (
            <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <span className="text-xs font-editorial tracking-[0.15em] uppercase text-amber-700 dark:text-amber-400">
                Belum Lunas
              </span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {fmtRp(totalBelum)}
              </span>
            </div>
          )}

          {/* Tagihan per bulan — dipakai di tab Pembelian MAUPUN Pinjam
              (skema kolom identik, permintaan Denny 2026-08: "buat bahan
              pinjam juga belum ada sharenya seperti di pembelian"). Panel
              kedua (status="lunas") jadi TEMPAT MELIHAT tagihan yg sudah
              dibayar (permintaan Denny 2026-08: "bahan yang udh lunas,
              lihat tagihannya dimana ya? ga ada tempat buat lihat tagihan
              sebelumnya, yang sudah lunas"). */}
          <TagihanBulanPanel items={items} status="belum" />
          <TagihanBulanPanel items={items} status="lunas" />

          {/* Toolbar: search + filter + gabung + tambah */}
          <div className="space-y-2 mb-4 md:max-w-2xl">
            <input
              type="text"
              placeholder="Cari nama bahan, kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
            />
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
              >
                <option value="semua">Semua Status</option>
                <option value="belum">Belum Lunas</option>
                <option value="lunas">Lunas</option>
              </select>
              <button
                onClick={() => setShowMerge(true)}
                title="Deteksi dan gabung entri duplikat"
                className="px-3 py-2 font-editorial text-sm tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition shrink-0"
              >
                Gabung
              </button>
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="px-5 py-2 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition shrink-0"
              >
                + Tambah
              </button>
            </div>
          </div>

          {/* Daftar — BahanCard tidak punya state expand/collapse yang
              mengubah tinggi kartu (menu titik-tiga pakai `absolute`,
              tidak mendorong layout), jadi grid biasa aman dipakai. */}
          {loading ? (
            <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">
              {items.length === 0
                ? `Belum ada data ${activeTab === "pinjam" ? "bahan pinjam" : "pembelian bahan"}.`
                : "Tidak ada data yang cocok."}
            </p>
          ) : (
            <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
              {displayed.map((item) => (
                <BahanCard
                  key={item.id}
                  item={item}
                  isPinjam={activeTab === "pinjam"}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggleLunas={handleToggleLunas}
                  onSuratJalan={openSuratJalan}
                />
              ))}
            </div>
          )}
        </>
      )}


      {/* Modal form tambah/edit */}
      {showForm && (
        <Modal
          title={formTitle}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          {activeTab === "pembelian" && !editing ? (
            <PembelianBulkForm onSave={handleSave} onCancel={() => setShowForm(false)} />
          ) : activeTab === "pinjam" && !editing ? (
            <PinjamBulkForm onSave={handleSave} onCancel={() => setShowForm(false)} />
          ) : (
            <BahanForm
              mode={activeTab}
              initial={editing}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          )}
        </Modal>
      )}

      {/* Modal konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-skin-card border-2 border-skin-bdr p-6 w-full max-w-sm space-y-4">
            <p className="font-editorial text-sm uppercase text-skin-text2">Hapus Data</p>
            <p className="text-sm text-skin-text">
              Hapus <strong>{deleteTarget.nama_bahan}</strong>? Data tidak bisa dikembalikan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-500 hover:bg-red-600 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Dupe Modal */}
      {showMerge && (
        <MergeDupeModal
          table={activeTab === "pembelian" ? "bahan_pembelian" : "bahan_pinjam"}
          onClose={() => setShowMerge(false)}
        />
      )}

      {/* Surat Jalan */}
      {suratJalan && (
        <SuratJalanPinjamModal items={suratJalan} onClose={() => setSuratJalan(null)} />
      )}
    </ProduksiLayout>
  );
}
