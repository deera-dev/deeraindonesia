/**
 * HargaDasarPanel.jsx — Konten tab "Harga Dasar".
 *
 * Redesign lengkap (lihat UX_REDESIGN_TEMPLATE_HPP_HARGA_DASAR.md Bagian B):
 * halaman ini adalah Pengaturan dengan field TETAP (13 key seed, hanya bisa
 * di-UPDATE, tidak pernah di-INSERT lewat UI) — bukan daftar CRUD bebas.
 * Sengaja TIDAK ada tombol "+ Tambah" dan TIDAK ada search bar (13 item,
 * sudah dikelompokkan 4 kategori, selalu muat tanpa scroll panjang).
 *
 * Baris read-only by default; tap baris → Bottom Sheet edit (ConfigEditSheet).
 */
import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { groupConfigRows } from "../utils";
import ConfigGroupHeader from "./ConfigGroupHeader";
import ConfigRow from "./ConfigRow";
import ConfigEditSheet from "./ConfigEditSheet";

export default function HargaDasarPanel({ rows, loading, error, onSave, userEmail, onRetry }) {
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(row, nilai) {
    setSaving(true);
    try {
      await onSave(row.key, nilai, userEmail);
      toast.success(`${row.label} disimpan.`);
      setEditingRow(null);
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan Harga Dasar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>;
  }

  if (error) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-sm text-skin-text3">Gagal memuat Harga Dasar.</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 font-editorial text-xs tracking-[0.15em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition"
          >
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  const groups = groupConfigRows(rows);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-skin-text3 text-center py-8">
        Konfigurasi belum tersedia. Hubungi tim teknis untuk menyiapkan Harga Dasar.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs text-skin-text3 mb-4">
        Harga Dasar adalah acuan biaya per potong yang otomatis mengisi Template HPP baru.
        Bukan harga final — tetap bisa disesuaikan per Template.
      </p>

      {groups.map((group) => (
        <div key={group.label}>
          <ConfigGroupHeader label={group.label} />
          <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
            {group.rows.map((row) => (
              <ConfigRow key={row.key} row={row} onOpenEdit={setEditingRow} />
            ))}
          </div>
        </div>
      ))}

      {editingRow && (
        <ConfigEditSheet
          row={editingRow}
          saving={saving}
          onClose={() => setEditingRow(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
