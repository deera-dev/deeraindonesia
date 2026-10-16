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
import { fmtDate, formatDisplayName, buildWoNotes, listCommentFotos, listAllWoFotos, printImageA4, photoGridDims, MAX_WO_REF_FOTOS } from "../utils";

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

// Kalau WO punya foto, foto pindah ke halaman 2 sehingga halaman 1 lega:
// kesimpulan boleh jauh lebih panjang & hurufnya besar (Denny 2026-10-16).
export const MAX_KESIMPULAN_CHARS_P2 = 1500;

function truncateKesimpulan(text, max = MAX_KESIMPULAN_CHARS) {
  if (!text) return text;
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

// Ukuran huruf kesimpulan di halaman 1 tanpa foto — makin pendek makin besar.
function kesimpulanFontSize(len) {
  if (len <= 350) return 21;
  if (len <= 800) return 17;
  return 15;
}

// ── Dokumen WO (dicapture ke PNG) ─────────────────────────────────────────────
// `fotos`: daftar URL foto TERPILIH saja (hasil checkbox di form, lihat
// WorkOrderModal di bawah) — bukan langsung sampel.foto, supaya admin bisa
// milih mana yang relevan dicetak (permintaan Denny 2026-09).
//
// Layout (permintaan Denny 2026-10-08: "banyak space kosong ... kita harus
// bisa memaksimalkan supaya tidak terjadi kesalahan saat produksi"): kertas
// A4 portrait ber-tinggi TETAP (1 halaman, tidak boleh lebih) disusun sbg
// kolom flex — kop, info, Size + Bahan SEJAJAR, lalu zona foto yang MENGISI
// sisa tinggi (foto sampel final di kiri, Foto Referensi di kanan), lalu
// Kesimpulan Penting dgn huruf lebih besar, footer menempel di dasar kertas.
// Foto pakai objectFit "contain" supaya detail model tidak terpotong.
const WO_LABEL = {
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: 2,
  color: "#a8925a",
  fontWeight: "bold",
  marginBottom: 6,
};
const WO_PHOTO_BG = "#f6f3ec";

function WoPhoto({ url, alt, width = 600, label }) {
  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, minWidth: 0, background: WO_PHOTO_BG, border: "1px solid #ddd" }}>
      <img
        src={cldUrl(url, { width })}
        alt={alt}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
      />
      {label && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            background: "#a8925a",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 13,
            padding: "3px 9px",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// Halaman 2: khusus foto, sebesar mungkin (A4 700 x 990, sama dgn halaman 1).
function WorkOrderPhotoPage({ sampel, fotos, refFotos = [] }) {
  const items = [
    ...fotos.map((url, i) => ({ url, label: null, alt: `sampel final ${i + 1}` })),
    ...refFotos.map((r) => ({ url: r.url, label: r.label, alt: `Foto ${r.label}` })),
  ];
  const { cols, rows } = photoGridDims(items.length);
  return (
    <div
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        background: "#fff",
        padding: "22px 28px 20px",
        width: 700,
        height: Math.round((700 * 297) / 210),
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ ...WO_LABEL, marginBottom: 0, display: "flex", justifyContent: "space-between" }}>
        <span>Foto Work Order</span>
        <span>{sampel.nomor}</span>
      </div>
      <div
        data-testid="wo-photo-page"
        style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: 10 }}
      >
        {items.map((it) => (
          <WoPhoto key={it.url} url={it.url} alt={it.alt} label={it.label} width={1200} />
        ))}
      </div>
    </div>
  );
}


function WorkOrderContent({ sampel, fotos, refFotos = [], sizes, catatanPenting, creatorName, photosOnPage2 = false }) {
  const bahanItems = sampel.bahan_items ?? [];
  // WO Sampel = dari planning, sebelum sampel dijahit (Denny 2026-10-15).
  const isSampelWo = sampel.status === "planning";

  // Proporsi kertas A4 portrait (210mm x 297mm, rasio 1:1.4142), `height`
  // TETAP + `overflow: hidden` supaya dokumen TIDAK PERNAH lebih dari 1 halaman.
  const A4_WIDTH = 700;
  const A4_HEIGHT = Math.round((A4_WIDTH * 297) / 210);
  // Tata letak Foto Referensi (permintaan Denny 2026-10-08):
  // 1 = satu besar; 2 = atas-bawah; 3 = tumpuk 3; 4 = kotak 2x2; 5-6 = 2 kolom x 3 baris (persegi panjang).
  const nRef = refFotos.length;
  const refCols = nRef >= 4 ? 2 : 1;
  const refRows = nRef >= 5 ? 3 : nRef === 4 ? 2 : Math.max(nRef, 1);

  return (
    <div
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 13,
        color: "#1a1a1a",
        background: "#fff",
        padding: "26px 32px 18px",
        width: A4_WIDTH,
        height: A4_HEIGHT,
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* ── KOP SURAT ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingBottom: 10,
          borderBottom: "3px solid #a8925a",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: 4, color: "#a8925a" }}>DEERA</div>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "#888" }}>
            INDONESIA · WA: {STORE_INFO.wa}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 3, textTransform: "uppercase" }}>
            {isSampelWo ? "Work Order — Sampel" : "Work Order — Potong"}
          </div>
          <div style={{ fontSize: 12, fontWeight: "bold", color: "#a8925a", letterSpacing: 1 }}>
            {sampel.nomor}
            <span style={{ fontSize: 10, fontWeight: "normal", color: "#888", marginLeft: 8 }}>
              {formatDateTime(new Date().toISOString())}
            </span>
          </div>
        </div>
      </div>

      {/* ── INFO PRODUK ── */}
      <div style={{ display: "flex", border: "1px solid #ddd", flexShrink: 0 }}>
        <div style={{ flex: 1.3, padding: "9px 14px" }}>
          <div style={WO_LABEL}>Produk</div>
          <div style={{ fontSize: 15, fontWeight: "bold", lineHeight: 1.2 }}>{sampel.nama}</div>
          {sampel.kode_produk && (
            <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{sampel.kode_produk}</div>
          )}
        </div>
        <div style={{ width: 1, background: "#ddd" }} />
        <div style={{ flex: 1, padding: "9px 14px" }}>
          {isSampelWo ? (
            <>
              <div style={WO_LABEL}>Status</div>
              <div style={{ fontWeight: 600, textTransform: "uppercase" }}>Sampel Baru</div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Belum dijahit</div>
            </>
          ) : (
            <>
              <div style={WO_LABEL}>Disetujui</div>
              <div style={{ fontWeight: 600, textTransform: "uppercase" }}>
                {formatDisplayName(sampel.approved_by) || "-"}
              </div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{formatDateTime(sampel.approved_at)}</div>
            </>
          )}
        </div>
        <div style={{ width: 1, background: "#ddd" }} />
        <div style={{ flex: 1, padding: "9px 14px" }}>
          <div style={WO_LABEL}>Dibuat Oleh</div>
          <div style={{ fontWeight: 600, textTransform: "uppercase" }}>{creatorName || "-"}</div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{fmtDate(sampel.tanggal)}</div>
        </div>
      </div>

      {/* ── SIZE (kiri) + BAHAN (kanan) sejajar ── */}
      <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={WO_LABEL}>{isSampelWo ? "Size Sampel" : "Size yang Dipotong"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sizes.length === 0 ? (
              <span style={{ fontSize: 11, color: "#aaa" }}>— belum dipilih —</span>
            ) : (
              sizes.map((sz) => (
                <span
                  key={sz}
                  style={{
                    border: "1.5px solid #a8925a",
                    color: "#a8925a",
                    padding: "4px 10px",
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
        {bahanItems.length > 0 && (
          <div style={{ flex: 1.2 }}>
            <div style={WO_LABEL}>Bahan yang Dipakai</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {bahanItems.map((b, i) => {
                // Foto kecil per bahan; fallback kolom lama bahan_foto HANYA utk
                // item pertama (data planning sebelum per-item foto ada).
                const foto = b.foto ?? (i === 0 ? sampel.bahan_foto : null);
                return (
                  <div key={`${b.nama_bahan}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {foto ? (
                      <img
                        src={cldUrl(foto, { width: 80, height: 100, crop: "fill" })}
                        alt={b.nama_bahan}
                        style={{ width: 32, height: 40, objectFit: "cover", border: "1px solid #ddd" }}
                      />
                    ) : null}
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{b.nama_bahan}</span>
                    <span style={{ marginLeft: "auto", color: "#888", fontSize: 11 }}>{b.kode_bahan ?? ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── ZONA FOTO: mengisi sisa tinggi kertas ── */}
      {photosOnPage2 && (fotos.length > 0 || refFotos.length > 0) && (
        <div style={{ flex: catatanPenting ? "0 0 auto" : 1, minHeight: 0, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
          <span style={{ ...WO_LABEL, marginBottom: 0 }} data-testid="wo-foto-p2">Foto → lihat halaman 2</span>
        </div>
      )}
      {!photosOnPage2 && (fotos.length > 0 || refFotos.length > 0) && (
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 14 }}>
          {fotos.length > 0 && (
            <div style={{ flex: refFotos.length === 0 ? 1 : refFotos.length >= 4 ? 1 : 1.3, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div style={WO_LABEL}>Foto Sampel Final (Acuan Potong)</div>
              <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 10 }}>
                {fotos.map((url, i) => (
                  <div key={url ?? i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <WoPhoto url={url} alt={`sampel final ${i + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {refFotos.length > 0 && (
            <div
              style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
              data-testid="wo-ref-fotos"
            >
              <div style={WO_LABEL}>Foto Referensi</div>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gridTemplateColumns: `repeat(${refCols}, 1fr)`,
                  gridTemplateRows: `repeat(${refRows}, 1fr)`,
                  gap: 8,
                }}
              >
                {refFotos.map((r) => (
                  <WoPhoto key={r.url} url={r.url} alt={`Foto ${r.label}`} label={r.label} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KESIMPULAN PENTING ── */}
      {/* 2 kolom, huruf cukup besar utk dibaca di meja potong, teks dipotong
          maksimal MAX_KESIMPULAN_CHARS (permintaan Denny 2026-09: "fixed 1
          page ga boleh lebih"). */}
      {catatanPenting && (
        <div
          style={{
            background: "#fff8e6",
            border: "1.5px solid #d4af37",
            padding: "10px 14px",
            ...(photosOnPage2 ? { flex: 1, minHeight: 0 } : { flexShrink: 0, maxHeight: 230 }),
            overflow: "hidden",
          }}
        >
          <div style={{ ...WO_LABEL, color: "#7a5c1e", marginBottom: 5 }}>Kesimpulan Penting</div>
          <div
            data-testid="wo-kesimpulan-text"
            style={{
              color: "#2a2a2a",
              whiteSpace: "pre-wrap",
              ...(photosOnPage2
                ? { fontSize: kesimpulanFontSize(catatanPenting.length), lineHeight: 1.5 }
                : { columnCount: 2, columnGap: 24, columnRule: "1px solid #e8dcb8", fontSize: 12.5, lineHeight: 1.45 }),
            }}
          >
            {truncateKesimpulan(catatanPenting, photosOnPage2 ? MAX_KESIMPULAN_CHARS_P2 : MAX_KESIMPULAN_CHARS)}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid #eee",
          paddingTop: 6,
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
  const photoPageRef = useRef(null);
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
  // Foto Referensi dari diskusi yang dipilih admin (null = otomatis: semua, maks MAX_WO_REF_FOTOS).
  const [refSelection, setRefSelection] = useState(null);

  const creatorName = useMemo(
    () => formatDisplayName(user?.user_metadata?.full_name || user?.email),
    [user],
  );

  // Catatan approve + diskusi dibuat poin-poin TANPA nama pengomentar; foto
  // komentar diberi label (Foto A, B, ...) dan ikut tercetak sbg Foto Referensi
  // (permintaan Denny 2026-10-08). Tetap diedit manual di Kesimpulan Penting.
  const allFotos = useMemo(() => listAllWoFotos(sampel, comments), [sampel, comments]);
  const refCandidates = useMemo(
    () => allFotos.filter((u) => !selectedFotos.includes(u)),
    [allFotos, selectedFotos],
  );
  // Default referensi = foto yang dilampirkan di diskusi (bukan semua foto).
  // WO Sampel (planning): referensi default = foto model & bahan planning,
  // karena belum ada foto sampel jadi.
  const isSampelWo = sampel?.status === "planning";
  const defaultRefs = useMemo(
    () =>
      isSampelWo
        ? allFotos.slice(0, MAX_WO_REF_FOTOS)
        : listCommentFotos(comments, selectedFotos).slice(0, MAX_WO_REF_FOTOS),
    [comments, selectedFotos, isSampelWo, allFotos],
  );
  const selectedRefs = useMemo(
    () =>
      refSelection
        ? refSelection.filter((u) => refCandidates.includes(u))
        : defaultRefs,
    [refSelection, refCandidates, defaultRefs],
  );
  const { text: notesText, refFotos } = useMemo(
    () => buildWoNotes(sampel, comments, { excludeUrls: selectedFotos, selected: selectedRefs }),
    [sampel, comments, selectedFotos, selectedRefs],
  );

  if (!sampel) return null;

  const fname = `work-order${isSampelWo ? "-sampel" : ""}-${sampel.nomor}.png`;
  const fotos = allFotos;

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

  function toggleRef(url) {
    if (selectedRefs.includes(url)) {
      setRefSelection(selectedRefs.filter((u) => u !== url));
    } else if (selectedRefs.length >= MAX_WO_REF_FOTOS) {
      toast.error(`Maksimal ${MAX_WO_REF_FOTOS} Foto Referensi — hapus centang salah satu dulu`);
    } else {
      setRefSelection([...selectedRefs, url]);
    }
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

  async function capturePng(node = contentRef.current) {
    if (!node) return null;
    const { toPng } = await import("html-to-image");
    return toPng(node, {
      cacheBust: true,
      pixelRatio: 2.5,
      backgroundColor: "#ffffff",
      width: 700,
    });
  }

  // Halaman 1 (+ halaman 2 khusus foto kalau ada foto) sebagai daftar PNG.
  const hasFotos = selectedFotos.length > 0 || refFotos.length > 0;
  const maxChars = hasFotos ? MAX_KESIMPULAN_CHARS_P2 : MAX_KESIMPULAN_CHARS;
  async function capturePages() {
    const pages = [await capturePng()];
    if (hasFotos && photoPageRef.current) pages.push(await capturePng(photoPageRef.current));
    return pages;
  }

  async function afterGenerate() {
    logWorkOrder({ sampel, sizes, catatanPenting }).catch(() => {});
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const pages = await capturePages();
      pages.forEach((dataUrl, i) => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = i === 0 ? fname : fname.replace(/\.png$/, "-foto.png");
        a.click();
      });
      await afterGenerate();
      toast.success("Work Order diunduh ✓");
    } catch (err) {
      toast.error("Gagal membuat Work Order: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  // Cetak langsung ke printer, kertas A4 (permintaan Denny 2026-10-08).
  async function handlePrint() {
    setBusy(true);
    try {
      await printImageA4(await capturePages());
      await afterGenerate();
    } catch (err) {
      toast.error("Gagal mencetak: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    setBusy(true);
    try {
      const pages = await capturePages();
      const files = await Promise.all(
        pages.map(async (dataUrl, i) => {
          const blob = await (await fetch(dataUrl)).blob();
          return new File([blob], i === 0 ? fname : fname.replace(/\.png$/, "-foto.png"), { type: "image/png" });
        }),
      );

      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files, title: `Work Order ${sampel.nomor}` });
      } else {
        pages.forEach((dataUrl, i) => {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = files[i].name;
          a.click();
        });
      }
      await afterGenerate();
    } catch (err) {
      if (err?.name !== "AbortError") toast.error("Gagal berbagi: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-skin-card">
      {/* Layar penuh (HP & desktop). Desktop: formulir/catatan di kiri, pratinjau dokumen di kanan. */}
      <div className="relative w-full h-[100dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-skin-header px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
              {isSampelWo ? "Work Order Sampel" : "Work Order"}
            </span>
            <span className="ml-2 text-xs text-skin-accent-text font-mono">{sampel.nomor}</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Form: size + kesimpulan penting */}
        <div className="flex-1 overflow-y-auto min-h-0 lg:overflow-hidden lg:grid lg:grid-cols-[minmax(420px,42%)_1fr]">
        <div className="bg-skin-card border-b border-skin-bdr px-4 py-3 space-y-3 lg:border-b-0 lg:border-r lg:overflow-y-auto lg:px-6 lg:py-5">
          <div>
            <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3 mb-1.5">
              {isSampelWo ? "Size Sampel" : "Size yang Dipotong"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SIZE_PRESETS.map(({ size }) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`px-2.5 py-1 text-xs font-editorial uppercase border transition ${
                    sizes.includes(size)
                      ? "border-skin-accent bg-skin-gold text-skin-accent-text"
                      : "border-skin-bdr text-skin-text3 hover:border-skin-accent"
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
                          ? "border-skin-accent"
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
                          checked ? "bg-skin-accent text-skin-on-accent" : "bg-black/50 text-skin-on-accent/70"
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
          {refCandidates.length > 0 && (
            <div data-testid="ref-picker">
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">
                  Foto Referensi
                </p>
                <span className="text-[10px] font-editorial text-skin-text4">
                  {selectedRefs.length}/{MAX_WO_REF_FOTOS} dipilih
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {refCandidates.map((url, i) => {
                  const checked = selectedRefs.includes(url);
                  const label = refFotos.find((r) => r.url === url)?.label;
                  const atMax = !checked && selectedRefs.length >= MAX_WO_REF_FOTOS;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => toggleRef(url)}
                      className={`relative w-14 h-20 border-2 overflow-hidden transition ${
                        checked
                          ? "border-skin-accent"
                          : atMax
                          ? "border-skin-bdr opacity-25 cursor-not-allowed"
                          : "border-skin-bdr opacity-40"
                      }`}
                    >
                      <img
                        src={cldUrl(url, { width: 112, height: 144, crop: "fill" })}
                        className="w-full h-full object-cover"
                        alt={`referensi ${i + 1}`}
                      />
                      <span
                        className={`absolute top-0.5 right-0.5 min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] font-bold leading-none ${
                          checked ? "bg-skin-accent text-skin-on-accent" : "bg-black/50 text-skin-on-accent/70"
                        }`}
                      >
                        {checked ? label ?? "✓" : ""}
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
                  className="text-[10px] font-editorial uppercase tracking-[0.1em] text-skin-accent-text hover:underline"
                >
                  {copiedNotes ? "✓ Tersalin" : "Salin"}
                </button>
              )}
            </div>
            {notesText ? (
              <pre className="whitespace-pre-wrap font-editorial text-xs text-skin-text2 bg-skin-raised border border-skin-bdr px-3 py-2 max-h-56 overflow-y-auto lg:max-h-[38vh] lg:text-sm">
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
                  catatanPenting.length >= maxChars ? "text-red-500" : "text-skin-text4"
                }`}
              >
                {catatanPenting.length}/{maxChars}
              </span>
            </div>
            <textarea
              rows={8}
              maxLength={maxChars}
              value={catatanPenting}
              onChange={(e) => setCatatanPenting(e.target.value)}
              placeholder="Baca/salin dari Kumpulan Catatan & Diskusi di atas, lalu tulis kesimpulannya di sini (ringkas — dicetak 2 kolom, maks 1 halaman). Kosongkan kalau ikuti sesuai sampel."
              className="w-full px-3 py-2 bg-skin-raised border border-skin-bdr text-base text-skin-text placeholder:text-skin-text4 focus:outline-none focus:border-skin-accent transition resize-none lg:h-[34vh]"
            />
          </div>
        </div>

        {/* Preview dokumen */}
        <div className="bg-skin-raised lg:overflow-y-auto lg:h-full lg:px-6 lg:py-5">
          <ScaleToFitPreview contentWidth={700}>
            <div ref={contentRef}>
              <WorkOrderContent
                sampel={sampel}
                fotos={selectedFotos}
                refFotos={refFotos}
                sizes={sizes}
                catatanPenting={catatanPenting}
                creatorName={creatorName}
                photosOnPage2={hasFotos}
              />
            </div>
          </ScaleToFitPreview>
          {hasFotos && (
            <>
              <p className="px-4 pt-3 font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">
                Halaman 2 — foto
              </p>
              <ScaleToFitPreview contentWidth={700}>
                <div ref={photoPageRef}>
                  <WorkOrderPhotoPage sampel={sampel} fotos={selectedFotos} refFotos={refFotos} />
                </div>
              </ScaleToFitPreview>
            </>
          )}
        </div>
        </div>

        {/* Tombol aksi */}
        <div className="flex-shrink-0 border-t-2 border-skin-bdr flex flex-col">
          {sizes.length === 0 && (
            <p className="text-[10px] text-amber-600 text-center py-1.5 bg-amber-500/10">
              Pilih minimal 1 size sebelum membuat Work Order{isSampelWo ? " Sampel" : ""}
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
              onClick={handlePrint}
              disabled={busy || sizes.length === 0}
              className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold bg-skin-accent text-skin-on-accent border-r border-skin-bdr hover:bg-skin-accent-hover transition disabled:opacity-40"
            >
              {busy ? "Memproses..." : "Cetak A4"}
            </button>
            <button
              onClick={handleDownload}
              disabled={busy || sizes.length === 0}
              className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-skin-accent-text border-r border-skin-bdr hover:bg-skin-accent/10 transition disabled:opacity-40"
            >
              {busy ? "Memproses..." : "Unduh PNG"}
            </button>
            <button
              onClick={handleShare}
              disabled={busy || sizes.length === 0}
              className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-skin-accent-text hover:bg-skin-accent/10 transition disabled:opacity-40"
            >
              {busy ? "Memproses..." : "Bagikan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
