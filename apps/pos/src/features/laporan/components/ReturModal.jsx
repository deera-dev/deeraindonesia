/**
 * ReturModal.jsx
 * Modal partial retur — kasir memilih item & qty yang dikembalikan pembeli.
 * Stok otomatis dikembalikan ke lokasi asal setelah dikonfirmasi.
 *
 * Props:
 * - sale      : transaksi asal
 * - onClose   : () => void
 * - onConfirm : (payloadItems, returTotal) => void
 * - saving    : boolean
 */
import { useState } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { effectiveQty } from "../../../shared/lib/salesUtils";

export default function ReturModal({ sale, onClose, onConfirm, saving }) {
  // Inisialisasi state retur dari item transaksi asal
  const [returItems, setReturItems] = useState(() =>
    (sale.items ?? []).map((item) =>
      item.warna?.length > 0
        ? { ...item, warna: item.warna.map((w) => ({ ...w, returQty: 0 })) }
        : { ...item, returQty: 0 },
    ),
  );

  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";

  // Bug dilaporkan Denny 2026-09: "transaksi si TEST tertulis 140.000,
  // padahal ada diskon 40.000 jadi totalnya cuma 100.000 — tapi pas retur
  // nilainya masih dihitung 140.000, ini bisa bikin toko rugi." `item.harga`
  // di `sale.items` SELALU harga KOTOR sebelum diskon (diskon disimpan
  // terpisah di `sale.discount`, lihat Subtotal vs Total di struk) — retur
  // WAJIB dihitung dari harga BERSIH yang sungguh-sungguh diterima toko,
  // bukan harga kotor, kalau tidak toko mengembalikan/mengkredit lebih
  // besar dari yang pernah masuk. Diskon di sini flat per-transaksi (bukan
  // per-item), jadi dialokasikan proporsional lewat satu rasio yang sama
  // ke semua item — persis prinsip yang sama dipakai di bepUtils.js utk
  // retur (sign -1) supaya margin & omset tidak dobel salah hitung.
  const originalSubtotal = (sale.items ?? []).reduce(
    (s, item) => s + effectiveQty(item) * (item.harga ?? 0),
    0,
  );
  const discountRatio =
    originalSubtotal > 0 ? Math.min(1, (sale.discount ?? 0) / originalSubtotal) : 0;

  // Helpers
  function clamp(val, max) {
    return Math.max(0, Math.min(max, Number(val) || 0));
  }

  function setWarnaQty(itemIdx, warnaIdx, val) {
    setReturItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIdx) return item;
        return {
          ...item,
          warna: item.warna.map((w, j) =>
            j !== warnaIdx ? w : { ...w, returQty: clamp(val, w.qty) },
          ),
        };
      }),
    );
  }

  function setSimpleQty(itemIdx, val) {
    setReturItems((prev) =>
      prev.map((item, i) =>
        i !== itemIdx ? item : { ...item, returQty: clamp(val, item.qty ?? 0) },
      ),
    );
  }

  // Payload — hanya item dengan qty > 0 (harga MASIH kotor di sini)
  const rawPayloadItems = returItems.flatMap((item) => {
    if (item.warna) {
      const warnaFiltered = item.warna
        .filter((w) => w.returQty > 0)
        .map((w) => ({ nama: w.nama, qty: w.returQty }));
      return warnaFiltered.length ? [{ ...item, warna: warnaFiltered }] : [];
    }
    return (item.returQty ?? 0) > 0 ? [{ ...item, qty: item.returQty }] : [];
  });

  // Konversi ke harga BERSIH (proporsi diskon transaksi asal) di sini, SEBELUM
  // dikirim ke onConfirm — supaya struk (StrukContent.jsx), margin BEP
  // (bepUtils.js, sign -1 utk retur), dan breakdown Laporan Keuangan yang
  // semuanya membaca `item.harga` apa adanya dari data retur ini otomatis
  // konsisten, tanpa perlu masing-masing tahu soal discountRatio lagi.
  const payloadItems = rawPayloadItems.map((item) => ({
    ...item,
    harga: Math.round((item.harga ?? 0) * (1 - discountRatio)),
  }));

  const returTotal = payloadItems.reduce((s, item) => {
    const qty = item.warna ? item.warna.reduce((ss, w) => ss + w.qty, 0) : (item.qty ?? 0);
    return s + qty * item.harga;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      {/* h-[100dvh] md:h-auto WAJIB dipasangkan dgn max-h-[X] (CLAUDE.md §14
          "Komponen Modal") — tanpa ini modal cuma sebesar konten & duduk di
          bawah layar mobile, menyisakan backdrop blur kosong di atasnya
          (bug yg dilaporkan Denny 2026-09: "modal retur tidak terisi full"). */}
      <div className="relative bg-skin-card w-full max-w-sm h-[100dvh] md:h-auto md:max-h-[90dvh] border-t-2 md:border-2 border-skin-bdr shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-skin-bdr flex-shrink-0 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl text-skin-text">Retur Barang</h3>
            <p className="text-sm text-skin-text2 mt-1">
              Stok kembali ke <strong className="text-skin-text">{locLabel}</strong> · Pilih qty
              yang dikembalikan
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center text-skin-text3 hover:text-skin-text text-2xl flex-shrink-0 disabled:opacity-40"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Daftar item dengan qty control */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {returItems.map((item, itemIdx) => (
            <div key={itemIdx} className="border border-skin-bdr p-4">
              <p className="text-base font-semibold text-skin-text">
                {item.kode} — {item.size}
              </p>
              <p className="text-sm text-skin-text2 mb-3">@ Rp {formatHarga(item.harga)}</p>

              {item.warna ? (
                <div className="space-y-3">
                  {item.warna.map((w, warnaIdx) => (
                    <div key={warnaIdx} className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-base text-skin-text font-medium">{w.nama}</span>
                        <span className="text-sm text-skin-text3 ml-2">(maks {w.qty})</span>
                      </div>
                      <QtyControl
                        value={w.returQty}
                        max={w.qty}
                        onChange={(val) => setWarnaQty(itemIdx, warnaIdx, val)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-base text-skin-text">Qty</span>
                    <span className="text-sm text-skin-text3 ml-2">(maks {item.qty ?? 0})</span>
                  </div>
                  <QtyControl
                    value={item.returQty}
                    max={item.qty ?? 0}
                    onChange={(val) => setSimpleQty(itemIdx, val)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer: total + konfirmasi */}
        <div className="border-t-2 border-skin-bdr px-5 py-4 flex-shrink-0 space-y-3">
          {payloadItems.length > 0 && (
            <div>
              <div className="flex justify-between items-baseline">
                <span className="text-base text-skin-text2">Total retur</span>
                <span className="text-xl font-semibold text-orange-500">
                  Rp {formatHarga(returTotal)}
                </span>
              </div>
              {/* Permintaan Denny 2026-09: kasir sempat bingung kenapa nilai
                  retur < harga per item yg tertulis di atas — jelaskan bahwa
                  itu krn diskon transaksi asal sudah diperhitungkan, BUKAN
                  salah hitung. */}
              {discountRatio > 0 && (
                <p className="text-xs text-skin-text3 mt-1">
                  Sudah dikurangi proporsi diskon transaksi asal (Rp{" "}
                  {formatHarga(sale.discount)}) — bukan harga penuh Rp{" "}
                  {formatHarga(
                    rawPayloadItems.reduce((s, item) => {
                      const qty = item.warna
                        ? item.warna.reduce((ss, w) => ss + w.qty, 0)
                        : (item.qty ?? 0);
                      return s + qty * item.harga;
                    }, 0),
                  )}
                  .
                </p>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => payloadItems.length > 0 && onConfirm(payloadItems, returTotal)}
              disabled={!payloadItems.length || saving}
              className="flex-1 py-5 bg-orange-500 text-white text-base tracking-[0.12em] uppercase hover:bg-orange-600 transition disabled:opacity-40 font-semibold"
            >
              {saving ? "Memproses..." : "Konfirmasi Retur"}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-5 border-2 border-skin-bdr text-base text-skin-text2 uppercase hover:border-[#1A1918] transition disabled:opacity-40"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Qty stepper ──────────────────────────────────────────────────────────────
function QtyControl({ value, max, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        className="w-11 h-11 border-2 border-skin-bdr text-xl text-skin-text2 hover:bg-skin-page disabled:opacity-30 flex items-center justify-center"
        aria-label="Kurangi"
      >
        −
      </button>
      <span className="w-8 text-center text-lg font-bold text-skin-text">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="w-11 h-11 border-2 border-skin-bdr text-xl text-skin-text2 hover:bg-skin-page disabled:opacity-30 flex items-center justify-center"
        aria-label="Tambah"
      >
        +
      </button>
    </div>
  );
}
