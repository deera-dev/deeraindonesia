/**
 * ProduksiRecordPage.jsx — Halaman catatan batch produksi & pembuatan produk baru.
 *
 * Flow:
 * 1. Buat produk baru (pilih ukuran, tanpa harga jual dulu)
 * 2. Input qty produksi per size×warna → disimpan ke expected_stok (buku potongan)
 * 3. HPP otomatis dari hpp_template jika sudah dibuat
 * 4. Harga jual & foto diisi nanti di halaman Admin → Edit Produk
 * 5. Stok aktual diisi nanti di Stok Opname
 */
import { useMemo, useState } from "react";
import { useInvalidateProducts } from "@deera/shared/features/products/hooks";
import { useInvalidateStokBahan } from "../../produksi-bahan/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import ProduksiLayout from "../../../shared/components/ProduksiLayout";
import { useBatches, useBatchFilter, useDeleteBatch, useResyncBahanDipakai } from "../hooks";
import { filterAndSortBatches } from "../utils";
import BatchForm from "./BatchForm";
import BatchCard from "./BatchCard";
import BatchFilterModal from "./BatchFilterModal";

function BatchModal({ title, batch, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[95dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">{title}</h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text transition text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <BatchForm initial={batch} onSave={onSave} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}

export default function ProduksiRecordPage() {
  const invalidateProducts = useInvalidateProducts();
  // Daftar Stok Bahan (fitur produksi-bahan) punya query key sendiri yang
  // TIDAK otomatis ter-invalidate oleh mutasi batch di fitur ini — kolom
  // "Keluar" di sana bergantung pada produksi_batch.bahan_dipakai, jadi
  // setiap create/update/delete/sinkronisasi batch wajib invalidate cache itu
  // juga supaya angkanya langsung up-to-date tanpa perlu refresh manual.
  const invalidateStokBahan = useInvalidateStokBahan();
  const { batches, loading } = useBatches();
  const deleteBatch = useDeleteBatch();
  const resyncBahanDipakai = useResyncBahanDipakai();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const {
    applied: appliedFilter,
    draft: draftFilter,
    isModalOpen,
    openModal,
    closeModal,
    setDraft,
    applyDraft,
    resetAll: resetFilters,
    hasActiveFilter,
  } = useBatchFilter();

  const sorted = useMemo(
    () => filterAndSortBatches(batches, appliedFilter, { search }),
    [batches, appliedFilter, search],
  );

  const previewCount = useMemo(
    () => (isModalOpen ? filterAndSortBatches(batches, draftFilter, { search }).length : 0),
    [isModalOpen, batches, draftFilter, search],
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBatch(deleteTarget);
      invalidateProducts();
      invalidateStokBahan();
      toast.success(`${deleteTarget.nama_produk ?? deleteTarget.kode_produk} berhasil dihapus.`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error("Gagal hapus: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSync(batch) {
    await resyncBahanDipakai(batch);
    invalidateStokBahan();
    toast.success(`Pemakaian bahan batch ${batch.batch_no} berhasil disinkronkan.`);
  }

  const headerAction = (
    <button
      onClick={() => setShowForm(true)}
      className="px-4 py-2 font-editorial text-xs tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
    >
      + Produk Baru
    </button>
  );

  return (
    <ProduksiLayout title="Catatan Produksi" headerAction={headerAction}>
      <div className="lg:max-w-6xl lg:mx-auto">
        {!loading && batches.length > 0 && (
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode, nama, bahan, no. batch, catatan..."
              className="w-full bg-skin-card border-2 border-skin-bdr px-4 py-4 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition font-editorial placeholder:text-skin-text4"
            />
            {search.trim() && (
              <p className="mt-2 text-sm text-skin-text3 font-editorial">
                {sorted.length} batch &middot; &ldquo;{search}&rdquo;
              </p>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={openModal}
                className={`px-4 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase border-2 transition ${
                  hasActiveFilter
                    ? "bg-[#CAB170] border-[#CAB170] text-white"
                    : "bg-skin-card border-skin-bdr text-skin-text3 hover:border-[#CAB170]"
                }`}
              >
                Filter{hasActiveFilter ? ` (${sorted.length})` : ""}
              </button>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-editorial tracking-[0.1em] uppercase text-skin-text3 hover:text-red-500 underline"
                >
                  Hapus Filter
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
        ) : batches.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-8">Belum ada catatan produksi.</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-8">
            Tidak ada catatan produksi yang cocok.
          </p>
        ) : (
          /* CSS multi-column masonry di lg+ (bukan grid) — BatchCard adalah
             accordion (expand/collapse detail per batch), tinggi variatif
             per item, lihat catatan yang sama di StokOpnamePage.jsx. */
          <div className="space-y-3 lg:space-y-0 lg:columns-2 lg:gap-3">
            {sorted.map((b) => (
              <div key={b.id} className="lg:break-inside-avoid lg:mb-3">
                <BatchCard
                  batch={b}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                  onSync={handleSync}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <BatchFilterModal
          draft={draftFilter}
          onChange={setDraft}
          previewCount={previewCount}
          onApply={applyDraft}
          onReset={resetFilters}
          onClose={closeModal}
        />
      )}


      {/* ── Modal Form Tambah Batch ── */}
      {showForm && (
        <BatchModal
          title="Produk Baru & Batch"
          onClose={() => setShowForm(false)}
          onSave={async () => {
            invalidateStokBahan();
            setShowForm(false);
          }}
        />
      )}

      {/* ── Modal Edit Batch ── */}
      {editTarget && (
        <BatchModal
          title={`Edit Batch — ${editTarget.kode_produk}`}
          batch={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async () => {
            invalidateStokBahan();
            toast.success(
              `Batch ${editTarget.batch_no ?? editTarget.kode_produk ?? ""} berhasil diperbarui.`,
            );
            setEditTarget(null);
          }}
        />
      )}

      {/* ── Modal Hapus ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-skin-card border-2 border-red-500/40 p-6 w-full max-w-sm space-y-4">
            <p className="font-editorial text-sm tracking-[0.15em] uppercase text-red-400">
              Hapus Batch & Produk
            </p>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-skin-text">
                {deleteTarget.kode_produk} — {deleteTarget.nama_produk}
              </p>
              <p className="text-xs text-skin-text3">Tindakan ini akan menghapus permanen:</p>
              <ul className="text-xs text-skin-text3 space-y-0.5 pl-3 list-disc">
                <li>Semua catatan batch produksi untuk produk ini</li>
                <li>Data produk, template HPP, expected stok / buku potongan</li>
                <li>Stok aktual (semua lokasi)</li>
              </ul>
              <p className="text-xs text-red-400 pt-1 font-semibold">Tidak bisa dibatalkan.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProduksiLayout>
  );
}
