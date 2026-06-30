/**
 * Modal.jsx — Modal container generik (header + flex body) dipakai semua
 * form tim di fitur Gajian, plus ModalFooter (baris aksi Batal/Simpan).
 */

/** Modal container dengan header + flex body */
export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col h-[95dvh]">
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2 truncate pr-2">{title}</h2>
          <button onClick={onClose} className="shrink-0 text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Baris actions di footer modal */
export function ModalFooter({ onCancel, saving, saveLabel = "Simpan" }) {
  return (
    <div className="shrink-0 border-t border-skin-bdr px-4 pt-3 pb-4 flex gap-2">
      <button type="button" onClick={onCancel} disabled={saving}
        className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50 transition">
        Batal
      </button>
      <button type="submit" disabled={saving}
        className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50">
        {saving ? "Menyimpan..." : saveLabel}
      </button>
    </div>
  );
}
