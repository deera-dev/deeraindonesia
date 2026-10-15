/**
 * features/produk/utils.js
 * Pure helpers + side-effectful share utility untuk fitur produk.
 */
import { generateWAText, generateWABulkText } from "@deera/shared/lib/waFormat";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import {
  MAX_IMAGE_MB,
  compressImageIfNeeded,
  overSizeImageNotice,
} from "@deera/shared/lib/mediaUpload";

// Guard against overlapping navigator.share() calls (mis. tap ganda) —
// Web Share API melempar InvalidStateError kalau dipanggil lagi sebelum
// share sebelumnya selesai, dan sebelumnya error itu TIDAK ditangani
// khusus jadi diam-diam jatuh ke fallback wa.me di bawah (bug dilaporkan
// Denny: "kadang kelempar ke api.whatsapp"). Guard ini murni mencegah
// pemanggilan share() kedua sama sekali selagi yang pertama masih
// berjalan — bukan menunggu/antre, cuma no-op supaya tidak ada percobaan
// share() kedua yang bakal gagal.
let shareInFlight = false;
let shareInFlightTimer = null;

// Failsafe: di beberapa browser/WebView Android, kalau user membatalkan
// share sheet TANPA memilih aplikasi apa pun, Promise dari navigator.share()
// kadang tidak pernah resolve/reject sama sekali (quirk nyata, bukan
// hipotetis) — tanpa failsafe ini, `shareInFlight` akan macet permanen di
// `true` dan tombol share jadi TIDAK BISA DIPAKAI SAMA SEKALI sampai
// halaman di-reload (bug dilaporkan Denny: "bagikannya jadi gabisa sama
// sekali"). Timer ini melepas guard secara paksa setelah 8 detik walau
// share() masih menggantung, supaya tombol share tidak pernah permanen mati.


/**
 * fmtTanggal(dateStr)
 * Format tanggal transaksi ke "26 Mei 2025" — pola sama seperti fmtDate di
 * features/pelanggan/utils.js. Dipakai SalesDetailList di
 * ProductDetailModal.jsx untuk daftar pembeli per transaksi (permintaan
 * Denny 2026-09: "ada info juga siapa saja pembeli yang sudah pernah
 * membeli produk tersebut").
 */
export function fmtTanggal(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * shareProductViaWA(product)
 * Berbagi produk ke WhatsApp.
 *
 * Lampiran: HANYA SATU kandidat dicoba (prioritas: foto seri warna > foto
 * utama > video) — TIDAK cascade ke kandidat berikutnya kalau kandidat
 * pertama gagal/timeout (lihat komentar panjang di fetchWithTimeout &
 * dalam fungsi di bawah untuk alasan kritisnya — bug "klik share gaada
 * efek sama sekali" yang dilaporkan Denny, root cause: transient user
 * activation habis sebelum navigator.share() sempat dipanggil).
 * Lalu:
 * 1. navigator.share({ files, text }) — mobile/desktop dgn Web Share API, file attached
 * 2. navigator.share({ text }) — fallback teks saja
 * 3. window.open wa.me — fallback desktop tanpa Web Share API
 *
 * Guard `shareInFlight` mencegah navigator.share() dipanggil dua kali
 * bersamaan (mis. tap ganda) — panggilan kedua langsung return
 * { method: "busy" } tanpa mencoba share() sama sekali. Ini penting karena
 * Web Share API melempar InvalidStateError kalau share() dipanggil lagi
 * selagi panggilan sebelumnya masih berjalan, dan sebelumnya error itu
 * tidak ditangani khusus sehingga diam-diam jatuh ke fallback wa.me di
 * bawah (bug dilaporkan Denny: "kadang kelempar ke api.whatsapp").
 * InvalidStateError kini ditangani sama seperti AbortError (dianggap
 * dibatalkan, TIDAK lanjut ke fallback berikutnya).
 *
 * @returns {{ method: string }} method yang berhasil dipakai
 */
// fetchWithTimeout — sama seperti fetch() biasa, tapi dibatalkan paksa
// setelah `ms` supaya network lambat TIDAK menghabiskan "transient user
// activation" browser (jendela waktu singkat, umumnya cuma beberapa detik
// di Chrome, di mana browser masih menganggap navigator.share()/
// window.open() sebagai hasil aksi user). Kalau timeout habis sebelum
// fetch selesai, dianggap gagal (lempar) — pemanggil di bawah sudah punya
// try/catch utk lanjut ke text-only share.
async function fetchWithTimeout(url, ms = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function shareProductViaWA(product) {
  if (shareInFlight) {
    return { method: "busy" };
  }
  shareInFlight = true;
  clearTimeout(shareInFlightTimer);
  shareInFlightTimer = setTimeout(() => {
    shareInFlight = false;
  }, 8000);
  try {
    const text = generateWAText(product);

    // Browser TANPA Web Share API sama sekali (kebanyakan desktop selain
    // Chrome/Edge di Windows/ChromeOS) — LANGSUNG ke fallback wa.me tanpa
    // fetch foto apa pun. Sebelumnya kode ini tetap fetch foto (await,
    // bisa makan waktu network) meski ujung-ujungnya cuma dipakai
    // navigator.share yang TIDAK ADA — delay fetch itu menghabiskan
    // "transient user activation" browser, jadi window.open() di step
    // terakhir dianggap BUKAN hasil aksi user & di-blok popup blocker
    // secara diam-diam (window.open mengembalikan null, tanpa error
    // apa pun) — inilah akar masalah "gabisa share sama sekali" yang
    // dilaporkan Denny, bukan cuma soal guard yang macet.
    if (!navigator.share) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      return { method: "wa-link" };
    }

    // BUG FIX (2026-07, dilaporkan Denny: "share produk di admin diklik
    // gaada efek apapun, gaada error"): sebelumnya kode di sini mencoba
    // fetch 3 kandidat lampiran BERURUTAN (seri warna → foto utama →
    // video), tiap kandidat baru dicoba kalau yang sebelumnya gagal/
    // timeout. Worst-case total delay SEBELUM navigator.share() sempat
    // dipanggil sama sekali: 2.5 dtk + 2.5 dtk + 4 dtk = ~9 detik (mis.
    // kalau Cloudinary belum sempat cache hasil transform width:1080 utk
    // salah satu foto, atau network kantor lambat). Chrome/Edge di
    // Windows (yang Denny pakai) MENDUKUNG navigator.share, jadi kode
    // tidak pernah nyasar ke fallback wa.me langsung di atas — dan
    // "transient user activation" dari klik tombol biasanya cuma
    // bertahan sekitar beberapa detik. Begitu delay fetch melebihi
    // jendela itu, navigator.share() DAN window.open() fallback paling
    // bawah dua-duanya ditolak browser secara DIAM-DIAM (tanpa error apa
    // pun terlempar ke JS, window.open cuma mengembalikan null) — persis
    // gejala yang dilaporkan: klik, tidak ada error, tidak ada efek sama
    // sekali. Sekarang: HANYA SATU kandidat dicoba (prioritas tetap sama
    // — seri warna > foto utama > video), TIDAK cascade ke kandidat lain
    // kalau gagal, dan timeout dipangkas ke 1.5 detik supaya total delay
    // sebelum share() dipanggil jauh di bawah jendela activation browser.
    let candidate = null;
    if (product.seri_warna) {
      candidate = { url: cldUrl(product.seri_warna, { width: 1080 }), kind: "image", suffix: "-seri-warna" };
    } else if (product.image) {
      candidate = { url: cldUrl(product.image, { width: 1080 }), kind: "image", suffix: "" };
    } else if (product.video) {
      candidate = { url: product.video, kind: "video", suffix: "" };
    }

    const files = [];
    if (candidate) {
      try {
        const res = await fetchWithTimeout(candidate.url, candidate.kind === "video" ? 2500 : 1500);
        if (res.ok) {
          const blob = await res.blob();
          const ext =
            candidate.kind === "video"
              ? blob.type.includes("quicktime") ? "mov" : "mp4"
              : blob.type.includes("webp") ? "webp" : "jpg";
          files.push(
            new File([blob], `${product.kode}${candidate.suffix}.${ext}`, { type: blob.type }),
          );
        }
      } catch {
        // gagal/timeout — lanjut TANPA lampiran (share teks saja), JANGAN
        // coba kandidat lain, itulah inti perbaikan bug ini.
      }
    }

    // 4. Share dengan file jika tersedia
    if (files.length > 0 && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files, text });
        return { method: "share-file" };
      } catch (err) {
        if (err?.name === "AbortError" || err?.name === "InvalidStateError") return { method: "aborted" };
        // canShare berhasil tapi share gagal karena alasan lain — coba text-only
      }
    }

    // 5. Fallback: share teks saja
    try {
      await navigator.share({ text });
      return { method: "share-text" };
    } catch (err) {
      if (err?.name === "AbortError" || err?.name === "InvalidStateError") return { method: "aborted" };
    }

    // 6. Fallback terakhir: buka wa.me (mis. navigator.share ada tapi terus
    // gagal karena alasan lain, mis. activation browser sudah keburu habis)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    return { method: "wa-link" };
  } finally {
    clearTimeout(shareInFlightTimer);
    shareInFlight = false;
  }
}

/**
 * shareProductsViaWA(products)
 * Berbagi BANYAK produk sekaligus ke WhatsApp (share massal dari Admin —
 * dipicu dari BulkShareModal.jsx). Sama seperti shareProductViaWA di atas,
 * tapi menggabungkan semua produk jadi SATU pesan teks
 * (generateWABulkText) + (opsional) SATU foto per produk yang di-attach
 * bersamaan lewat navigator.share({ files: [...] }) — di browser/OS yang
 * mendukungnya (umumnya Android Chrome & desktop Chrome/Edge terbaru),
 * WhatsApp menerima banyak file sekaligus sebagai satu "album" di satu
 * chat. Kalau Web Share API tidak tersedia/gagal, fallback SELALU teks
 * saja (wa.me TIDAK BISA melampirkan file sama sekali — keterbatasan nyata
 * WhatsApp, bukan bug), jadi user tetap bisa share link+detail produk,
 * hanya tanpa foto.
 *
 * Guard `shareInFlight` DIPAKAI BERSAMA dengan shareProductViaWA (module-
 * level, sengaja) — keduanya sama-sama memanggil navigator.share() dan
 * TIDAK BOLEH tumpang tindih (lihat komentar guard di atas).
 *
 * Beda dari shareProductViaWA (single-produk): SEMUA kandidat foto
 * di-fetch PARALEL (Promise.allSettled), bukan satu per satu — supaya
 * total waktu tunggu SEBELUM navigator.share() dipanggil tetap ~1.5 detik
 * (jendela "transient user activation" browser) walau produk yang dipilih
 * banyak. Produk yang foto-nya gagal/timeout fetch tetap ikut di teks,
 * hanya tanpa foto — TIDAK membatalkan keseluruhan share.
 *
 * @param {Array} products
 * @returns {{ method: string, fileCount?: number }}
 */
export async function shareProductsViaWA(products) {
  if (shareInFlight) {
    return { method: "busy" };
  }
  shareInFlight = true;
  clearTimeout(shareInFlightTimer);
  shareInFlightTimer = setTimeout(() => {
    shareInFlight = false;
  }, 8000);
  try {
    const list = products ?? [];
    const text = generateWABulkText(list);

    // Sama seperti shareProductViaWA: browser tanpa Web Share API sama
    // sekali → LANGSUNG wa.me tanpa fetch foto apa pun (cegah popup
    // diblok karena delay fetch menghabiskan transient activation).
    if (!navigator.share) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      return { method: "wa-link" };
    }

    // Satu kandidat foto per produk (seri_warna > foto utama — TIDAK coba
    // video utk share massal, supaya total waktu fetch tetap terkendali
    // walau jumlah produk banyak).
    const candidates = list
      .map((p) =>
        p.seri_warna
          ? { p, url: cldUrl(p.seri_warna, { width: 1080 }), suffix: "-seri-warna" }
          : p.image
            ? { p, url: cldUrl(p.image, { width: 1080 }), suffix: "" }
            : null,
      )
      .filter(Boolean);

    const results = await Promise.allSettled(
      candidates.map(async ({ p, url, suffix }) => {
        const res = await fetchWithTimeout(url, 1500);
        if (!res.ok) throw new Error("fetch gagal");
        const blob = await res.blob();
        const ext = blob.type.includes("webp") ? "webp" : "jpg";
        return new File([blob], `${p.kode}${suffix}.${ext}`, { type: blob.type });
      }),
    );
    const files = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    if (files.length > 0 && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files, text });
        return { method: "share-file", fileCount: files.length };
      } catch (err) {
        if (err?.name === "AbortError" || err?.name === "InvalidStateError") return { method: "aborted" };
        // canShare berhasil tapi share gagal karena alasan lain — coba text-only
      }
    }

    try {
      await navigator.share({ text });
      return { method: "share-text" };
    } catch (err) {
      if (err?.name === "AbortError" || err?.name === "InvalidStateError") return { method: "aborted" };
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    return { method: "wa-link" };
  } finally {
    clearTimeout(shareInFlightTimer);
    shareInFlight = false;
  }
}

/**
 * processImageFile(file, opt)
 * Helper dipakai ImageSection.jsx: validasi ukuran satu File image, dan
 * kompres otomatis kalau > MAX_IMAGE_MB. Mengembalikan objek siap-simpan
 * untuk state mainImage/detailImages ({ type:"file", file, preview,
 * status:"done", originalSizeMB, compressedSizeMB, compressed }), atau
 * null kalau gagal total (masih > limit setelah dikompres / error proses)
 * — pemanggil bertanggung jawab menampilkan pesan dari onError dan TIDAK
 * menyimpan file ini ke state.
 *
 * @param {File} file
 * @param {{ onNotice?: (msg: string) => void, onError?: (msg: string) => void }} opt
 */
export async function processImageFile(file, { onNotice, onError } = {}) {
  const preview = URL.createObjectURL(file);
  const originalSizeMB = file.size / (1024 * 1024);

  if (originalSizeMB <= MAX_IMAGE_MB) {
    return {
      type: "file",
      file,
      preview,
      status: "done",
      originalSizeMB,
      compressedSizeMB: originalSizeMB,
      compressed: false,
    };
  }

  onNotice?.(overSizeImageNotice());
  try {
    const result = await compressImageIfNeeded(file);
    if (result.stillTooBig) {
      onError?.(
        `Gambar masih melebihi batas maksimum ${MAX_IMAGE_MB} MB setelah dikompresi. Silakan gunakan gambar dengan ukuran yang lebih kecil.`,
      );
      return null;
    }
    return {
      type: "file",
      file: result.file,
      preview,
      status: "done",
      originalSizeMB: result.originalSizeMB,
      compressedSizeMB: result.compressedSizeMB,
      compressed: result.compressed,
    };
  } catch (err) {
    console.error("[processImageFile] gagal kompres gambar:", err);
    onError?.("Gagal memproses gambar. Coba gambar lain.");
    return null;
  }
}

/**
 * filterAndSortProducts(products, filter, { stokMap, soldQtyMap, search })
 *
 * Kalkulasi murni utk grid Admin Page — search box + modal filter (size,
 * warna, status stok, lokasi stok, range harga jual, range HPP, sort).
 * Dipakai baik utk hasil FINAL (filter.applied) maupun PREVIEW jumlah
 * produk di footer modal (filter.draft, sebelum tombol Terapkan ditekan)
 * — dua pemanggilan, satu fungsi, supaya logic tidak pernah dobel.
 *
 * - `lokasi` ("gudang"/"cideng"/"tegalgubug") = ada stok (>0) di lokasi
 *   itu, TIDAK peduli lokasi lain (lihat keputusan di riwayat chat).
 * - Range harga dicek terhadap SELURUH variants[].harga produk (match
 *   kalau ADA salah satu varian yang masuk rentang).
 * - sort "terlaris" pakai `soldQtyMap` (all-time, dari RPC
 *   get_product_sold_qty) — kode yang tidak ada di map dianggap 0.
 */
export function filterAndSortProducts(
  products,
  filter,
  { stokMap = {}, soldQtyMap = {}, search = "" } = {},
) {
  const q = search.trim().toLowerCase();
  const hargaMin = filter.hargaMin === "" ? null : Number(filter.hargaMin);
  const hargaMax = filter.hargaMax === "" ? null : Number(filter.hargaMax);
  const hppMin = filter.hppMin === "" ? null : Number(filter.hppMin);
  const hppMax = filter.hppMax === "" ? null : Number(filter.hppMax);

  const filtered = (products ?? []).filter((p) => {
    if (q) {
      const matchSearch =
        p.kode.toLowerCase().includes(q) ||
        (p.nama ?? "").toLowerCase().includes(q) ||
        (p.bahan ?? "").toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    if (filter.size) {
      const variantSizes = (p.variants ?? []).map((v) => v.size);
      if (!variantSizes.includes(filter.size)) return false;
    }

    if (filter.warna) {
      const productWarna = p.warna ?? [];
      if (!productWarna.includes(filter.warna)) return false;
    }

    const s = stokMap[p.kode] ?? { gudang: 0, cideng: 0, tegalgubug: 0 };
    const total = (s.gudang ?? 0) + (s.cideng ?? 0) + (s.tegalgubug ?? 0);

    if (filter.stokStatus === "habis" && total > 0) return false;
    if (filter.stokStatus === "ada" && total === 0) return false;

    if (filter.lokasi && filter.lokasi !== "semua" && !((s[filter.lokasi] ?? 0) > 0)) {
      return false;
    }

    if (hargaMin !== null || hargaMax !== null) {
      const hargaList = (p.variants ?? []).map((v) => Number(v.harga) || 0);
      const matchHarga = hargaList.some(
        (h) => (hargaMin === null || h >= hargaMin) && (hargaMax === null || h <= hargaMax),
      );
      if (!matchHarga) return false;
    }

    if (hppMin !== null || hppMax !== null) {
      const hpp = Number(p.hpp) || 0;
      if (hppMin !== null && hpp < hppMin) return false;
      if (hppMax !== null && hpp > hppMax) return false;
    }

    return true;
  });

  const byNama = (a, b) =>
    (a.nama ?? "").localeCompare(b.nama ?? "", "id", { sensitivity: "base" });
  const byTanggal = (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "");
  const byTerlaris = (a, b) => (soldQtyMap[a.kode] ?? 0) - (soldQtyMap[b.kode] ?? 0);
  // Default "terbaru" (permintaan Denny 2026-08): produk terbaru dibuat
  // duluan, lalu nama A-Z sebagai tiebreak kalau created_at sama.
  const byTerbaruThenNama = (a, b) => {
    const d = -byTanggal(a, b);
    return d !== 0 ? d : byNama(a, b);
  };

  switch (filter.sort) {
    case "terlama":
      return [...filtered].sort(byTanggal);
    case "terlaris":
      return [...filtered].sort((a, b) => -byTerlaris(a, b));
    case "paling-sedikit":
      return [...filtered].sort(byTerlaris);
    case "nama-az":
      return [...filtered].sort(byNama);
    case "nama-za":
      return [...filtered].sort((a, b) => -byNama(a, b));
    case "terbaru":
    default:
      return [...filtered].sort(byTerbaruThenNama);
  }
}


// ── Lencana produk istimewa (permintaan Denny 2026-10-16) ────────────────────
// Satu kategori = SATU produk (dinamis, dihitung ulang dari data terbaru) dan
// satu produk maksimal memegang satu lencana (urutan prioritas di BADGE_ORDER).
// Perhitungannya di backend: RPC get_product_badges (lihat features/produk/api.js);
// file ini hanya menyimpan tampilan (label, warna) tiap lencana.
// Kartu produk yang menang diberi border khusus + ikon di kiri atas foto.
export const BADGE_META = {
  terlaris: { label: "Terlaris", hint: "Penjualan terbanyak", border: "border-amber-500", bg: "bg-amber-500", icon: "M2 5l3 12h14l3-12-5.5 4.5L12 3 7.5 9.5 2 5zM5 21h14", tier: "Mythic", frame: "rar rar-mythic" },
  cepat_habis: { label: "Cepat Habis", hint: "Paling cepat terjual sampai habis", border: "border-sky-500", bg: "bg-sky-500", icon: "M13 2L4 14h6l-1 8 9-12h-6l1-8z", tier: "Epic", frame: "rar rar-epic" },
  paling_untung: { label: "Paling Untung", hint: "Total margin terbesar", border: "border-emerald-500", bg: "bg-emerald-500", icon: "M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", tier: "Legendary", frame: "rar rar-legendary" },
  margin_tinggi: { label: "Margin Tertinggi", hint: "Persentase margin paling tebal", border: "border-violet-500", bg: "bg-violet-500", icon: "M19 5L5 19M7.5 7.5h.01M16.5 16.5h.01", tier: "Rare", frame: "rar rar-rare" },
  terbaru: { label: "Terbaru", hint: "Produk paling baru", border: "border-teal-500", bg: "bg-teal-500", icon: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z", tier: "Uncommon", frame: "rar rar-uncommon" },
  hampir_habis: { label: "Hampir Habis", hint: "Laku, stok tinggal sedikit", border: "border-indigo-500", bg: "bg-indigo-500", icon: "M6 2h12M6 22h12M7 2v4a5 5 0 002 4l3 2-3 2a5 5 0 00-2 4v4M17 2v4a5 5 0 01-2 4l-3 2 3 2a5 5 0 012 4v4", tier: "Rare", frame: "rar rar-rare" },
  kurang_jalan: { label: "Kurang Jalan", hint: "Penjualan paling sedikit", border: "border-slate-400 border-dashed", bg: "bg-slate-400", icon: "M3 7l6 6 4-4 8 8M15 17h6v-6", tier: "Common", frame: "rar rar-common" },
};
export const BADGE_ORDER = ["terlaris", "cepat_habis", "paling_untung", "margin_tinggi", "hampir_habis", "terbaru", "kurang_jalan"];

/** Ringkas riwayat lencana (dari backend) jadi baris tampilan: sedang menyandang vs pernah masuk nominasi. */
export function describeBadgeHistory(history, currentBadge) {
  const fmt = (iso) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return (history ?? [])
    .filter((h) => BADGE_META[h.badge])
    .map((h) => ({
      badge: h.badge,
      label: BADGE_META[h.badge].label,
      tier: BADGE_META[h.badge].tier,
      current: h.badge === currentBadge,
      text: h.badge === currentBadge
        ? `Sedang menyandang sejak ${fmt(h.first_seen)}`
        : `Pernah masuk nominasi (${fmt(h.first_seen)}${h.last_seen && fmt(h.last_seen) !== fmt(h.first_seen) ? ` – ${fmt(h.last_seen)}` : ""})`,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current));
}
