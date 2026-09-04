/**
 * WorkOrderModal.jsx — Work Order untuk tukang potong (permintaan Denny
 * 2026-09: "di planning, ketika sudah selesai semua, sudah di approve ...
 * kita langsung bisa membuat Work Order untuk tukang potongnya, nah Work
 * Order ini akan kegenerate sebagai png dan siap untuk di print, berikut
 * dengan segala perubahan atau segala catatan yang sudah di diskusikan
 * sebelumnya").
 *
 * Hanya muncul untuk sampel berstatus "approved" (dipicu dari tombol di
 * SampelCard). Isi WO murni referensi + size yang harus dipotong — TANPA
 * jumlah/qty per size (keputusan Denny 2026-09: "referensi + sizenya apa,
 * gausah qty", qty diatur terpisah di luar sistem ini). Kolom "Kesimpulan
 * Penting" diisi MANUAL oleh admin (bukan dirangkum otomatis oleh AI —
 * sempat dipertimbangkan lalu dibatalkan Denny 2026-09: "saya ga jadi
 * rangkum pakai AI ya, saya rangkum sendiri aja") — untuk membantu admin
 * merangkum, disediakan kotak "Kumpulan Catatan & Diskusi" (gabungan mentah
 * catatan approve + seluruh komentar diskusi apa adanya) plus tombol Salin,
 * supaya admin tinggal baca lalu ketik/paste kesimpulannya sendiri.
 *
 * Foto yang dicetak bisa dipilih (checkbox per foto) dan ukurannya
 * diperbesar di dokumen (permintaan Denny 2026-09: "foto2nya bisa dipilih
 * mana aja yang mau di cetak di work order, dan ukurannya dibesarin").
 * Sampel bisa punya BANYAK foto jadi (upload multi-foto sudah didukung sejak
 * awal di MarkDibuatModal.jsx, "Tandai Sudah Dibuat"), tapi WO dibatasi
 * MAKSIMAL `MAX_WO_FOTOS` foto tercetak (keputusan Denny 2026-09: "bisa
 * pilih lebih dari 1 image yang mau di print, tapi kita set aja max 2 foto
 * aja yang bisa di print") — default 2 foto pertama tercentang, klik foto
 * ke-3+ ditolak dengan toast selama masih ada 2 yang tercentang.
 *
 * Format cetak: kertas biasa ukuran sekitar A4/A5 (keputusan Denny 2026-09),
 * sama seperti pola SuratJalan.jsx (transfer) — dokumen putih lebar 700px,
 * dicapture ke PNG via html-to-image, TIDAK disimpan ke tabel baru manapun
 * (generate-on-demand, sama seperti Surat Jalan/HPP Share). Satu-satunya
 * jejak yang disimpan adalah audit log ke product_history (logWorkOrder di
 * api.js) supaya kelihatan di Riwayat/Timeline kapan & size apa yang dipilih.
 */
import { useMemo, useRef, useState } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import ScaleToFitPreview from "@deera/shared/components/ScaleToFitPreview";
import { useComments, useLogWorkOrder } from "../hooks";
import { fmtDate, formatDisplayName } from "../utils";

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

// Maksimal foto yang boleh dicetak di Work Order (permintaan Denny 2026-09:
// "bisa pilih lebih dari 1 image yang mau di print, tapi kita set aja max 2
// foto aja yang bisa di print") — sampel sendiri boleh punya foto jadi lebih
// dari 2 (upload multi-foto di MarkDibuatModal.jsx tidak dibatasi), batas
// ini KHUSUS untuk pemilihan cetak di WO.
export const MAX_WO_FOTOS = 2;

// Batas karakter Kesimpulan Penting yang DICETAK (permintaan Denny 2026-09:
// "supaya ga lebih dari 1 page, dibuat maksimal text atau character aja ya,
// saya mau fixed 1 page ga boleh lebih") — juga dipakai sebagai `maxLength`
// pada textarea di form supaya admin tidak bisa mengetik/paste melebihi
// batas ini sejak awal (lihat WorkOrderModal di bawah).
export const MAX_KESIMPULAN_CHARS = 500;

function truncateKesimpulan(text) {
  if (!text) return text;
  return text.length > MAX_KESIMPULAN_CHARS
    ? `${text.slice(0, MAX_KESIMPULAN_CHARS).trimEnd()}…`
    : text;
}

// ── Dokumen WO (dicapture ke PNG) ─────────────────────────────────────────────
// `fotos`: daftar URL foto TERPILIH saja (hasil checkbox di form, lihat
// WorkOrderModal di bawah) — bukan langsung sampel.foto, supaya admin bisa
// milih mana yang relevan dicetak (permintaan Denny 2026-09).
function WorkOrderContent({ sampel, fotos, sizes, catatanPenting, creatorName }) {
  const bahanItems = sampel.bahan_items ?? [];

  // Proporsi kertas A4 portrait (210mm x 297mm, rasio 1:1.4142) — permintaan
  // Denny 2026-09: "saya mau fixed 1 page ga boleh lebih". Dulu cuma
  // `minHeight` (boleh lebih tinggi kalau konten banyak) — sekarang `height`
  // TETAP + `overflow: hidden` supaya dokumen TIDAK PERNAH lebih dari 1
  // halaman A4 apa pun isinya, sama seperti kertas fisik yang tidak bisa
  // "melar". Kesimpulan Penting sendiri sudah dibatasi karakternya
  // (truncateKesimpulan) + dibuat 2 kolom supaya konten wajar tetap muat.
  const A4_WIDTH = 700;
  const A4_HEIGHT = Math.round((A4_WIDTH * 297) / 210);

  return (
    <div
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 13,
        color: "#1a1a1a",
        background: "#fff",
        padding: "32px 36px",
        width: A4_WIDTH,
        height: A4_HEIGHT,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* ── KOP SURAT ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          paddingBottom: 16,
          borderBottom: "3px solid #a8925a",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: "bold",
              letterSpacing: 4,
              color: "#a8925a",
              fontFamily: "Georgia, serif",
            }}
          >
            DEERA
          </div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#888",
              marginTop: 2,
            }}
          >
            INDONESIA
          </div>
          <div style={{ fontSize: 9, color: "#aaa", marginTop: 6, letterSpacing: 0.5 }}>
            WA: {STORE_INFO.wa}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: "bold",
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#1a1a1a",
            }}
          >
            Work Order — Potong
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: "bold",
              color: "#a8925a",
              marginTop: 3,
              letterSpacing: 1,
            }}
          >
            {sampel.nomor}
          </div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>
            {formatDateTime(new Date().toISOString())}
          </div>
        </div>
      </div>

      {/* ── INFO PRODUK ── */}
      <div style={{ display: "flex", gap: 0, border: "1px solid #ddd", marginBottom: 20 }}>
        <div style={{ flex: 1, padding: "12px 16px" }}>
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#a8925a",
              fontWeight: "bold",
              marginBottom: 5,
            }}
          >
            Produk
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold" }}>{sampel.nama}</div>
          {sampel.kode_produk && (
            <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{sampel.kode_produk}</div>
          )}
        </div>
        <div style={{ width: 1, background: "#ddd" }} />
        <div style={{ flex: 1, padding: "12px 16px" }}>
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#a8925a",
              fontWeight: "bold",
              marginBottom: 5,
            }}
          >
            Disetujui
          </div>
          <div style={{ fontWeight: 600, textTransform: "uppercase" }}>
            {formatDisplayName(sampel.approved_by) || "-"}
          </div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>
            {formatDateTime(sampel.approved_at)}
          </div>
        </div>
        <div style={{ width: 1, background: "#ddd" }} />
        <div style={{ flex: 1, padding: "12px 16px" }}>
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#a8925a",
              fontWeight: "bold",
              marginBottom: 5,
            }}
          >
            Dibuat Oleh
          </div>
          <div style={{ fontWeight: 600, textTransform: "uppercase" }}>{creatorName || "-"}</div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{fmtDate(sampel.tanggal)}</div>
        </div>
      </div>

      {/* ── SIZE YANG DIPOTONG ── */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: "#a8925a",
            fontWeight: "bold",
            marginBottom: 8,
          }}
        >
          Size yang Dipotong
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {sizes.length === 0 ? (
            <span style={{ fontSize: 11, color: "#aaa" }}>— belum dipilih —</span>
          ) : (
            sizes.map((sz) => (
              <span
                key={sz}
                style={{
                  border: "1.5px solid #a8925a",
                  color: "#a8925a",
                  padding: "5px 12px",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {sz}
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── BAHAN YANG DIPAKAI ── */}
      {bahanItems.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#a8925a",
              fontWeight: "bold",
              marginBottom: 8,
            }}
          >
            Bahan yang Dipakai
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
            <tbody>
              {bahanItems.map((b, i) => {
                // Foto kecil per bahan (permintaan Denny 2026-09: "disempilin
                // juga image kecil bahan bahan yang dipakai, atau seengganya
                // nama bahan aja kalau ga muat") — fallback ke kolom lama
                // bahan_foto HANYA utk item pertama (data planning sebelum
                // per-item foto ada, lihat SampelCard.jsx pola yang sama).
                const foto = b.foto ?? (i === 0 ? sampel.bahan_foto : null);
                return (
                  <tr key={`${b.nama_bahan}-${i}`} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "6px 10px 6px 0", width: 40 }}>
                      {foto ? (
                        <img
                          src={cldUrl(foto, { width: 80, height: 100, crop: "fill" })}
                          alt={b.nama_bahan}
                          style={{ width: 32, height: 40, objectFit: "cover", border: "1px solid #ddd" }}
                        />
                      ) : null}
                    </td>
                    <td style={{ padding: "6px 10px 6px 0", fontWeight: 700 }}>{b.nama_bahan}</td>
                    <td style={{ padding: "6px 0", color: "#888", textAlign: "right" }}>
                      {b.kode_bahan ?? ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FOTO SAMPEL FINAL ── */}
      {fotos.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#a8925a",
              fontWeight: "bold",
              marginBottom: 8,
            }}
          >
            Foto Sampel Final (Acuan Potong)
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {fotos.map((url, i) => (
              <img
                key={url ?? i}
                src={cldUrl(url, { width: 600 })}
                alt={`sampel final ${i + 1}`}
                style={{
                  width: 300,
                  height: 380,
                  objectFit: "cover",
                  border: "1px solid #ddd",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── KESIMPULAN PENTING ── */}
      {/* 2 kolom + tinggi dibatasi (overflow hidden) + teks dipotong maksimal
          MAX_KESIMPULAN_CHARS karakter — permintaan Denny 2026-09: "dibuat 2
          column aja ya, dan supaya ga lebih dari 1 page, dibuat maksimal text
          atau character aja ya, saya mau fixed 1 page ga boleh lebih". */}
      {catatanPenting && (
        <div
          style={{
            background: "#fff8e6",
            border: "1.5px solid #d4af37",
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 12,
            maxHeight: 190,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#7a5c1e",
              fontWeight: "bold",
              marginBottom: 5,
            }}
          >
            Kesimpulan Penting
          </div>
          <div
            data-testid="wo-kesimpulan-text"
            style={{
              color: "#3a3a3a",
              whiteSpace: "pre-wrap",
              columnCount: 2,
              columnGap: 24,
              columnRule: "1px solid #e8dcb8",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            {truncateKesimpulan(catatanPenting)}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div
        style={{
          marginTop: 32,
          borderTop: "1px solid #eee",
          paddingTop: 10,
          textAlign: "center",
          fontSize: 9,
          color: "#aaa",
          letterSpacing: 1,
        }}
      >
        DEERA INDONESIA · Dokumen ini digenerate otomatis · {sampel.nomor}
      </div>
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export default function WorkOrderModal({ sampel, onClose }) {
  const { user } = useAuth();
  const logWorkOrder = useLogWorkOrder();
  const { comments } = useComments(sampel?.id);
  const contentRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [catatanPenting, setCatatanPenting] = useState(sampel?.perubahan ?? "");
  // Foto yang dicentang untuk dicetak — default MAX_WO_FOTOS foto pertama
  // tercentang (permintaan Denny 2026-09: bisa dipilih mana yang mau
  // dicetak, tapi dibatasi maksimal 2 foto).
  const [selectedFotos, setSelectedFotos] = useState(() =>
    (sampel?.foto ?? []).slice(0, MAX_WO_FOTOS),
  );
  const [copiedNotes, setCopiedNotes] = useState(false);

  const creatorName = useMemo(
    () => formatDisplayName(user?.user_metadata?.full_name || user?.email),
    [user],
  );

  // Kumpulan mentah catatan approve + seluruh komentar diskusi, APA ADANYA
  // (bukan dirangkum AI, keputusan Denny 2026-09: "saya rangkum sendiri aja")
  // — disediakan supaya admin tinggal baca/salin lalu tulis sendiri
  // kesimpulannya di kolom Kesimpulan Penting.
  const notesText = useMemo(() => {
    const parts = [];
    if (sampel?.perubahan?.trim()) {
      parts.push(`Catatan saat approve:\n${sampel.perubahan.trim()}`);
    }
    const commentLines = (comments ?? [])
      .filter((c) => c.text && c.text.trim())
      .map((c) => `- ${formatDisplayName(c.user_name || c.user_email)}: ${c.text.trim()}`);
    if (commentLines.length > 0) {
      parts.push(`Diskusi:\n${commentLines.join("\n")}`);
    }
    return parts.join("\n\n");
  }, [sampel?.perubahan, comments]);

  if (!sampel) return null;

  const fname = `work-order-${sampel.nomor}.png`;
  const fotos = sampel.foto ?? [];

  function toggleSize(sz) {
    setSizes((prev) => (prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]));
  }

  function toggleFoto(url) {
    setSelectedFotos((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= MAX_WO_FOTOS) {
        toast.error(`Maksimal ${MAX_WO_FOTOS} foto yang bisa dicetak — hapus centang salah satu dulu`);
        return prev;
      }
      return [...prev, url];
    });
  }

  async function copyNotes() {
    try {
      await navigator.clipboard.writeText(notesText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = notesText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 1500);
  }

  async function capturePng() {
    if (!contentRef.current) return null;
    const { toPng } = await import("html-to-image");
    return toPng(contentRef.current, {
      cacheBust: true,
      pixelRatio: 2.5,
      backgroundColor: "#ffffff",
      width: 700,
    });
  }

  async function afterGenerate() {
    logWorkOrder({ sampel, sizes, catatanPenting }).catch(() => {});
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const dataUrl = await capturePng();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = fname;
      a.click();
      await afterGenerate();
      toast.success("Work Order diunduh ✓");
    } catch (err) {
      toast.error("Gagal membuat Work Order: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    setBusy(true);
    try {
      const dataUrl = await capturePng();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fname, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Work Order ${sampel.nomor}` });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = fname;
        a.click();
      }
      await afterGenerate();
    } catch (err) {
      if (err?.name !== "AbortError") toast.error("Gagal berbagi: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg mx-auto shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-[#1a1a1a] px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
              Work Order
            </span>
            <span className="ml-2 text-xs text-[#CAB170] font-mono">{sampel.nomor}</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Form: size + kesimpulan penting */}
        <div className="flex-shrink-0 bg-skin-card border-b border-skin-bdr px-4 py-3 space-y-3">
          <div>
            <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3 mb-1.5">
              Size yang Dipotong
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SIZE_PRESETS.map(({ size }) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`px-2.5 py-1 text-xs font-editorial uppercase border transition ${
                    sizes.includes(size)
                      ? "border-[#CAB170] bg-skin-gold text-[#CAB170]"
                      : "border-skin-bdr text-skin-text3 hover:border-[#CAB170]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          {fotos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">
                  Foto yang Dicetak
                </p>
                <span className="text-[10px] font-editorial text-skin-text4">
                  {selectedFotos.length}/{MAX_WO_FOTOS} dipilih
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {fotos.map((url, i) => {
                  const checked = selectedFotos.includes(url);
                  // Foto yang belum tercentang jadi makin redup & tidak bisa
                  // diklik saat kuota MAX_WO_FOTOS sudah penuh — penanda
                  // visual kenapa tap tidak berefek, selain toast di
                  // toggleFoto() (permintaan Denny 2026-09: maks 2 foto).
                  const atMax = !checked && selectedFotos.length >= MAX_WO_FOTOS;
                  return (
                    <button
                      key={url ?? i}
                      type="button"
                      onClick={() => toggleFoto(url)}
                      className={`relative w-14 h-20 border-2 overflow-hidden transition ${
                        checked
                          ? "border-[#CAB170]"
                          : atMax
                          ? "border-skin-bdr opacity-25 cursor-not-allowed"
                          : "border-skin-bdr opacity-40"
                      }`}
                    >
                      <img
                        src={cldUrl(url, { width: 112, height: 144, crop: "fill" })}
                        className="w-full h-full object-cover"
                        alt={`foto ${i + 1}`}
                      />
                      <span
                        className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] leading-none ${
                          checked ? "bg-[#CAB170] text-white" : "bg-black/50 text-white/70"
                        }`}
                      >
                        {checked ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">
                Kumpulan Catatan &amp; Diskusi
              </p>
              {notesText && (
                <button
                  type="button"
                  onClick={copyNotes}
                  className="text-[10px] font-editorial uppercase tracking-[0.1em] text-[#CAB170] hover:underline"
                >
                  {copiedNotes ? "✓ Tersalin" : "Salin"}
                </button>
              )}
            </div>
            {notesText ? (
              <pre className="whitespace-pre-wrap font-editorial text-xs text-skin-text2 bg-skin-raised border border-skin-bdr px-3 py-2 max-h-28 overflow-y-auto">
                {notesText}
              </pre>
            ) : (
              <p className="text-xs text-skin-text4 italic">Belum ada catatan/diskusi untuk sampel ini.</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">
                Kesimpulan Penting (opsional)
              </label>
              <span
                className={`text-[10px] font-editorial ${
                  catatanPenting.length >= MAX_KESIMPULAN_CHARS ? "text-red-500" : "text-skin-text4"
                }`}
              >
                {catatanPenting.length}/{MAX_KESIMPULAN_CHARS}
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={MAX_KESIMPULAN_CHARS}
              value={catatanPenting}
              onChange={(e) => setCatatanPenting(e.target.value)}
              placeholder="Baca/salin dari Kumpulan Catatan & Diskusi di atas, lalu tulis kesimpulannya di sini (ringkas — dicetak 2 kolom, maks 1 halaman). Kosongkan kalau ikuti sesuai sampel."
              className="w-full px-3 py-2 bg-skin-raised border border-skin-bdr text-sm text-skin-text placeholder:text-skin-text4 focus:outline-none focus:border-[#CAB170] transition resize-none"
            />
          </div>
        </div>

        {/* Preview dokumen */}
        <div className="overflow-y-auto flex-1 bg-skin-raised">
          <ScaleToFitPreview contentWidth={700}>
            <div ref={contentRef}>
              <WorkOrderContent
                sampel={sampel}
                fotos={selectedFotos}
                sizes={sizes}
                catatanPenting={catatanPenting}
                creatorName={creatorName}
              />
            </div>
          </ScaleToFitPreview>
        </div>

        {/* Tombol aksi */}
        <div className="flex-shrink-0 border-t-2 border-skin-bdr flex flex-col">
          {sizes.length === 0 && (
            <p className="text-[10px] text-amber-600 text-center py-1.5 bg-amber-500/10">
              Pilih minimal 1 size sebelum membuat Work Order
            </p>
          )}
          <div className="flex">
            <button
              onClick={onClose}
              className="py-4 px-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text3 hover:text-skin-text transition border-r border-skin-bdr"
            >
              Tutup
            </button>
            <button
              onClick={handleDownload}
              disabled={busy || sizes.length === 0}
              className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-[#CAB170] border-r border-skin-bdr hover:bg-[#CAB170]/10 transition disabled:opacity-40"
            >
              {busy ? "Memproses..." : "Unduh PNG"}
            </button>
            <button
              onClick={handleShare}
              disabled={busy || sizes.length === 0}
              className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-[#CAB170] hover:bg-[#CAB170]/10 transition disabled:opacity-40"
            >
              {busy ? "Memproses..." : "Bagikan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
