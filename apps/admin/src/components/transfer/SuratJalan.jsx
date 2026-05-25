/**
 * SuratJalan.jsx
 * Surat jalan transfer stok — desain professional.
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

const STATUS_CONFIG = {
  pending:  { bg: "#FFF8E6", border: "#D4AF37", text: "#7A5C1E", label: "MENUNGGU APPROVAL" },
  approved: { bg: "#E8F5E9", border: "#66BB6A", text: "#1B5E20", label: "DISETUJUI" },
  rejected: { bg: "#FFEBEE", border: "#EF9A9A", text: "#B71C1C", label: "DITOLAK" },
};

function SuratJalanContent({ transfer }) {
  const fromLabel = LOCATION_LABELS[transfer.from_location] ?? transfer.from_location;
  const toLabel   = LOCATION_LABELS[transfer.to_location]   ?? transfer.to_location;
  const items     = transfer.items ?? [];
  const totalQty  = items.reduce((s, i) => s + (i.qty ?? 0), 0);
  const sc = STATUS_CONFIG[transfer.status] ?? { bg: "#F5F5F5", border: "#CCC", text: "#333", label: transfer.status };

  // Group items by kode
  const groups = {};
  for (const item of items) {
    if (!groups[item.kode]) groups[item.kode] = [];
    groups[item.kode].push(item);
  }
  const groupEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 12, color: "#1a1a1a", background: "#fff", padding: "32px 40px", maxWidth: 640 }}>

      {/* ── KOP SURAT ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: "3px solid #a8925a", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: 4, color: "#a8925a", fontFamily: "Georgia, serif" }}>DEERA</div>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "#888", marginTop: 2 }}>INDONESIA</div>
          <div style={{ fontSize: 9, color: "#aaa", marginTop: 6, letterSpacing: 0.5 }}>WA: {STORE_INFO.wa}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 3, textTransform: "uppercase", color: "#1a1a1a" }}>SURAT JALAN</div>
          <div style={{ fontSize: 12, fontWeight: "bold", color: "#a8925a", marginTop: 3, letterSpacing: 1 }}>{transfer.transfer_no}</div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{formatDate(transfer.created_at)}</div>
        </div>
      </div>

      {/* ── STATUS ── */}
      <div style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, color: sc.text, padding: "6px 14px", fontWeight: 700, fontSize: 10, letterSpacing: "0.15em", textAlign: "center", textTransform: "uppercase", marginBottom: 18 }}>
        {sc.label}
      </div>

      {/* ── INFO TRANSFER ── */}
      <div style={{ display: "flex", gap: 0, border: "1px solid #ddd", marginBottom: 20 }}>
        <div style={{ flex: 1, padding: "12px 16px" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#a8925a", fontWeight: "bold", marginBottom: 5 }}>Dari</div>
          <div style={{ fontSize: 15, fontWeight: "bold" }}>{fromLabel}</div>
        </div>
        <div style={{ width: 1, background: "#ddd" }} />
        <div style={{ flex: 1, padding: "12px 16px" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#a8925a", fontWeight: "bold", marginBottom: 5 }}>Tujuan</div>
          <div style={{ fontSize: 15, fontWeight: "bold" }}>{toLabel}</div>
        </div>
        <div style={{ width: 1, background: "#ddd" }} />
        <div style={{ flex: 1, padding: "12px 16px" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#a8925a", fontWeight: "bold", marginBottom: 5 }}>Dibuat Oleh</div>
          <div style={{ fontWeight: 600, textTransform: "uppercase" }}>{transfer.created_by_name ?? transfer.created_by ?? "-"}</div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{formatDateTime(transfer.created_at)}</div>
        </div>
      </div>

      {/* ── CATATAN ── */}
      {transfer.notes && (
        <div style={{ background: "#faf9f7", borderLeft: "3px solid #ddd", padding: "9px 14px", marginBottom: 18, fontSize: 11, color: "#555" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#a8925a", fontWeight: "bold", marginBottom: 4 }}>Keterangan</div>
          {transfer.notes}
        </div>
      )}

      {/* ── TABEL BARANG ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: 11.5 }}>
        <thead>
          <tr style={{ background: "#a8925a", color: "#fff" }}>
            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, letterSpacing: 0.5 }}>Kode / Ukuran</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, letterSpacing: 0.5 }}>Warna</th>
            <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, letterSpacing: 0.5 }}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {groupEntries.map(([kode, kodeItems]) => {
            const kodeTotal = kodeItems.reduce((s, i) => s + (i.qty ?? 0), 0);
            return (
              <>
                <tr key={`hdr-${kode}`} style={{ background: "#f5f0e8", borderTop: "1.5px solid #ddd", borderBottom: "1px solid #ddd" }}>
                  <td colSpan={2} style={{ padding: "7px 10px", fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>{kode}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "#888", fontSize: 11 }}>{kodeTotal} pcs</td>
                </tr>
                {kodeItems.map((item, idx) => (
                  <tr key={`${kode}-${idx}`} style={{ borderBottom: "1px solid #eee", background: "#fff" }}>
                    <td style={{ padding: "6px 10px 6px 20px", color: "#444", textTransform: "uppercase" }}>{item.size}</td>
                    <td style={{ padding: "6px 10px", color: "#666", textTransform: "uppercase" }}>{item.warna && item.warna !== "_" ? item.warna : "—"}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, fontSize: 13 }}>{item.qty}</td>
                  </tr>
                ))}
              </>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "#1a1a1a", color: "#fff" }}>
            <td colSpan={2} style={{ padding: "9px 10px", fontWeight: 700, fontSize: 11, letterSpacing: "0.12em" }}>TOTAL</td>
            <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 900, fontSize: 17 }}>{totalQty}</td>
          </tr>
        </tfoot>
      </table>

      {/* ── APPROVAL INFO ── */}
      {transfer.status === "approved" && transfer.approved_by && (
        <div style={{ background: "#e8f5e9", border: "1.5px solid #66bb6a", padding: "10px 14px", marginBottom: 18, fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: "#1b5e20", marginBottom: 2 }}>✓ Disetujui</div>
          <div style={{ color: "#555" }}>
            Oleh: <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{transfer.approved_by.replace("@deera.id", "")}</span>
            {" · "}{formatDateTime(transfer.approved_at)}
          </div>
        </div>
      )}

      {/* ── TANDA TANGAN ── */}
      <div style={{ display: "flex", gap: 32, marginTop: 48 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#888", marginBottom: 60 }}>Pengirim</div>
          <div style={{ borderTop: "1px solid #333", paddingTop: 6 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, textTransform: "uppercase" }}>{transfer.created_by_name ?? ""}</div>
            <div style={{ fontSize: 10, color: "#666" }}>({fromLabel})</div>
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#888", marginBottom: 60 }}>Penerima</div>
          <div style={{ borderTop: "1px solid #333", paddingTop: 6 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, textTransform: "uppercase" }}>
              {transfer.approved_by ? transfer.approved_by.replace("@deera.id", "") : ""}
            </div>
            <div style={{ fontSize: 10, color: "#666" }}>({toLabel})</div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ marginTop: 32, borderTop: "1px solid #eee", paddingTop: 10, textAlign: "center", fontSize: 9, color: "#aaa", letterSpacing: 1 }}>
        DEERA INDONESIA · Dokumen ini digenerate otomatis · {transfer.transfer_no}
      </div>
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export default function SuratJalan({ transfer, onClose }) {
  const contentRef = useRef(null);
  const [busy, setBusy] = useState(false);

  if (!transfer) return null;

  const fname = `surat-jalan-${transfer.transfer_no}.png`;

  async function capturePng() {
    if (!contentRef.current) return null;
    return toPng(contentRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const dataUrl = await capturePng();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = fname;
      a.click();
    } catch (e) {
      console.error("Download gagal:", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    setBusy(true);
    try {
      const dataUrl = await capturePng();
      const byteStr = atob(dataUrl.split(",")[1]);
      const arr = new Uint8Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
      const blob = new Blob([arr], { type: "image/png" });
      const file = new File([blob], fname, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Surat Jalan ${transfer.transfer_no}`,
          text: `Surat Jalan DEERA\n${transfer.transfer_no}\nDari: ${LOCATION_LABELS[transfer.from_location]} → ${LOCATION_LABELS[transfer.to_location]}\nTotal: ${(transfer.items ?? []).reduce((s, i) => s + i.qty, 0)} pcs`,
        });
      } else {
        // Desktop fallback: download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = fname;
        a.click();
      }
    } catch (err) {
      if (err.name !== "AbortError") console.error("Share gagal:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg mx-auto shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-[#1a1a1a] px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">Surat Jalan</span>
            <span className="ml-2 text-xs text-[#CAB170] font-mono">{transfer.transfer_no}</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition text-xl leading-none">✕</button>
        </div>

        {/* Konten dokumen */}
        <div className="overflow-y-auto flex-1">
          <div ref={contentRef}>
            <SuratJalanContent transfer={transfer} />
          </div>
        </div>

        {/* Tombol aksi */}
        <div className="flex-shrink-0 border-t-2 border-skin-bdr flex">
          <button
            onClick={onClose}
            className="py-4 px-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text3 hover:text-skin-text transition border-r border-skin-bdr"
          >
            Tutup
          </button>
          <button
            onClick={handleDownload}
            disabled={busy}
            className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-[#CAB170] border-r border-skin-bdr hover:bg-[#CAB170]/10 transition disabled:opacity-40 flex flex-col items-center gap-0.5"
          >
            <span className="text-base">↓</span>
            <span className="text-xs">{busy ? "..." : "Unduh"}</span>
          </button>
          <button
            onClick={handleShare}
            disabled={busy}
            className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40 flex flex-col items-center gap-0.5"
          >
            <span className="text-base">↑</span>
            <span className="text-xs">{busy ? "..." : "Bagikan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
