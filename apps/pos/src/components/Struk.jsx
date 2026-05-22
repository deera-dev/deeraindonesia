/**
 * Struk.jsx — Struk transaksi untuk printer Bluetooth thermal (hitam putih)
 *
 * Desain: monospace, pure B&W, tidak ada warna — sesuai kemampuan thermal printer.
 * Fitur: print (window.print), simpan PNG, share via Web Share API (WA).
 *
 * Props:
 * - sale     : objek transaksi (items, total, discount, buyer_name, dll)
 * - onClose  : () => void
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function effectiveQty(item) {
  return item.warna
    ? item.warna.reduce((s, w) => s + w.qty, 0)
    : (item.qty ?? 0);
}

// ── Sub-komponen helper ───────────────────────────────────────────────────────

function Divider({ dashed = false }) {
  return (
    <div
      style={{
        borderTop: dashed ? "1px dashed #000" : "2px solid #000",
        margin: "8px 0",
      }}
    />
  );
}

function MetaRow({ label, value, bold = false }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        fontSize: 11,
        marginBottom: 3,
        lineHeight: 1.4,
      }}
    >
      <span style={{ width: 52, flexShrink: 0, color: "#555" }}>{label}</span>
      <span style={{ color: "#555" }}>:</span>
      <span style={{ fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}

// ── Konten struk (dipakai untuk print + export gambar) ───────────────────────

function StrukContent({ sale }) {
  const isRetur = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";
  const discount = sale.discount ?? 0;

  // Subtotal dihitung dari items (sebelum diskon)
  const subtotal = (sale.items ?? []).reduce((s, item) => {
    return s + effectiveQty(item) * item.harga;
  }, 0);

  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.5,
        color: "#000",
        background: "#fff",
        padding: "14px 14px 18px",
        width: "100%",
      }}
    >
      {/* ── Header toko ── */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <p
          style={{
            fontSize: 9,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {isRetur ? "STRUK RETUR" : "STRUK PEMBELIAN"}
        </p>
        <p
          style={{
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: "0.02em",
            margin: "0",
          }}
          className="font-headline"
        >
          DEERA
        </p>
        <p
          style={{
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#333",
          }}
        >
          {STORE_INFO.tagline}
        </p>
      </div>

      <Divider />

      {/* ── Info transaksi ── */}
      <div style={{ marginBottom: 8 }}>
        <MetaRow label="Tgl" value={formatDateTime(sale.created_at)} />
        {sale.buyer_name && (
          <MetaRow label="Pembeli" value={sale.buyer_name} bold />
        )}
        {sale.buyer_hp && <MetaRow label="No HP" value={sale.buyer_hp} />}
        {sale.created_by_name && (
          <MetaRow label="Kasir" value={sale.created_by_name} />
        )}
        <MetaRow label="Lokasi" value={locLabel} />
      </div>

      <Divider dashed />

      {/* ── Item transaksi — tanpa rincian warna ── */}
      <div style={{ margin: "8px 0" }}>
        {(sale.items ?? []).map((item, idx) => {
          const qty = effectiveQty(item);
          const lineTotal = qty * item.harga;
          return (
            <div key={idx} style={{ marginBottom: 8 }}>
              {/* Kode & ukuran */}
              <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>
                {item.kode} — {item.size}
              </p>
              {/* Qty × harga = total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  paddingLeft: 6,
                }}
              >
                <span>
                  {qty} pcs × Rp {formatHarga(item.harga)}
                </span>
                <span style={{ fontWeight: 600 }}>
                  Rp {formatHarga(lineTotal)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <Divider dashed />

      {/* ── Subtotal + Diskon (hanya tampil jika ada diskon) ── */}
      {discount > 0 && (
        <div style={{ margin: "8px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              marginBottom: 3,
            }}
          >
            <span>Subtotal</span>
            <span>Rp {formatHarga(subtotal)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              marginBottom: 3,
            }}
          >
            <span>Diskon</span>
            <span>- Rp {formatHarga(discount)}</span>
          </div>
          <Divider />
        </div>
      )}

      {/* ── Total ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 900,
          fontSize: 16,
          margin: "6px 0 10px",
        }}
      >
        <span>{isRetur ? "TOTAL RETUR" : "TOTAL"}</span>
        <span>Rp {formatHarga(sale.total)}</span>
      </div>

      <Divider />

      {/* ── Info rekening ── */}
      <div style={{ margin: "10px 0 8px", fontSize: 10 }}>
        {STORE_INFO.rekening.map((r, i) => (
          <div key={i} style={{ marginBottom: 7 }}>
            <p style={{ color: "#444" }}>Transfer {r.bank}:</p>
            <p
              style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.04em" }}
            >
              {r.no}
            </p>
            <p style={{ color: "#444" }}>a.n. {r.atas_nama}</p>
          </div>
        ))}
      </div>

      <Divider dashed />

      {/* ── Footer ── */}
      <div
        style={{
          textAlign: "center",
          fontSize: 10,
          marginTop: 8,
          color: "#333",
        }}
      >
        <p>WA: {STORE_INFO.wa}</p>
        <p style={{ marginTop: 2 }}>{STORE_INFO.website}</p>
        <p style={{ marginTop: 8, fontWeight: 700, letterSpacing: "0.05em" }}>
          {isRetur
            ? "Terima kasih atas retur Anda"
            : "Terima kasih telah berbelanja!"}
        </p>
      </div>
    </div>
  );
}

// ── Komponen utama Struk ──────────────────────────────────────────────────────

export default function Struk({ sale, onClose }) {
  const contentRef = useRef(null);
  const [busy, setBusy] = useState(false);

  if (!sale) return null;
  const isRetur = sale.type === "retur";

  function handlePrint() {
    window.print();
  }

  async function captureImage() {
    if (!contentRef.current) return null;
    return toPng(contentRef.current, {
      quality: 1,
      pixelRatio: 3,
      backgroundColor: "#ffffff",
    });
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const dataUrl = await captureImage();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `struk-deera-${sale.date ?? "today"}.png`;
      link.click();
    } catch (err) {
      alert("Gagal export: " + err.message);
    }
    setBusy(false);
  }

  async function handleShare() {
    setBusy(true);
    try {
      const dataUrl = await captureImage();
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const file = new File([blob], `struk-deera-${sale.date ?? "today"}.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Struk Deera Indonesia",
        });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = file.name;
        link.click();
      }
    } catch (err) {
      if (err.name !== "AbortError") alert("Gagal share: " + err.message);
    }
    setBusy(false);
  }

  return (
    <>
      {/* Print styles: sembunyikan semua kecuali struk */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #struk-overlay { display: block !important; }
          #struk-overlay > * { display: block !important; }
          #struk-actions { display: none !important; }
          #struk-wrapper {
            position: static !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 80mm !important;
            width: 80mm !important;
          }
        }
      `}</style>

      <div
        id="struk-overlay"
        className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/70 backdrop-blur-sm"
      >
        {/* Backdrop close */}
        <div className="absolute inset-0" onClick={onClose} />

        <div
          id="struk-wrapper"
          className="relative bg-white w-full max-w-xs mx-auto border-t-2 md:border-2 border-[#E8E3DC] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
        >
          {/* Label header modal */}
          <div className="flex-shrink-0 bg-[#1A1918] px-4 py-3 flex items-center justify-between">
            <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
              {isRetur ? "Struk Retur" : "Struk Pembelian"}
            </span>
            <button
              onClick={onClose}
              className="text-[#9C9690] hover:text-white transition text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {/* Isi struk — scrollable, dipakai juga untuk export */}
          <div className="overflow-y-auto flex-1">
            <div ref={contentRef}>
              <StrukContent sale={sale} />
            </div>
          </div>

          {/* Tombol aksi */}
          <div
            id="struk-actions"
            className="flex-shrink-0 border-t-2 border-[#E8E3DC] grid grid-cols-3"
          >
            <button
              onClick={handlePrint}
              className="py-4 text-sm tracking-[0.08em] uppercase font-semibold text-white bg-[#1A1918] hover:bg-[#333] transition flex flex-col items-center gap-1"
            >
              <span className="text-lg leading-none">🖨</span>
              <span>Print</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={busy}
              className="py-4 text-sm tracking-[0.08em] uppercase font-semibold text-white bg-[#6B6560] hover:bg-[#4A4540] transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span className="text-lg leading-none">⬇</span>
              <span>{busy ? "..." : "Simpan"}</span>
            </button>
            <button
              onClick={handleShare}
              disabled={busy}
              className="py-4 text-sm tracking-[0.08em] uppercase font-semibold text-white bg-green-700 hover:bg-green-800 transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span className="text-lg leading-none">↗</span>
              <span>WA</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
