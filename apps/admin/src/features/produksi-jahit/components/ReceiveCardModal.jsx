import { useState } from "react";
import { cardWarnaLabel } from "../utils";

export default function ReceiveCardModal({ card, karyawanList, onConfirm, onClose, receiving }) {
  const [karyawanId, setKaryawanId] = useState(card.karyawan_id ?? "");
  const [jumlah, setJumlah] = useState(String(card.qty ?? ""));

  const jumlahNum = Number(jumlah) || 0;
  const beda = jumlahNum !== (Number(card.qty) || 0);

  function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId || jumlahNum <= 0) return;
    const karyawan = karyawanList.find((k) => k.id === karyawanId);
    onConfirm({ cardId: card.id, karyawanId, karyawanNama: karyawan?.nama ?? "", qty: jumlahNum });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-skin-card w-full max-w-sm h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl"
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
          <div>
            <h2 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">
              Terima Setoran Kartu
            </h2>
            <p className="text-[11px] text-skin-text3 mt-0.5">
              {card.kode_produk} · {card.size} · {cardWarnaLabel(card.warna)} · rencana {card.qty}{" "}
              pcs
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

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                className="w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-skin-accent transition"
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

          <div className="space-y-1">
            <label className="block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1">
              Jumlah Diterima (pcs)
            </label>
            <input
              type="number"
              min="0"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              className="w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-skin-accent transition"
            />
            {beda && (
              <p className="text-[11px] text-amber-500">
                ⚠ Beda dari rencana ({card.qty} pcs) — kartu akan disimpan dengan jumlah ini.
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-skin-bdr-lt px-4 py-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={receiving}
            className="flex-1 py-2.5 border border-skin-bdr text-xs font-editorial tracking-[0.12em] uppercase text-skin-text3 hover:text-skin-text transition disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={receiving || !karyawanId || jumlahNum <= 0}
            className="flex-[2] py-2.5 bg-skin-accent text-skin-on-accent text-xs font-editorial tracking-[0.15em] uppercase hover:bg-skin-accent-hover disabled:opacity-50 transition"
          >
            {receiving ? "Menyimpan..." : "Konfirmasi Terima"}
          </button>
        </div>
      </form>
    </div>
  );
}
