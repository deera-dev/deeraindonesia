/**
 * SuratJalan.jsx
 * Tampilan surat jalan yang bisa di-print atau di-share via WA.
 *
 * Props:
 * - transfer : objek transfer dari Supabase
 * - onClose  : () => void
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SuratJalanContent({ transfer }) {
  const fromLabel =
    LOCATION_LABELS[transfer.from_location] ?? transfer.from_location;
  const toLabel = LOCATION_LABELS[transfer.to_location] ?? transfer.to_location;
  const items = transfer.items ?? [];
  const totalQty = items.reduce((s, item) => s + (item.qty ?? 0), 0);

  const statusColor = {
    pending: {
      bg: "#FFF8E6",
      border: "#EDD9A3",
      text: "#7A5C1E",
      label: "MENUNGGU APPROVAL",
    },
    approved: {
      bg: "#E8F5E9",
      border: "#81C784",
      text: "#2E7D32",
      label: "DISETUJUI",
    },
    rejected: {
      bg: "#FFEBEE",
      border: "#EF9A9A",
      text: "#C62828",
      label: "DITOLAK",
    },
  }[transfer.status] ?? {
    bg: "#F5F5F5",
    border: "#CCC",
    text: "#333",
    label: transfer.status,
  };

  return (
    <div
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 12,
        lineHeight: 1.6,
        color: "#000",
        background: "#fff",
        padding: "24px",
        width: "100%",
        maxWidth: 600,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          {/* Logo / nama toko */}
          <img
            src="/logo-deera.png"
            alt="DEERA"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "block";
            }}
            style={{ height: 40, marginBottom: 4, objectFit: "contain" }}
          />
          <p
            style={{
              display: "none",
              fontSize: 22,
              fontWeight: 900,
              margin: "0 0 4px",
            }}
          >
            DEERA
          </p>
          <p style={{ fontSize: 10, color: "#666", margin: 0 }}>Indonesia</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              margin: "0 0 4px",
              letterSpacing: "0.05em",
            }}
          >
            SURAT JALAN
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#CAB170",
              margin: "0 0 2px",
            }}
          >
            {transfer.transfer_no}
          </p>
          <p style={{ fontSize: 10, color: "#666", margin: 0 }}>
            {formatDate(transfer.created_at)}
          </p>
        </div>
      </div>

      {/* ── Status badge ── */}
      <div
        style={{
          background: statusColor.bg,
          border: `1.5px solid ${statusColor.border}`,
          color: statusColor.text,
          padding: "6px 12px",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: "0.1em",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        {statusColor.label}
      </div>

      {/* ── Info transfer ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          background: "#F9F7F4",
          border: "1.5px solid #E8E3DC",
          padding: 14,
          marginBottom: 16,
          fontSize: 12,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#888",
              margin: "0 0 3px",
            }}
          >
            Dari
          </p>
          <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>
            {fromLabel}
          </p>
        </div>
        <div>
          <p
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#888",
              margin: "0 0 3px",
            }}
          >
            Tujuan
          </p>
          <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{toLabel}</p>
        </div>
        <div>
          <p
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#888",
              margin: "0 0 3px",
            }}
          >
            Dibuat oleh
          </p>
          <p style={{ fontWeight: 600, margin: 0, textTransform: "uppercase" }}>
            {transfer.created_by_name ?? transfer.created_by ?? "-"}
          </p>
        </div>
        <div>
          <p
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#888",
              margin: "0 0 3px",
            }}
          >
            Waktu
          </p>
          <p style={{ fontWeight: 600, margin: 0 }}>
            {formatDateTime(transfer.created_at)}
          </p>
        </div>
        {transfer.notes && (
          <div style={{ gridColumn: "1 / -1" }}>
            <p
              style={{
                fontSize: 9,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#888",
                margin: "0 0 3px",
              }}
            >
              Keterangan
            </p>
            <p style={{ margin: 0 }}>{transfer.notes}</p>
          </div>
        )}
      </div>

      {/* ── Tabel barang — dikelompokkan per kode ── */}
      {(() => {
        // Group items by kode
        const groups = {};
        for (const item of items) {
          if (!groups[item.kode]) groups[item.kode] = [];
          groups[item.kode].push(item);
        }
        const groupEntries = Object.entries(groups).sort(([a], [b]) =>
          a.localeCompare(b),
        );

        return (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: "#1A1918", color: "#fff" }}>
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    fontSize: 10,
                  }}
                >
                  Kode / Ukuran
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    fontSize: 10,
                  }}
                >
                  Warna
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "right",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    fontSize: 10,
                  }}
                >
                  Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {groupEntries.map(([kode, kodeItems]) => {
                const kodeTotal = kodeItems.reduce(
                  (s, i) => s + (i.qty ?? 0),
                  0,
                );
                return (
                  <>
                    {/* Kode header row */}
                    <tr
                      key={`hdr-${kode}`}
                      style={{
                        background: "#F2EDE6",
                        borderTop: "1.5px solid #E8E3DC",
                        borderBottom: "1px solid #E8E3DC",
                      }}
                    >
                      <td
                        colSpan={2}
                        style={{
                          padding: "7px 10px",
                          fontWeight: 800,
                          fontSize: 12,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {kode}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#888",
                          fontSize: 11,
                        }}
                      >
                        {kodeTotal} pcs
                      </td>
                    </tr>
                    {/* Size + warna rows */}
                    {kodeItems.map((item, idx) => (
                      <tr
                        key={`${kode}-${idx}`}
                        style={{
                          borderBottom: "1px solid #F0EBE3",
                          background: "#fff",
                        }}
                      >
                        <td
                          style={{
                            padding: "6px 10px 6px 20px",
                            color: "#444",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.size}
                        </td>
                        <td
                          style={{
                            padding: "6px 10px",
                            color: "#666",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.warna || "—"}
                        </td>
                        <td
                          style={{
                            padding: "6px 10px",
                            textAlign: "right",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {item.qty}
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#1A1918", color: "#fff" }}>
                <td
                  colSpan={2}
                  style={{
                    padding: "8px 10px",
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.1em",
                  }}
                >
                  TOTAL
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    textAlign: "right",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  {totalQty}
                </td>
              </tr>
            </tfoot>
          </table>
        );
      })()}

      {/* ── Approval info ── */}
      {transfer.status === "approved" && transfer.approved_by && (
        <div
          style={{
            background: "#E8F5E9",
            border: "1.5px solid #81C784",
            padding: 12,
            marginBottom: 16,
            fontSize: 11,
          }}
        >
          <p style={{ margin: "0 0 2px", fontWeight: 700, color: "#2E7D32" }}>
            ✓ Disetujui
          </p>
          <p style={{ margin: 0, color: "#555" }}>
            Oleh: {transfer.approved_by} ·{" "}
            {formatDateTime(transfer.approved_at)}
          </p>
        </div>
      )}

      {/* ── TTD Section ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginTop: 20,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#666",
              margin: "0 0 40px",
            }}
          >
            Pengirim
          </p>
          <div style={{ borderTop: "1.5px solid #000", paddingTop: 6 }}>
            <p style={{ fontSize: 10, margin: 0, textTransform: "uppercase" }}>
              {transfer.created_by_name ?? ""}
            </p>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#666",
              margin: "0 0 40px",
            }}
          >
            Penerima
          </p>
          <div style={{ borderTop: "1.5px solid #000", paddingTop: 6 }}>
            <p style={{ fontSize: 10, margin: 0, textTransform: "uppercase" }}>
              {transfer.approved_by.replace("@deera.id", "") ?? ""}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          fontSize: 9,
          color: "#999",
          marginTop: 20,
          letterSpacing: "0.08em",
        }}
      >
        <p style={{ margin: 0 }}>DEERA Indonesia · WA: {STORE_INFO.wa}</p>
        <p style={{ margin: 0 }}>
          Dokumen ini digenerate otomatis · {transfer.transfer_no}
        </p>
      </div>
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export default function SuratJalan({ transfer, onClose }) {
  const contentRef = useRef(null);
  const [busy, setBusy] = useState(false);

  if (!transfer) return null;

  async function captureImage() {
    if (!contentRef.current) return null;
    return toPng(contentRef.current, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
  }

  async function handleShare() {
    setBusy(true);
    try {
      const dataUrl = await captureImage();

      // Konversi data URL ke Blob tanpa fetch (lebih reliable di semua browser)
      const byteStr = atob(dataUrl.split(",")[1]);
      const arr = new Uint8Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
      const blob = new Blob([arr], { type: "image/png" });

      const fname = `surat-jalan-${transfer.transfer_no}.png`;
      const file = new File([blob], fname, { type: "image/png" });

      // Mobile: Web Share API dengan file
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Surat Jalan ${transfer.transfer_no}`,
          text: `Surat Jalan DEERA\n${transfer.transfer_no}\nDari: ${LOCATION_LABELS[transfer.from_location]} → ${LOCATION_LABELS[transfer.to_location]}\nTotal: ${(transfer.items ?? []).reduce((s, i) => s + i.qty, 0)} pcs`,
        });
      } else {
        // Desktop fallback: download + buka WA Web
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fname;
        link.click();
        setTimeout(
          () => window.open("https://web.whatsapp.com", "_blank"),
          400,
        );
      }
    } catch (err) {
      if (err.name !== "AbortError")
        alert("Gagal share: " + (err?.message || String(err)));
    }
    setBusy(false);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #sj-overlay { display: block !important; }
          #sj-overlay > * { display: block !important; }
          #sj-actions { display: none !important; }
          #sj-wrapper { position: static !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: none !important; }
        }
      `}</style>

      <div
        id="sj-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      >
        <div className="absolute inset-0" onClick={onClose} />

        <div
          id="sj-wrapper"
          className="relative bg-white w-full max-w-lg mx-auto shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-[#1A1918] px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
                Surat Jalan
              </span>
              <span className="ml-2 text-xs text-[#CAB170] font-mono">
                {transfer.transfer_no}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {/* Konten */}
          <div className="overflow-y-auto flex-1">
            <div ref={contentRef}>
              <SuratJalanContent transfer={transfer} />
            </div>
          </div>

          {/* Tombol */}
          <div
            id="sj-actions"
            className="flex-shrink-0 border-t-2 border-skin-bdr grid grid-cols-2"
          >
            <button
              onClick={handlePrint}
              className="py-4 text-sm tracking-[0.08em] uppercase font-semibold text-white bg-[#1A1918] hover:bg-[#333] transition flex flex-col items-center gap-1"
            >
              <span className="text-lg">🖨</span>
              <span>Print</span>
            </button>
            <button
              onClick={handleShare}
              disabled={busy}
              className="py-4 text-sm tracking-[0.08em] uppercase font-semibold text-white bg-green-700 hover:bg-green-800 transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span className="text-lg">↗</span>
              <span>{busy ? "..." : "Share / WA"}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
