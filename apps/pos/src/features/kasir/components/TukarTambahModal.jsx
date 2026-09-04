/**
 * TukarTambahModal.jsx
 * Langkah 1 & 2 dari alur "Tukar Tambah" (permintaan Denny 2026-09: retur
 * barang lama + beli barang baru dalam SATU transaksi, total otomatis
 * bersih). Dibuka dari CartPanel/KasirPage.
 *
 * Langkah 1 (di sini): browse transaksi penjualan beberapa hari terakhir —
 * SENGAJA tanpa wajib nama pembeli (banyak transaksi walk-in dicatat tanpa
 * nama sama sekali, lihat BuyerInput.jsx), search opsional by kode/nama.
 * Langkah 2: begitu satu transaksi dipilih, reuse `ReturModal` (fitur
 * laporan, sudah di-export lintas fitur via index.js — lihat CLAUDE.md §7)
 * untuk memilih item & qty yang mau diretur — TIDAK menulis apa pun ke
 * server di sini, hanya mengumpulkan pilihan.
 *
 * Setelah retur dikonfirmasi, `onConfirm({ originalSale, items, total })`
 * dipanggil ke KasirPage — KasirPage menyimpan ini sbg "exchange" aktif.
 * Retur BENERAN diproses (createRetur) nanti saat kasir menekan Bayar,
 * bareng dgn transaksi baru — lihat useCheckout di ../hooks.js.
 */
import { useState, useMemo } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { formatTime } from "../../../shared/lib/salesUtils";
import { useSalesReport } from "../../penjualan";
import { ReturModal } from "../../laporan";

const PRESETS = [
  { key: "today", label: "Hari Ini" },
  { key: "week", label: "7 Hari" },
  { key: "month", label: "30 Hari" },
];

export default function TukarTambahModal({ onClose, onConfirm }) {
  const [preset, setPreset] = useState("week");
  const [search, setSearch] = useState("");
  const [pickedSale, setPickedSale] = useState(null);

  const { sales, loading } = useSalesReport(preset);

  // Hanya transaksi "sale" yang bisa jadi dasar retur — transaksi "retur"
  // itu sendiri tidak bisa diretur lagi.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (s.type === "retur") return false;
      if (!q) return true;
      const buyerMatch = (s.buyer_name ?? "").toLowerCase().includes(q);
      const kodeMatch = (s.items ?? []).some((i) => (i.kode ?? "").toLowerCase().includes(q));
      return buyerMatch || kodeMatch;
    });
  }, [sales, search]);

  function handleReturConfirm(items, total) {
    onConfirm({ originalSale: pickedSale, items, total });
  }

  // ── Langkah 2: pilih item retur dari transaksi yang sudah dipilih ──────────
  if (pickedSale) {
    return (
      <ReturModal
        sale={pickedSale}
        onClose={() => setPickedSale(null)}
        onConfirm={handleReturConfirm}
        saving={false}
      />
    );
  }

  // ── Langkah 1: browse & pilih transaksi ────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-4 py-4 border-b-2 border-skin-bdr flex-shrink-0">
          <div>
            <h2 className="text-xl text-skin-text">Tukar Tambah</h2>
            <p className="text-xs text-skin-text3 mt-1">
              Pilih transaksi lama yang mau diretur, lalu lanjut belanja baru
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-skin-text3 hover:text-skin-text text-2xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Filter tanggal + search */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 space-y-2 border-b border-skin-bdr-lt">
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={`flex-1 py-2 text-xs tracking-[0.08em] uppercase font-semibold border-2 transition ${
                  preset === p.key
                    ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                    : "border-skin-bdr text-skin-text3 hover:border-[#CAB170]/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pembeli atau kode barang (opsional)..."
            className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
          />
        </div>

        {/* Daftar transaksi */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && <p className="text-center text-sm text-skin-text3 py-10">Memuat transaksi...</p>}

          {!loading && filtered.length === 0 && (
            <p className="text-center text-sm text-skin-text4 py-10">
              Tidak ada transaksi ditemukan di rentang ini.
            </p>
          )}

          {!loading &&
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setPickedSale(s)}
                className="w-full text-left border border-skin-bdr hover:border-[#CAB170] transition px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-skin-text truncate">
                      {s.buyer_name || "Tanpa nama"}
                    </p>
                    <p className="text-xs text-skin-text3">
                      {formatTime(s.created_at)} · {LOCATION_LABELS[s.location] ?? s.location}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-skin-text flex-shrink-0">
                    Rp {formatHarga(s.total)}
                  </p>
                </div>
                <p className="text-xs text-skin-text4 mt-1 truncate">
                  {(s.items ?? [])
                    .map((i) => `${(i.kode ?? "").toUpperCase()} · ${i.size ?? ""}`)
                    .join(", ")}
                </p>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
