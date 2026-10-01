/**
 * CalonCustomerFormModal.jsx — Tambah/edit satu calon customer (nama, no HP,
 * catatan). Dibuka dari CalonCustomerPage ATAU dari BlastCreateModal
 * (features/blast) saat admin mau tambah prospek baru langsung dari alur
 * pemilihan target blast — makanya modal ini menerima `onSaved(row)` supaya
 * pemanggil bisa langsung auto-select kontak yang baru dibuat.
 *
 * REVISI (Oktober 2026 — Denny: "terus calon customer bisa ambil dari
 * kontak yang ada di handphone juga"): tombol "Ambil dari Kontak HP" pakai
 * Contact Picker API browser (`navigator.contacts.select`) — HANYA tampil
 * kalau browser mendukung (Android Chrome; TIDAK ada di iOS Safari/desktop
 * sama sekali, jadi feature-detected, bukan selalu ditampilkan). Isi nama
 * & no HP otomatis dari kontak yang dipilih user, tetap bisa diedit manual
 * setelahnya sebelum simpan.
 */
import { useEffect, useState } from "react";
import { useCreateCalonCustomerMutation, useUpdateCalonCustomerMutation } from "../hooks";

function contactPickerSupported() {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    typeof window !== "undefined" &&
    "ContactsManager" in window
  );
}

export default function CalonCustomerFormModal({ initial = null, onClose, onSaved }) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [noHp, setNoHp] = useState(initial?.no_hp ?? "");
  const [catatan, setCatatan] = useState(initial?.catatan ?? "");
  const [error, setError] = useState("");
  const [canPickContact, setCanPickContact] = useState(false);

  const createMutation = useCreateCalonCustomerMutation();
  const updateMutation = useUpdateCalonCustomerMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    setCanPickContact(contactPickerSupported());
  }, []);

  async function handlePickContact() {
    try {
      const [contact] = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (!contact) return; // user membatalkan picker
      if (contact.name?.[0]) setNama(contact.name[0]);
      if (contact.tel?.[0]) setNoHp(contact.tel[0]);
    } catch {
      // user membatalkan / browser menolak izin — diam-diam, bukan error ke user
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    setError("");
    try {
      const patch = { nama, no_hp: noHp, catatan };
      const row = initial
        ? await updateMutation.mutateAsync({ id: initial.id, patch })
        : await createMutation.mutateAsync(patch);
      onSaved?.(row);
      onClose();
    } catch (err) {
      setError(err.message ?? "Gagal menyimpan.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={saving ? undefined : onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-skin-card w-full max-w-md h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">
            {initial ? "Edit Calon Customer" : "Tambah Calon Customer"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {canPickContact && !initial && (
            <button
              type="button"
              onClick={handlePickContact}
              className="w-full py-2.5 font-editorial text-xs tracking-[0.15em] uppercase border-2 border-[#CAB170] text-[#CAB170] hover:bg-[#CAB170]/10 transition"
            >
              Ambil dari Kontak HP
            </button>
          )}
          <div>
            <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
              Nama *
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
              placeholder="Nama calon customer"
            />
          </div>
          <div>
            <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
              No. HP
            </label>
            <input
              type="text"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
              Catatan
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition resize-none"
              placeholder="Mis. sumber kontak, minat produk, dll (opsional)"
            />
          </div>
          {error && <p className="text-xs text-red-500 font-editorial">{error}</p>}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
