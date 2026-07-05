/**
 * SuratJalanPinjamModal.jsx — Modal preview + download/share surat jalan pinjam bahan.
 * Capture ke PNG menggunakan html-to-image.
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { fmtRp, fmtDate } from "../utils";

export default function SuratJalanPinjamModal({ items, onClose }) {
  const printRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const rep = items[0] ?? {};
  const totalKeseluruhan = items.reduce((s, i) => s + (Number(i.total_harga) || 0), 0);
  const nomorSurat = `SJ-${(rep.tanggal ?? "").replace(/-/g, "")}-${String(rep.id ?? "")
    .slice(-4)
    .toUpperCase()}`;

  async function capturePng() {
    const el = printRef.current;
    if (!el) return null;
    return toPng(el, { cacheBust: true, pixelRatio: 2.5, backgroundColor: "#ffffff", width: 600 });
  }

  async function handleDownload() {
    setSharing(true);
    try {
      const dataUrl = await capturePng();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${nomorSurat}.png`;
      a.click();
    } catch (e) {
      console.error("Download gagal:", e);
    } finally {
      setSharing(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const dataUrl = await capturePng();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${nomorSurat}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: nomorSurat });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${nomorSurat}.png`;
        a.click();
      }
    } catch (e) {
      if (e?.name !== "AbortError") console.error("Share gagal:", e);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-xl h-[100dvh] md:h-auto md:max-h-[92dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            Surat Jalan Pinjam Bahan
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text transition text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto">
        <div className="overflow-x-auto bg-white">
          <div
            ref={printRef}
            style={{
              fontFamily: "Georgia, serif",
              color: "#1a1a1a",
              fontSize: "13px",
              width: "600px",
              padding: "32px 36px",
              boxSizing: "border-box",
              backgroundColor: "#ffffff",
            }}
          >
            {/* Kop */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                paddingBottom: "14px",
                borderBottom: "3px solid #a8925a",
                marginBottom: "18px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    letterSpacing: "3px",
                    color: "#a8925a",
                  }}
                >
                  DEERA
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: "#888",
                    marginTop: "3px",
                  }}
                >
                  Graceful Elegance
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                  }}
                >
                  Surat Jalan
                </div>
                <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
                  Pinjam Bahan
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#a8925a",
                    marginTop: "2px",
                    fontWeight: "600",
                  }}
                >
                  {nomorSurat}
                </div>
              </div>
            </div>

            {/* Pihak */}
            <div style={{ display: "flex", border: "1px solid #ddd", marginBottom: "18px" }}>
              <div style={{ flex: 1, padding: "12px 16px" }}>
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: "#a8925a",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  Pemberi
                </div>
                <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                  {(rep.nama_pemberi || "—").toUpperCase()}
                </div>
                <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                  Tanggal: {fmtDate(rep.tanggal)}
                </div>
              </div>
              <div style={{ flex: 1, padding: "12px 16px", borderLeft: "1px solid #ddd" }}>
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: "#a8925a",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  Penerima
                </div>
                <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                  {(rep.nama_peminjam || "—").toUpperCase()}
                </div>
              </div>
            </div>

            {/* Tabel */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "14px",
                fontSize: "11.5px",
              }}
            >
              <thead>
                <tr style={{ background: "#a8925a", color: "#fff" }}>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: "32px" }}>No</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Nama Bahan</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Jumlah</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Harga</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id ?? i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "9px 10px", textAlign: "center", color: "#888" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <div style={{ fontWeight: "600" }}>{it.nama_bahan?.toUpperCase()}</div>
                      {it.kode_bahan && (
                        <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
                          {it.kode_bahan}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "center" }}>
                      {Number(it.jumlah)}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right" }}>
                      {fmtRp(it.harga_satuan)}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: "600" }}>
                      {fmtRp(it.total_harga)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
              <div
                style={{ border: "2px solid #a8925a", padding: "10px 20px", textAlign: "right" }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                    color: "#888",
                  }}
                >
                  Total Keseluruhan
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#a8925a",
                    marginTop: "2px",
                  }}
                >
                  {fmtRp(totalKeseluruhan)}
                </div>
              </div>
            </div>

            {/* Catatan */}
            {rep.catatan && (
              <div
                style={{
                  background: "#faf9f7",
                  borderLeft: "3px solid #ddd",
                  padding: "10px 14px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                    color: "#a8925a",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  Catatan
                </div>
                <div style={{ fontSize: "11px", color: "#555" }}>{rep.catatan}</div>
              </div>
            )}

            {/* Tanda tangan */}
            <div style={{ display: "flex", gap: "32px", marginTop: "56px" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: "#888",
                    marginBottom: "60px",
                  }}
                >
                  Pemberi
                </div>
                <div style={{ borderTop: "1px solid #333", paddingTop: "6px" }}>
                  <div style={{ fontWeight: "bold" }}>
                    {(rep.nama_pemberi || "—").toUpperCase()}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    color: "#888",
                    marginBottom: "60px",
                  }}
                >
                  Penerima
                </div>
                <div style={{ borderTop: "1px solid #333", paddingTop: "6px" }}>
                  <div style={{ fontWeight: "bold" }}>
                    {(rep.nama_peminjam || "—").toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: "32px",
                borderTop: "1px solid #eee",
                paddingTop: "10px",
                textAlign: "center",
                fontSize: "9px",
                color: "#aaa",
                letterSpacing: "1px",
              }}
            >
              DEERA INDONESIA · Dokumen ini sah tanpa tanda tangan basah apabila ditandatangani
              secara digital
            </div>
          </div>
        </div>

        </div>

        {/* Tombol */}
        <div className="flex-shrink-0 p-4 border-t border-skin-bdr-lt flex gap-2">
          <button
            onClick={onClose}
            className="py-2.5 px-4 font-editorial text-xs tracking-[0.2em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
          >
            Tutup
          </button>
          <button
            onClick={handleDownload}
            disabled={sharing}
            className="flex-1 py-2.5 font-editorial text-xs tracking-[0.2em] uppercase border-2 border-[#CAB170] text-[#CAB170] hover:bg-[#CAB170] hover:text-white transition disabled:opacity-50"
          >
            {sharing ? "..." : "↓ Unduh"}
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 py-2.5 font-editorial text-xs tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
          >
            {sharing ? "..." : "↑ Bagikan"}
          </button>
        </div>
      </div>
    </div>
  );
}
