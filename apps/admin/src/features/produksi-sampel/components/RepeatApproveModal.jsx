/**
 * RepeatApproveModal.jsx — konfirmasi "Pakai Sampel Lama": planning Repeat
 * langsung disetujui tanpa membuat/upload sampel baru (permintaan Denny
 * 2026-10-08). Kalau ada perubahan di repeatan, tutup modal ini lalu pakai
 * tombol ✓ (Tandai Sudah Dibuat) untuk membuat sampel ulang.
 * Konfirmasi memakai modal sendiri (bukan window.confirm — konteks PWA).
 */
import { useState } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";

export default function RepeatApproveModal({ sampel, fotos, onConfirm, onClose, saving }) {
  const [catatan, setCatatan] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.15em] uppercase text-skin-text">
            Approve Repeat
          </h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-skin-text3 hover:text-skin-text">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-skin-text">
            <strong>{sampel.nama}</strong> mengikuti produk{" "}
            <span className="font-mono text-[#CAB170]">{sampel.repeat_dari_kode ?? "jadi"}</span>.
            Tidak perlu membuat sampel baru — foto produk jadi dipakai untuk Work Order.
          </p>
          {fotos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {fotos.slice(0, 3).map((u) => (
                <img
                  key={u}
                  src={cldUrl(u, { width: 160, height: 210, crop: "fill" })}
                  alt=""
                  className="w-20 h-28 object-cover border border-skin-bdr"
                />
              ))}
            </div>
          )}
          <div>
            <label className="block font-editorial text-xs tracking-[0.15em] text-skin-text2 mb-1 uppercase">
              Catatan (opsional)
            </label>
            <textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Kosongkan kalau sama persis dengan sampel lama."
              className="w-full px-3 py-2 bg-skin-raised border border-skin-bdr text-sm text-skin-text placeholder:text-skin-text4 focus:outline-none focus:border-[#CAB170] resize-none"
            />
          </div>
          <p className="text-[11px] text-skin-text3">
            Ada perubahan model? Tutup ini, lalu tekan ✓ untuk membuat sampel ulang.
          </p>
        </div>
        <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 border border-skin-bdr text-xs font-editorial tracking-[0.12em] uppercase text-skin-text3 hover:text-skin-text disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(catatan.trim())}
            disabled={saving}
            className="flex-[2] py-2.5 bg-[#CAB170] text-white text-xs font-editorial tracking-[0.15em] uppercase hover:bg-[#A8925A] disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Approve Repeat"}
          </button>
        </div>
      </div>
    </div>
  );
}
