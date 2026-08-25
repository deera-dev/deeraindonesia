/**
 * DaftarPenerimaModal.jsx
 * Daftar penerima dgn data LENGKAP (nama + no. HP + alamat + ekspedisi
 * terakhir dipakai) — permintaan Denny 2026-08 "ada button lagi disamping
 * +Pengiriman ... DAFTAR PENERIMA yang isinya HANYA pelanggan yang datanya
 * sudah lengkap". Sumbernya tabel `pelanggan` yang sama dipakai autocomplete
 * di PengirimanForm (lihat isPenerimaLengkap() di ../utils.js).
 *
 * Klik satu penerima → onPick(pelanggan), dipakai PengirimanTab utk buka
 * PengirimanForm baru dgn prefillPelanggan (bukan mode edit).
 *
 * Props:
 * - onPick  : (pelanggan) => void
 * - onClose : () => void
 */
import { useMemo, useState } from "react";
import { usePelangganList } from "../../pelanggan";
import { isPenerimaLengkap } from "../utils";

export default function DaftarPenerimaModal({ onPick, onClose }) {
  const { pelanggan, loading } = usePelangganList();
  const [query, setQuery] = useState("");

  const daftarLengkap = useMemo(() => {
    const lengkap = (pelanggan ?? []).filter(isPenerimaLengkap);
    const q = query.trim().toLowerCase();
    if (!q) return lengkap;
    return lengkap.filter((p) =>
      [p.nama, p.no_hp, p.ekspedisi_biasa].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [pelanggan, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div>
            <h2 className="font-headline text-[#CAB170] text-lg">Daftar Penerima</h2>
            <p className="text-[11px] text-skin-text4 mt-0.5">
              Penerima dengan nama, no. HP, alamat & ekspedisi lengkap
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Cari */}
        <div className="px-4 py-3 border-b border-skin-bdr-lt flex-shrink-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, no. HP, atau ekspedisi..."
            className="w-full border border-skin-bdr bg-skin-page text-skin-text px-3 py-2.5 text-sm focus:outline-none focus:border-[#CAB170]"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="text-center text-sm text-skin-text3 py-12">Memuat data...</p>
          )}

          {!loading && daftarLengkap.length === 0 && (
            <p className="text-center text-sm text-skin-text4 py-12 px-6">
              Belum ada penerima dengan data lengkap (nama, no. HP, alamat, dan ekspedisi).
            </p>
          )}

          {daftarLengkap.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              className="w-full text-left px-4 py-3 hover:bg-skin-gold border-b border-skin-bdr-lt transition"
            >
              <p className="text-sm font-semibold text-skin-text uppercase">{p.nama}</p>
              <p className="text-xs text-skin-text3 mt-0.5 uppercase">
                {p.no_hp} · {p.ekspedisi_biasa}
              </p>
              <p className="text-xs text-skin-text4 mt-0.5 uppercase truncate">{p.alamat}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
