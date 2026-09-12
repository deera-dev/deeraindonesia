/**
 * AssignModal.jsx — pilih penjahit (karyawan tim="jahit", aktif) untuk satu
 * kartu. Konfirmasi Denny 2026-09: assign langsung memindahkan kartu ke
 * kolom On Progress (1 aksi, bukan assign+pindah terpisah) — ditangani oleh
 * assignKaryawan() di ../api.js, modal ini murni UI pilih penjahitnya.
 */
import { useState } from "react";
import { cardWarnaLabel } from "../utils";

export default function AssignModal({ card, karyawanList, onAssign, onClose, assigning }) {
  const [karyawanId, setKaryawanId] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) return;
    const karyawan = karyawanList.find((k) => k.id === karyawanId);
    onAssign({ cardId: card.id, karyawanId, karyawanNama: karyawan?.nama ?? "" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-skin-card w-full max-w-sm h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl"
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
          <div>
            <h2 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">
              Assign Penjahit
            </h2>
            <p className="text-[11px] text-skin-text3 mt-0.5">
              {card.kode_produk} · {card.size} · {cardWarnaLabel(card.warna)} · {card.qty} pcs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-xl leading-none transition"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1">
              Penjahit
            </label>
            {karyawanList.length === 0 ? (
              <p className="text-xs text-skin-text3">
                Belum ada karyawan tim Jahit yang aktif. Tambahkan dulu di Finance &rarr; Karyawan.
              </p>
            ) : (
              <select
                value={karyawanId}
                onChange={(e) => setKaryawanId(e.target.value)}
                className="w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
              >
                <option value="">— Pilih penjahit —</option>
                {karyawanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-skin-bdr-lt px-4 py-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={assigning}
            className="flex-1 py-2.5 border border-skin-bdr text-xs font-editorial tracking-[0.12em] uppercase text-skin-text3 hover:text-skin-text transition disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={assigning || !karyawanId}
            className="flex-[2] py-2.5 bg-[#CAB170] text-white text-xs font-editorial tracking-[0.15em] uppercase hover:bg-[#A8925A] disabled:opacity-50 transition"
          >
            {assigning ? "Menyimpan..." : "Assign & Pindah ke On Progress"}
          </button>
        </div>
      </form>
    </div>
  );
}
