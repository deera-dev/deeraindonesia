/**
 * CalonCustomerList.jsx — isi (search + list + modal tambah/edit/hapus)
 * fitur Calon Customer, DIPISAH dari CalonCustomerPage.jsx (permintaan
 * Denny 2026-10: "pelanggan dan calon digabungin aja jadi 1 halaman, bisa
 * dipisah dengan tab") supaya bisa dipakai DUA tempat tanpa duplikasi:
 *   1. CalonCustomerPage.jsx — halaman standalone lama (`/calon-customer`,
 *      TIDAK dihapus, tapi sudah tidak diiklankan di nav lagi — lihat
 *      AdminBottomNav.jsx NAV_ITEMS).
 *   2. features/pelanggan/components/PelangganPage.jsx — tab "Calon" di
 *      halaman Pelanggan yang sudah digabung, SUMBER KEBENARAN baru.
 */
import { useMemo, useState } from "react";
import {
  useCalonCustomerListQuery,
  useDeleteCalonCustomerMutation,
} from "../hooks";
import CalonCustomerFormModal from "./CalonCustomerFormModal";

export default function CalonCustomerList() {
  const { data: list = [], isLoading } = useCalonCustomerListQuery();
  const deleteMutation = useDeleteCalonCustomerMutation();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) => c.nama.toLowerCase().includes(q) || (c.no_hp ?? "").toLowerCase().includes(q),
    );
  }, [list, search]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau no HP..."
          className="flex-1 bg-skin-card border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
        />
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="px-4 py-2.5 font-editorial text-sm tracking-[0.1em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition whitespace-nowrap"
        >
          + Tambah
        </button>
      </div>

      {isLoading && <p className="text-sm text-skin-text4 py-8 text-center">Memuat...</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-skin-text4 py-8 text-center">
          Belum ada calon customer. Tambahkan lewat tombol "+ Tambah".
        </p>
      )}

      <div className="divide-y divide-skin-bdr-lt border border-skin-bdr-lt bg-skin-card">
        {filtered.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-skin-text truncate">{c.nama}</p>
              <p className="text-xs text-skin-text3 truncate">{c.no_hp || "- no HP -"}</p>
              {c.catatan && <p className="text-xs text-skin-text4 truncate mt-0.5">{c.catatan}</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                setEditing(c);
                setFormOpen(true);
              }}
              className="text-xs font-editorial tracking-[0.08em] uppercase text-[#CAB170] hover:text-[#A8925A] underline flex-shrink-0"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(c)}
              className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 hover:text-red-500 underline flex-shrink-0"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>

      {formOpen && (
        <CalonCustomerFormModal
          initial={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-skin-card border-2 border-skin-bdr max-w-sm w-full p-5">
            <p className="text-sm text-skin-text">
              Hapus calon customer <strong>{confirmDelete.nama}</strong>?
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteMutation.mutateAsync(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="flex-1 py-2.5 font-editorial text-xs tracking-[0.15em] uppercase text-white bg-red-500 hover:bg-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
