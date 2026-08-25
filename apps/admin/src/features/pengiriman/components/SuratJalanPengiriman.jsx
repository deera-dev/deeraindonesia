/**
 * SuratJalanPengiriman.jsx
 * Surat jalan pengiriman ke ekspedisi — berbentuk GAMBAR (PNG), ukuran
 * mengikuti lebar struk (78mm/100mm, permintaan Denny 2026-08 "berbentuk
 * image, ukurannya sama seperti struk versi A, bisa 78 dan 100") — desain
 * mengikuti gaya "Versi A" (StrukContent.jsx di POS): logo + teks polos
 * rapi, BUKAN dokumen A4 seperti SuratJalan.jsx milik Transfer Stok.
 *
 * Props:
 * - pengiriman : objek pengiriman dari Supabase
 * - onClose    : () => void
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import ScaleToFitPreview from "@deera/shared/components/ScaleToFitPreview";
import { PAPER_WIDTHS_MM, mmToPx, fmtDate, fmtDateTime } from "../utils";

const DEFAULT_PAPER_WIDTH = "78";

function Row({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p
        style={{
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#888",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      {/* textTransform uppercase = lapisan kedua (permintaan Denny 2026-08
          "semua bagian uppercase, dari input sampai jadi image") — data baru
          sudah tersimpan uppercase dari PengirimanForm, ini jaga record LAMA
          yang masih mixed-case tetap tampil uppercase di gambar surat jalan. */}
      <p
        style={{
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1.35,
          wordBreak: "break-word",
          textTransform: "uppercase",
        }}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px dashed #999", margin: "12px 0" }} />;
}

function SuratJalanPengirimanContent({ pengiriman, widthPx }) {
  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: 13,
        lineHeight: 1.5,
        color: "#000",
        background: "#fff",
        padding: "18px 14px 20px",
        width: widthPx,
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      {/* Logo mengikuti pengirim (permintaan Denny 2026-08 "pengirimnya
          dibuat pasti aja ... kalau pengirim DEERA pakai logo seperti
          keadaan sekarang, kalau pengirim maryam pakai logo yang saya
          kirim, kalau manual gausah pake logo"). `nama_pengirim` == "DEERA"
          / "MARYAM CIDENG" persis (dipilih dari selector Pengirim di
          PengirimanForm — lihat PENGIRIM_MODE_VALUES di sana) → tampilkan
          logo brand terkait; selain itu (Manual) → tanpa logo. */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        {pengiriman.nama_pengirim === "DEERA" && (
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <img src="/logo.png" alt="" style={{ maxWidth: 34, height: 34, objectFit: "contain" }} />
            <img
              src="/logo-deera.png"
              alt="DEERA"
              style={{ maxWidth: 120, height: 28, objectFit: "contain" }}
            />
          </div>
        )}
        {pengiriman.nama_pengirim === "MARYAM CIDENG" && (
          <img
            src="/logo-maryam.svg"
            alt="MARYAM"
            style={{ maxWidth: 180, height: 32, objectFit: "contain", margin: "0 auto" }}
          />
        )}
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginTop: 8,
            fontWeight: 700,
          }}
        >
          Surat Jalan Pengiriman
        </p>
        <p style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{pengiriman.pengiriman_no}</p>
      </div>

      <Divider />

      <Row label="Tanggal" value={fmtDate(pengiriman.tanggal)} />
      <Row label="Nama Penerima" value={pengiriman.nama_penerima} />
      <Row label="Alamat" value={pengiriman.alamat} />
      <Row label="No. Telp Penerima" value={pengiriman.no_telp_penerima} />
      <Row label="Ekspedisi" value={pengiriman.nama_ekspedisi} />
      <Row label="Jumlah Karung" value={`${pengiriman.jumlah_karung} KARUNG`} />
      <Row label="Isi Karung" value={pengiriman.isi_karung} />

      <Divider />

      {/* ── Tanda tangan pengirim ── */}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#888",
            marginBottom: 40,
          }}
        >
          Pengirim
        </p>
        <div style={{ borderTop: "1px solid #333", paddingTop: 4 }}>
          <p style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
            {pengiriman.nama_pengirim}
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          borderTop: "1px dashed #999",
          paddingTop: 8,
          textAlign: "center",
          fontSize: 9,
          color: "#999",
        }}
      >
        <p>
          Dibuat oleh {pengiriman.created_by_name || "-"} · {fmtDateTime(pengiriman.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function SuratJalanPengiriman({ pengiriman, onClose }) {
  const contentRef = useRef(null);
  const [paperWidth, setPaperWidth] = useState(DEFAULT_PAPER_WIDTH);
  const [busy, setBusy] = useState(false);

  if (!pengiriman) return null;

  const widthPx = mmToPx(paperWidth);
  const fname = `surat-jalan-${pengiriman.pengiriman_no}.png`;

  async function capturePng() {
    if (!contentRef.current) return null;
    return toPng(contentRef.current, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: "#ffffff",
      width: widthPx,
    });
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
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const file = new File([blob], fname, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Surat Jalan ${pengiriman.pengiriman_no}`,
          text: `Surat Jalan Pengiriman DEERA\n${pengiriman.pengiriman_no}\nPenerima: ${pengiriman.nama_penerima}\nEkspedisi: ${pengiriman.nama_ekspedisi}`,
        });
      } else {
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

      {/* bg-skin-card (BUKAN bg-white) — chrome modal (Tutup/toggle 78-100mm/
          Unduh/Bagikan) pakai kelas skin-* yg theme-aware, jadi containernya
          juga harus theme-aware, supaya kontras warnanya tetap benar di dark
          mode (permintaan Denny 2026-08 "warna buttonnya blm sesuai ...
          dark modenya"). Dokumen "kertas" di dalam (SuratJalanPengirimanContent)
          TETAP background:"#fff" hardcode — itu representasi kertas fisik,
          sengaja selalu putih apa pun tema, sama seperti pola
          SuratJalanPinjamModal.jsx (bg-skin-card di luar, bg-white di
          pembungkus dokumen saja). */}
      <div className="relative bg-skin-card w-full max-w-sm mx-auto shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-[#1a1a1a] px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
              Surat Jalan
            </span>
            <span className="ml-2 text-xs text-[#CAB170] font-mono">
              {pengiriman.pengiriman_no}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Konten dokumen */}
        <div className="overflow-y-auto flex-1 bg-skin-raised">
          <ScaleToFitPreview contentWidth={widthPx}>
            <div ref={contentRef}>
              <SuratJalanPengirimanContent pengiriman={pengiriman} widthPx={widthPx} />
            </div>
          </ScaleToFitPreview>
        </div>

        {/* Pilihan lebar kertas */}
        <div className="flex-shrink-0 border-t border-skin-bdr-lt flex">
          {Object.entries(PAPER_WIDTHS_MM).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setPaperWidth(key)}
              className={`flex-1 py-1.5 text-[10px] uppercase tracking-[0.06em] font-semibold transition ${
                paperWidth === key
                  ? "text-[#CAB170] bg-[#CAB170]/10"
                  : "text-skin-text4 hover:text-skin-text3"
              }`}
            >
              {cfg.label}
            </button>
          ))}
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
            className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-[#CAB170] border-r border-skin-bdr hover:bg-[#CAB170]/10 transition disabled:opacity-40"
          >
            {busy ? "Mengunduh..." : "Unduh"}
          </button>
          <button
            onClick={handleShare}
            disabled={busy}
            className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-[#CAB170] hover:bg-[#CAB170]/10 transition disabled:opacity-40"
          >
            {busy ? "Memproses..." : "Bagikan"}
          </button>
        </div>
      </div>
    </div>
  );
}
