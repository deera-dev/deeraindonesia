// utils.js — Pure helpers fitur produksi-sampel. Tidak ada I/O.

export const fmtDate = (d) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

// Wording status diperjelas (permintaan Denny 2026-09: "wordingnya diperjelas
// aja ya buat planning dan menunggu review dan status lainnya") — label lama
// "Planning"/"Menunggu Review"/"Approved" ambigu soal SUDAH atau BELUM ada
// sampel fisiknya; label baru langsung menyebut tahapannya:
// - "Belum Dibuat"    : rencana sudah dibuat, sampel fisik BELUM dijahit.
// - "Menunggu Approval": sampel fisik SUDAH dijahit, menunggu direview.
// - "Disetujui"        : sudah direview & diterima, siap lanjut Work Order.
// "Ditahan" & "Ditolak" sudah cukup jelas, tidak diubah.
export const STATUS_META = {
  planning: {
    label: "Belum Dibuat",
    cls: "bg-sky-500/10 text-sky-600 border border-sky-500/30",
  },
  draft: {
    label: "Menunggu Approval",
    cls: "bg-skin-raised text-skin-text3 border border-skin-bdr",
  },
  approved: {
    label: "Disetujui",
    cls: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
  },
  ditahan: {
    label: "Ditahan",
    cls: "bg-amber-500/10 text-amber-600 border border-amber-500/30",
  },
  rejected: {
    label: "Ditolak",
    cls: "bg-red-500/10 text-red-500 border border-red-500/30",
  },
};

export function buildNomor() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SPL-${ymd}-${rand}`;
}

// ── Antrean Planning (permintaan Denny 2026-08) ───────────────────────────────
// Urutan planning bisa diubah lewat drag & drop di UI — paling atas (urutan
// terkecil) = dikerjakan duluan. `urutan` disimpan per baris di kolom
// `sampel.urutan` (integer, hanya relevan utk status="planning").

// Sortir daftar planning berdasarkan urutan asc. Baris tanpa `urutan` (null/
// undefined, mis. data lama sebelum kolom ini ada) ditaruh paling akhir,
// tiebreak by created_at asc supaya urutannya tetap stabil & masuk akal.
export function sortPlanningQueue(sampels) {
  return (sampels ?? [])
    .filter((s) => s.status === "planning")
    .sort((a, b) => {
      const ua = a.urutan ?? Infinity;
      const ub = b.urutan ?? Infinity;
      if (ua !== ub) return ua - ub;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });
}

// Urutan berikutnya untuk planning BARU — selalu ditaruh di PALING BAWAH
// antrean (prioritas terendah) secara default; admin bisa geser ke atas
// lewat drag & drop kalau memang mau dikerjakan lebih dulu.
export function nextPlanningUrutan(sampels) {
  const queue = sortPlanningQueue(sampels);
  if (queue.length === 0) return 0;
  const maxUrutan = Math.max(...queue.map((s) => s.urutan ?? -1));
  return maxUrutan + 1;
}

// Bangun payload untuk reorderPlanning() dari urutan array id BARU (hasil
// drag & drop) — index di array = urutan baru (0 = paling atas).
export function buildReorderUpdates(orderedIds) {
  return (orderedIds ?? []).map((id, urutan) => ({ id, urutan }));
}

// ── Pin planning penting (permintaan Denny 2026-09) ───────────────────────────
// Planning yg dipin selalu di atas, terlepas status/urutan lainnya — urutan
// SESAMA yg dipin/tidak-dipin tetap pakai kriteria asli (bukan diacak).
export function sortWithPinnedFirst(sampels) {
  return [...(sampels ?? [])].sort((a, b) => {
    const pa = a.pinned ? 1 : 0;
    const pb = b.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa; // pinned (1) duluan
    return 0; // stabil, biarkan urutan relatif asli (Array.sort JS modern stable)
  });
}

// ── Komentar / diskusi Planning (permintaan Denny 2026-09: "saya ingin ini
// beneran dipakai untuk planing ... bisa diskusi nambahin komen, ada notif
// kalau ada yang bikin komen") ────────────────────────────────────────────

// Hanya pemilik komentar sendiri yang boleh hapus (dikontrol di UI — RLS DB
// sengaja permisif "authenticated full access", konsisten dgn tabel lain di
// app internal ini, lihat migration sampel_comments).
export function canDeleteComment(comment, currentUserEmail) {
  return !!comment?.user_email && !!currentUserEmail && comment.user_email === currentUserEmail;
}

// Nama tampilan komentar/riwayat — permintaan Denny 2026-09: "ga perlu ada
// @deera.id untuk namanya ya langsung aja capitalize". `profiles.full_name`
// (dan komentar lama yang sempat tersimpan sebagai email mentah) berupa
// username lowercase tanpa domain atau email penuh — fungsi ini menyeragamkan
// keduanya jadi Title Case tanpa domain, dipakai di titik TAMPIL (bukan
// tulis ulang data lama di DB) supaya komentar lama pun otomatis rapi.
export function formatDisplayName(nameOrEmail) {
  if (!nameOrEmail) return "";
  const base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  return base
    .split(/[.\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Mention "@all" — kirim ke SEMUA admin, bukan cuma yang dipilih satu-satu
// (permintaan Denny 2026-09: "bisa mention @all"). Direpresentasikan sbg
// pseudo-profile dgn email "*" (ditangani khusus di notify-sampel-mention
// Edge Function) supaya bisa lewat jalur mention yang sama persis (dropdown,
// insert ke teks, highlight) tanpa cabang logika terpisah.
export const ALL_MENTION = { id: "__all__", email: "*", full_name: "All" };

// Daftar profil siap pakai utk dropdown/highlight mention: "All" di paling
// atas + seluruh profil asli dgn nama sudah di-format (Title Case, no
// domain) — supaya nama yang MUNCUL di dropdown, yang DISISIPKAN ke teks,
// dan yang di-COCOKKAN regex highlight semuanya identik satu sama lain.
export function buildMentionProfiles(profiles) {
  return [
    ALL_MENTION,
    ...(profiles ?? []).map((p) => ({ ...p, full_name: formatDisplayName(p.full_name) || p.email })),
  ];
}

// Pecah teks komentar jadi segmen {text, isMention} berdasarkan nama profil
// yang muncul persis sbg "@Nama Lengkap" (case-insensitive, word-boundary) —
// dipakai CommentThread.jsx untuk render mention dgn warna beda. Nama lebih
// panjang dicek DULUAN supaya "@Budi Santoso" tidak keburu ke-match separuh
// jadi "@Budi" oleh nama lain yang kebetulan prefix-nya sama.
export function splitMentionSegments(text, profiles) {
  if (!text) return [];
  const names = (profiles ?? [])
    .map((p) => p.full_name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) return [{ text, isMention: false }];

  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`@(${escaped.join("|")})\\b`, "gi");
  const segments = [];
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index), isMention: false });
    segments.push({ text: match[0], isMention: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), isMention: false });
  return segments;
}

// ── Read receipts Diskusi (permintaan Denny 2026-09: "ada notif kalau belum
// di read ... bulatan kecil kasih tau ada berapa chat yang belum terbaca" +
// "info untuk mengetahui siapa saja yang sudah membaca chat tersebut") ──────

// commentsMeta: [{id, sampel_id, created_at, user_email}] SEMUA sampel (dari
// fetchAllCommentsMeta), reads: [{sampel_id, last_read_at}] milik SATU user
// (dari fetchReadsForUser) → { [sampelId]: unreadCount }. Komentar milik
// user sendiri TIDAK dihitung "belum dibaca" (buat apa notif diri sendiri).
export function computeUnreadCounts(commentsMeta, reads, currentUserEmail) {
  const lastReadMap = new Map((reads ?? []).map((r) => [r.sampel_id, r.last_read_at]));
  const counts = {};
  for (const c of commentsMeta ?? []) {
    if (c.user_email === currentUserEmail) continue;
    const lastRead = lastReadMap.get(c.sampel_id);
    const isUnread = !lastRead || c.created_at > lastRead;
    if (isUnread) counts[c.sampel_id] = (counts[c.sampel_id] ?? 0) + 1;
  }
  return counts;
}

// reads: [{user_email, user_name, last_read_at}] SATU sampel (dari
// fetchReadsBySampel) → nama-nama (sudah di-format, no domain) yang
// last_read_at-nya sudah >= `atOrAfter` (bisa waktu komentar TERAKHIR di
// thread — dipakai ringkasan bawah thread — ATAU waktu SATU komentar
// spesifik — dipakai indikator per-pesan, permintaan Denny 2026-09 "saya
// bisa cek chat Haikalfwz sudah dibaca oleh Denny, begitupun semua chat
// yang lain"). excludeEmails: satu email (string) atau beberapa (array) yang
// TIDAK ditampilkan di daftar — dipakai utk exclude diri sendiri (kita
// sendiri yg sedang baca, percuma ditampilkan) DAN penulis pesan itu sendiri
// (dia jelas sudah "membaca" pesannya sendiri, redundan ditampilkan).
export function buildReadByNames(reads, atOrAfter, excludeEmails) {
  if (!atOrAfter) return [];
  const excluded = Array.isArray(excludeEmails) ? excludeEmails : [excludeEmails];
  return (reads ?? [])
    .filter((r) => !excluded.includes(r.user_email) && r.last_read_at >= atOrAfter)
    .map((r) => formatDisplayName(r.user_name || r.user_email));
}

// Total unread lintas SEMUA planning (permintaan Denny 2026-09: "saya juga
// mau ada batch di produksi, bukan cuma di catatan, biar terlihat" — badge
// jumlah unread ditaruh juga di item nav "PRODUKSI", bukan cuma di tombol
// Catatan/Diskusi per kartu). Dipakai bareng `computeUnreadCounts` (map
// per-sampel) — cukup dijumlahkan, tidak perlu query tambahan.
export function sumUnreadCounts(unreadCounts) {
  return Object.values(unreadCounts ?? {}).reduce((sum, n) => sum + (n || 0), 0);
}

// Gabung histori status (product_history, dari fetchHistoryByKode) +
// komentar (sampel_comments) jadi SATU alur kronologis — permintaan Denny
// 2026-09: "intinya bisa membantu untuk planing". Tiap entri diseragamkan
// jadi {type, at, raw} supaya komponen timeline cukup render 1 daftar tanpa
// peduli sumber aslinya.
export function buildTimeline(history, comments) {
  const historyItems = (history ?? []).map((h) => ({ type: "history", at: h.changed_at, raw: h }));
  const commentItems = (comments ?? []).map((c) => ({ type: "comment", at: c.created_at, raw: c }));
  return [...historyItems, ...commentItems].sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
}

// ── Work Order: catatan & foto referensi dari diskusi ─────────────────────────
// Permintaan Denny 2026-10-08: di WO tercetak, kalimat seperti "tangannya ikut
// model kaya gini" membingungkan karena foto komentarnya tidak ikut tercetak,
// dan nama pengomentar tidak penting. Maka: (1) catatan dibuat poin-poin TANPA
// nama, (2) tiap foto komentar diberi label (Foto A, B, ...) dan kalimatnya
// menunjuk ke label itu, (3) foto berlabel dicetak di bagian "Foto Referensi".
export const MAX_WO_REF_FOTOS = 6;

function toPointers(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-\u2022*\u00b7]+\s*/, "").trim())
    .filter(Boolean);
}

/**
 * buildWoNotes(sampel, comments, { excludeUrls, maxRefs })
 * -> { text: "- poin\n- poin (lihat Foto A)", refFotos: [{label, url}] }
 * excludeUrls: foto yang sudah tercetak di WO (tidak perlu jadi referensi lagi).
 */
/**
 * listCommentFotos — foto yang dilampirkan di diskusi (kandidat Foto
 * Referensi), berurutan & unik; `excludeUrls` = foto yang sudah tercetak.
 */
export function listCommentFotos(comments, excludeUrls = []) {
  const seen = [];
  for (const c of comments ?? []) {
    for (const url of [c.image_url, c.target_foto_url]) {
      if (url && !excludeUrls.includes(url) && !seen.includes(url)) seen.push(url);
    }
  }
  return seen;
}

/**
 * buildWoNotes(sampel, comments, { excludeUrls, selected, maxRefs })
 * -> { text: "- poin\n- poin (lihat Foto A)", refFotos: [{label, url}] }
 * excludeUrls: foto yang sudah tercetak di WO (tidak perlu jadi referensi lagi).
 * selected: daftar URL yang DIPILIH admin sbg Foto Referensi (null = semua,
 * sampai maxRefs). Hanya foto terpilih yang diberi label & dirujuk di teks.
 */
export function buildWoNotes(sampel, comments, { excludeUrls = [], selected = null, maxRefs = MAX_WO_REF_FOTOS } = {}) {
  const refFotos = [];
  const labelFor = (url) => {
    if (!url || excludeUrls.includes(url)) return null;
    if (selected && !selected.includes(url)) return null;
    const found = refFotos.find((r) => r.url === url);
    if (found) return found.label;
    if (refFotos.length >= maxRefs) return null;
    const label = String.fromCharCode(65 + refFotos.length);
    refFotos.push({ label, url });
    return label;
  };

  const bullets = [...toPointers(sampel?.perubahan)];
  for (const c of comments ?? []) {
    const lines = toPointers(c.text);
    const labels = [labelFor(c.image_url), labelFor(c.target_foto_url)].filter(Boolean);
    const unique = [...new Set(labels)];
    const ref = unique.length ? ` (lihat Foto ${unique.join(" & ")})` : "";
    if (lines.length === 0) {
      if (ref) bullets.push(`Lihat Foto ${unique.join(" & ")}`);
      continue;
    }
    lines[lines.length - 1] += ref;
    bullets.push(...lines);
  }
  return { text: bullets.map((b) => `- ${b}`).join("\n"), refFotos };
}

// ── Planning Repeat ───────────────────────────────────────────────────────────
// Acuan repeat = PRODUK JADI (tabel products, punya kode) — bukan sampel.
// Hanya produk yang punya foto utama yang bisa dipilih.
export function productFotos(product) {
  return [product?.image, ...(product?.detail ?? [])].filter(Boolean);
}

export function repeatCandidates(products) {
  return (products ?? []).filter((p) => !!p.image);
}

// Data awal form planning dari produk acuan. Deera jualan grosir, jadi KODE
// (bukan nama) yang dipakai sbg identitas produk: nama rencana = "Repeat <kode>"
// (permintaan Denny 2026-10-08).
export function buildRepeatPrefill(product) {
  return {
    nama: `Repeat ${product.kode ?? String(product.nama ?? "").replace(/^repeat\s+/i, "")}`.trim(),
    modelFotos: productFotos(product).slice(0, 3),
    repeat: { id: product.id, kode: product.kode },
  };
}

// Foto yang dipakai saat repeat di-approve: foto produk acuan (terbaru);
// kalau produknya sudah tidak ada, jatuh ke model_foto planning itu sendiri.
export function repeatFotoFor(sampel, products) {
  const p = (products ?? []).find((x) => x.id === sampel?.repeat_dari_id || x.kode === sampel?.repeat_dari_kode);
  const foto = p ? productFotos(p) : [];
  return foto.length ? foto : sampel?.model_foto ?? [];
}

// ── Cetak langsung Work Order (A4) ────────────────────────────────────────────
// Permintaan Denny 2026-10-08: WO hampir selalu dibuka di PC yang terhubung
// printer, jadi ada tombol cetak langsung, kertas A4. Dokumen WO sudah
// diproporsikan A4 (700 x 990), maka PNG hasil capture dicetak memenuhi satu
// halaman A4 lewat iframe tersembunyi + @page A4 (tanpa margin printer).
export function buildPrintHtml(dataUrl) {
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>Work Order</title>' +
    "<style>@page{size:A4 portrait;margin:0}" +
    "html,body{margin:0;padding:0;background:#fff}" +
    "img{display:block;width:210mm;height:297mm}</style></head>" +
    `<body><img id="wo" src="${dataUrl}" alt="Work Order"></body></html>`
  );
}

export function printImageA4(dataUrl) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const cleanup = () => setTimeout(() => iframe.remove(), 1000);
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(buildPrintHtml(dataUrl));
    doc.close();
    const img = doc.getElementById("wo");
    const go = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    };
    if (img.complete && img.naturalWidth > 0) go();
    else {
      img.onload = go;
      img.onerror = () => {
        cleanup();
        reject(new Error("Gagal memuat gambar Work Order"));
      };
    }
  });
}
