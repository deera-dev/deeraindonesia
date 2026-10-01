/**
 * BlastTemplatePicker.jsx — daftar template pesan Blast (permintaan Denny
 * 2026-10: "bisa menulis beberapa template pesan, nanti lihatin aja list
 * template pesannya ... bisa di edit dan ditambah juga"). Klik satu
 * template → isi textarea pesan di BlastCreateForm (TIDAK mengubah
 * template itu sendiri — campaign menyimpan SALINAN teksnya sendiri).
 * "+ Template Baru" dan ikon edit/hapus per baris mengelola
 * blast_message_template langsung dari sini, tanpa halaman terpisah.
 */
import { useState } from "react";
import {
  useMessageTemplatesQuery,
  useCreateMessageTemplateMutation,
  useUpdateMessageTemplateMutation,
  useDeleteMessageTemplateMutation,
} from "../hooks";

export default function BlastTemplatePicker({ onPick }) {
  const { data: templates = [], isLoading } = useMessageTemplatesQuery();
  const createMutation = useCreateMessageTemplateMutation();
  const updateMutation = useUpdateMessageTemplateMutation();
  const deleteMutation = useDeleteMessageTemplateMutation();

  const [editing, setEditing] = useState(null); // null | "new" | template row
  const [formNama, setFormNama] = useState("");
  const [formPesan, setFormPesan] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState("");

  function openNew() {
    setFormNama("");
    setFormPesan("");
    setError("");
    setEditing("new");
  }

  function openEdit(tpl) {
    setFormNama(tpl.nama);
    setFormPesan(tpl.pesan);
    setError("");
    setEditing(tpl);
  }

  async function handleSaveForm() {
    try {
      if (editing === "new") {
        await createMutation.mutateAsync({ nama: formNama, pesan: formPesan });
      } else {
        await updateMutation.mutateAsync({ id: editing.id, patch: { nama: formNama, pesan: formPesan } });
      }
      setEditing(null);
    } catch (err) {
      setError(err.message ?? "Gagal menyimpan template.");
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3">
          Template Pesan
        </p>
        <button
          type="button"
          onClick={openNew}
          className="text-xs font-editorial tracking-[0.08em] uppercase text-[#CAB170] hover:text-[#A8925A] underline"
        >
          + Template Baru
        </button>
      </div>

      {isLoading && <p className="text-xs text-skin-text4">Memuat template...</p>}

      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex items-center gap-2 border border-skin-bdr-lt px-3 py-2 hover:border-[#CAB170] transition"
          >
            <button
              type="button"
              onClick={() => onPick(tpl.pesan)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-sm text-skin-text font-semibold truncate">{tpl.nama}</p>
              <p className="text-xs text-skin-text4 truncate">{tpl.pesan.replace(/\n/g, " ")}</p>
            </button>
            <button
              type="button"
              onClick={() => openEdit(tpl)}
              className="flex-shrink-0 text-xs text-skin-text3 hover:text-[#CAB170] underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(tpl)}
              className="flex-shrink-0 text-xs text-skin-text3 hover:text-red-500 underline"
            >
              Hapus
            </button>
          </div>
        ))}
        {!isLoading && templates.length === 0 && (
          <p className="text-xs text-skin-text4 py-2">Belum ada template. Buat lewat "+ Template Baru".</p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={saving ? undefined : () => setEditing(null)} />
          <div className="relative bg-skin-card w-full max-w-md h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
              <h3 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">
                {editing === "new" ? "Template Baru" : "Edit Template"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center disabled:opacity-40"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                  Nama Template
                </label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Mis. Follow-up Belum Direspon"
                  className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                  Isi Pesan
                </label>
                <textarea
                  value={formPesan}
                  onChange={(e) => setFormPesan(e.target.value)}
                  rows={10}
                  className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition font-mono"
                />
              </div>
              {error && <p className="text-xs text-red-500 font-editorial">{error}</p>}
            </div>
            <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                disabled={saving}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-skin-card border-2 border-skin-bdr max-w-sm w-full p-5">
            <p className="text-sm text-skin-text">
              Hapus template <strong>{confirmDelete.nama}</strong>?
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
