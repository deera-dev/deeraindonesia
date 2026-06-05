/**
 * ProduksiRecord.jsx — Halaman catatan batch produksi & pembuatan produk baru.
 *
 * Flow:
 * 1. Buat produk baru (pilih ukuran, tanpa harga jual dulu)
 * 2. Input qty produksi per size×warna → disimpan ke expected_stok (buku potongan)
 * 3. HPP otomatis dari hpp_template jika sudah dibuat
 * 4. Harga jual & foto diisi nanti di halaman Admin → Edit Produk
 * 5. Stok aktual diisi nanti di Stok Opname
 *
 * Form & Card → components/produksi/record/
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { invalidateProducts } from "@deera/shared/hooks/useProducts";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../components/produksi/ProduksiLayout";
import { logHistory } from "../hooks/useHistory";
import { toast } from "@deera/shared/lib/toast";
import BatchForm from "../components/produksi/record/BatchForm";
import BatchCard from "../components/produksi/record/BatchCard";

function BatchModal({ title, batch, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[95dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text transition text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <BatchForm
            initial={batch}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProduksiRecord() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("produksi_batch")
      .select("*")
      .order("kode_produk", { ascending: false });
    setBatches(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const kode = deleteTarget.kode_produk;
    setDeleting(true);
    try {
      await supabase.from("produksi_batch").delete().eq("kode_produk", kode);
      await supabase.from("expected_stok").delete().eq("kode", kode);
      await supabase.from("hpp_template").delete().eq("kode_produk", kode);
      await supabase.from("stok_warna").delete().eq("kode", kode);
      await supabase.from("products").delete().eq("kode", kode);
      invalidateProducts();
      logHistory({
        action: "hapus",
        category: "produk",
        kode,
        nama: deleteTarget.nama_produk ?? kode,
        snapshot: { kode, sumber: "produksi" },
      }).catch(() => {});
      toast.success(`${deleteTarget.nama_produk ?? kode} berhasil dihapus.`);
      setDeleteTarget(null);
      loadBatches();
    } catch (e) {
      toast.error("Gagal hapus: " + e.message);
    } finally {
      setDeleting(false);
    }
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
      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-skin-text3 text-center py-8">Belum ada catatan produksi.</p>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => (
            <BatchCard
              key={b.id}
              batch={b}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <BackToTop bottomClass="bottom-24" />

      {/* ── Modal Form Tambah Batch ── */}
      {showForm && (
        <BatchModal
          title="Produk Baru & Batch"
          onClose={() => setShowForm(false)}
          onSave={async () => {
            setShowForm(false);
            await loadBatches();
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
            toast.success(`Batch ${editTarget.batch_no ?? editTarget.kode_produk ?? ""} berhasil diperbarui.`);
            setEditTarget(null);
            await loadBatches();
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