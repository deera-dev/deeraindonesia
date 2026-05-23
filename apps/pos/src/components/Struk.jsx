/**
 * Struk.jsx — Struk transaksi untuk printer Bluetooth thermal (hitam putih)
 *
 * Fitur:
 *  - Print via window.print (browser print dialog)
 *  - Print via Bluetooth TSPL v1 (hook useTsplPrinter)
 *  - Simpan PNG (html-to-image)
 *  - Share via Web Share API / WA
 *
 * Props:
 * - sale    : objek transaksi
 * - onClose : () => void
 *
 * SETUP LOGO:
 * Salin file logo ke apps/pos/public/logo-deera.png
 * (versi hitam/gelap pada latar putih / transparent, ≈ 400×120 px)
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";
import { useTsplPrinter, LABEL_TYPES } from "../hooks/useTsplPrinter";

const LS_LABEL_TYPE = "deera-label-type";

function getSavedLabelType() {
  try {
    return localStorage.getItem(LS_LABEL_TYPE) || "continuous";
  } catch {
    return "continuous";
  }
}
function saveLabelType(v) {
  try {
    localStorage.setItem(LS_LABEL_TYPE, v);
  } catch {}
}

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

// ── Logo struk — gambar dari /public ─────────────────────────────────────────

function LogoStruk() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
      }}
    >
      <img
        src="/logo.png"
        alt=""
        style={{ maxWidth: 36, height: 36, objectFit: "contain" }}
      />
      <img
        src="/logo-deera.png"
        alt="DEERA"
        style={{ maxWidth: 130, height: 32, objectFit: "contain" }}
      />
    </div>
  );
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

// ── Konten struk ─────────────────────────────────────────────────────────────

function StrukContent({ sale }) {
  const isRetur = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";
  const discount = sale.discount ?? 0;

  const subtotal = (sale.items ?? []).reduce(
    (s, item) => s + effectiveQty(item) * item.harga,
    0,
  );

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
            marginBottom: 6,
          }}
        >
          {isRetur ? "STRUK RETUR" : "STRUK PEMBELIAN"}
        </p>

        {/* Logo dengan React-state fallback */}
        <LogoStruk />
      </div>

      <Divider />

      {/* ── Info transaksi ── */}
      <div style={{ marginBottom: 8 }}>
        <MetaRow label="TANGGAL" value={formatDateTime(sale.created_at)} />

        {/* Pembeli — selalu ditampilkan, lebih menonjol */}
        <div
          style={{
            borderLeft: "3px solid #000",
            paddingLeft: 7,
            margin: "6px 0 5px",
          }}
        >
          <p
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#555",
              marginBottom: 2,
            }}
          >
            Pembeli
          </p>
          <p style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.3 }}>
            {sale.buyer_name?.toUpperCase() || "—"}
          </p>
          {sale.buyer_hp && (
            <p style={{ fontSize: 10, color: "#555", marginTop: 1 }}>
              {sale.buyer_hp}
            </p>
          )}
        </div>

        <MetaRow
          label="STAFF"
          value={sale.created_by_name?.toUpperCase() || "—"}
        />
        <MetaRow label="LOKASI" value={locLabel} />
      </div>

      <Divider dashed />

      {/* ── Items ── */}
      <div style={{ margin: "8px 0" }}>
        {(sale.items ?? []).map((item, idx) => {
          const qty = effectiveQty(item);
          const lineTotal = qty * item.harga;
          return (
            <div key={idx} style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>
                {item.kode?.toUpperCase()} — {item.size?.toUpperCase()}
              </p>
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

      {/* ── Subtotal + Diskon ── */}
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

      {/* ── Rekening ── */}
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

// ── Komponen utama ────────────────────────────────────────────────────────────

export default function Struk({ sale, onClose }) {
  const contentRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [btMsg, setBtMsg] = useState("");
  const [labelType, setLabelType] = useState(getSavedLabelType);

  const {
    printBle,
    busy: btBusy,
    error: btError,
    clearError,
  } = useTsplPrinter();

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
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `struk-deera-${sale.date ?? "today"}.png`;
      a.click();
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
      const fname = `struk-deera-${sale.date ?? "today"}.png`;
      const file = new File([blob], fname, { type: "image/png" });

      // Mobile: Web Share API dengan file (Android/iOS)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Struk Deera Indonesia",
        });
        return;
      }

      // Desktop fallback: download gambar + buka WA Web
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = fname;
      a.click();
      setTimeout(() => window.open("https://web.whatsapp.com", "_blank"), 400);
    } catch (err) {
      if (err.name !== "AbortError") alert("Gagal share: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleBtPrint() {
    clearError();
    setBtMsg("");
    const ok = await printBle(sale, labelType);
    if (ok) setBtMsg("✓ Terkirim ke printer");
  }


  function handleLabelTypeChange(v) {
    setLabelType(v);
    saveLabelType(v);
  }

  return (
    <>
      {/* Print styles */}
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
            width: 100mm !important;
            max-width: 100mm !important;
          }
        }
      `}</style>

      <div
        id="struk-overlay"
        className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/70 backdrop-blur-sm"
      >
        <div className="absolute inset-0" onClick={onClose} />

        <div
          id="struk-wrapper"
          className="relative bg-skin-card w-full max-w-xs mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-[#1A1918] px-4 py-3 flex items-center justify-between">
            <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
              {isRetur ? "Struk Retur" : "Struk Pembelian"}
            </span>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {/* Isi struk */}
          <div className="overflow-y-auto flex-1">
            <div ref={contentRef}>
              <StrukContent sale={sale} />
            </div>
          </div>

          {/* Status BT */}
          {(btError || btMsg) && (
            <div
              className={`flex-shrink-0 px-4 py-2 text-xs text-center leading-relaxed ${
                btError
                  ? "bg-red-50 text-red-700 border-t border-red-200"
                  : "bg-green-50 text-green-700 border-t border-green-200"
              }`}
            >
              {btError || btMsg}
            </div>
          )}

          {/* Pilihan jenis label — selalu terlihat */}
          <div className="flex-shrink-0 border-t border-skin-bdr-lt flex">
            {Object.entries(LABEL_TYPES).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => handleLabelTypeChange(key)}
                className={`flex-1 py-1.5 text-[10px] uppercase tracking-[0.06em] font-semibold transition ${
                  labelType === key
                    ? "text-[#CAB170] bg-[#CAB170]/10"
                    : "text-skin-text4 hover:text-skin-text3"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Tombol aksi — 3 kolom */}
          <div
            id="struk-actions"
            className="flex-shrink-0 border-t-2 border-skin-bdr grid grid-cols-3"
          >
            {/* Print TSPL BLE */}
            <button
              onClick={handleBtPrint}
              disabled={btBusy || busy}
              className="py-4 text-xs tracking-[0.06em] uppercase font-semibold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span className="text-lg leading-none">🖶</span>
              <span>{btBusy ? "..." : "Print"}</span>
            </button>

            {/* Simpan PNG */}
            <button
              onClick={handleDownload}
              disabled={busy}
              className="py-4 text-xs tracking-[0.06em] uppercase font-semibold text-white bg-[#6B6560] hover:bg-[#4A4540] transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span className="text-lg leading-none">⬇</span>
              <span>{busy ? "..." : "Simpan"}</span>
            </button>

            {/* WA Share */}
            <button
              onClick={handleShare}
              disabled={busy}
              className="py-4 text-xs tracking-[0.06em] uppercase font-semibold text-white bg-green-700 hover:bg-green-800 transition disabled:opacity-40 flex flex-col items-center gap-1"
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
