import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp } from "../../../shared/lib/format";
import { useDeleteFinishing, useFinishing } from "../hooks";
import TabHeader from "./TabHeader";
import TotalBar from "./TotalBar";
import FinishingForm from "./FinishingForm";
import FinishingStockModal from "./FinishingStockModal";

/** TabFinishing.jsx — Tab Finishing: satu entri per periode (gaji_finishing). */
export default function TabFinishing({ gajianId }) {
  const { record, loading } = useFinishing(gajianId);
  const deleteFinishing = useDeleteFinishing();
  const [showForm, setShowForm] = useState(false);
  // Dibuka otomatis setelah FinishingForm berhasil simpan (permintaan Denny
  // 2026-09) — { items, gajianFinishingId } dari FinishingForm.jsx onSave.
  //
  // BUGFIX 2026-09 (laporan bug Denny): SEBELUMNYA modal ini otomatis
  // terbuka lagi setiap kali entri Finishing di-EDIT (bukan cuma pertama
  // kali dibuat) — kartu Jahit yang jadi acuan breakdown size/warna SUDAH
  // ditandai "done" oleh rekonsiliasi pertama, jadi modal edit ke-2/3/dst
  // muncul kosong (0 kartu ditemukan) dan minta admin ketik ulang semua
  // baris dari nol → resiko nyata dobel-input & stok jadi salah. Sekarang
  // modal HANYA otomatis terbuka saat PERTAMA KALI entri dibuat (`record`
  // masih null/undefined SEBELUM disimpan, lihat handleSaveSuccess). Kalau
  // admin memang perlu rekonsiliasi ulang stok Gudang setelah edit (mis.
  // qty-nya nambah), disediakan tombol manual "Rekonsiliasi Stok" terpisah
  // di kartu entri (lihat tombol di bawah) — bukan otomatis lagi.
  const [reconcile, setReconcile] = useState(null);
  const isCreate = !record;

  async function handleDelete() {
    if (!confirm("Hapus data finishing?")) return;
    await deleteFinishing(record.id);
    toast.success("Data finishing dihapus.");
  }

  if (loading) return <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>;

  return (
    <div>
      <TabHeader title="Finishing" />
      <p className="font-editorial text-[11px] text-skin-text4 mb-3">1 entri per periode</p>

      {!record ? (
        <div className="text-center py-8">
          <p className="text-sm text-skin-text3 mb-3">Belum ada data finishing.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="font-editorial text-xs tracking-[0.12em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
          >
            + Input Finishing
          </button>
        </div>
      ) : (
        <div className="bg-skin-raised p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-editorial text-sm text-skin-text">{(record.items ?? []).length} produk</span>
            <span className="font-numeric text-sm font-semibold text-skin-text">{fmtRp(record.total_upah)}</span>
          </div>
          <div className="space-y-1 border-t border-skin-bdr-lt pt-2">
            {(record.items ?? []).map((it, i) => (
              <p key={i} className="font-editorial text-xs text-skin-text3">
                {it.nama_produk || `Produk ${i + 1}`} — {it.jumlah} pcs finishing
                {it.kancing_qty ? ` + ${it.kancing_qty} kancing` : ""}
                {it.pakai_lubang && it.lubang_qty ? ` + ${it.lubang_qty} lubang` : ""}
              </p>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(true)} className="text-xs font-editorial text-[#CAB170] hover:text-[#A8925A] transition">
              Edit
            </button>
            {/* Tombol manual (permintaan Denny 2026-09, lihat komentar
                `reconcile` di atas) — rekonsiliasi stok Gudang sekarang HANYA
                otomatis muncul saat pertama kali entri dibuat. Kalau admin
                perlu rekonsiliasi ulang setelah edit (mis. qty bertambah),
                buka manual lewat sini. */}
            <button
              type="button"
              onClick={() => {
                const relevantItems = (record.items ?? []).filter((it) => Number(it.jumlah) > 0);
                if (relevantItems.length > 0) setReconcile({ items: relevantItems, gajianFinishingId: record.id });
              }}
              className="text-xs font-editorial text-[#CAB170] hover:text-[#A8925A] transition"
            >
              Rekonsiliasi Stok
            </button>
            <button type="button" onClick={handleDelete} className="text-xs font-editorial text-red-400">
              Hapus
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <FinishingForm
          gajianId={gajianId}
          initial={record}
          onClose={() => setShowForm(false)}
          onSave={({ items, gajianFinishingId }) => {
            setShowForm(false);
            // BUGFIX 2026-09: rekonsiliasi otomatis HANYA saat pertama kali
            // entri ini dibuat (isCreate, ditentukan dari state `record`
            // SEBELUM save ini) — saat edit, admin pakai tombol manual
            // "Rekonsiliasi Stok" di atas kalau memang perlu.
            if (!isCreate) return;
            // Hanya kode dengan jumlah > 0 yang relevan direkonsiliasi.
            const relevantItems = (items ?? []).filter((it) => Number(it.jumlah) > 0);
            if (relevantItems.length > 0) setReconcile({ items: relevantItems, gajianFinishingId });
          }}
        />
      )}

      {reconcile && (
        <FinishingStockModal
          items={reconcile.items}
          gajianFinishingId={reconcile.gajianFinishingId}
          onClose={() => setReconcile(null)}
        />
      )}
    </div>
  );
}
