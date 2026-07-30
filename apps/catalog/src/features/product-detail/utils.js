/**
 * features/product-detail/utils.js
 * Pure helper + side-effectful share utility untuk fitur detail produk.
 *
 * CATATAN PENTING: apps/catalog dipakai reseller (B2B). Teks share di sini
 * SENGAJA TIDAK menyertakan harga (berbeda dari generateWAText di
 * @deera/shared/lib/waFormat yang dipakai apps/admin) — kalau harga bocor ke
 * end user lewat forward pesan, reseller kita kesulitan menjual barangnya.
 */
import { cldUrl } from "@deera/shared/lib/cloudinary";
// Reuse urutan katalog (filter punya foto + sort created_at desc) dari
// product-catalog/utils.js supaya navigasi sebelumnya/selanjutnya di
// halaman detail konsisten dengan urutan scroll di katalog. Import
// utils.js lintas-fitur di layer yang sama ini analog dengan pola
// "api.js boleh import api.js fitur lain" di CLAUDE.md §4/§7.
import { sortCatalogProducts } from "../product-catalog/utils";

const CATALOG_BASE_URL = "https://catalog.deera.id";

// Guard against overlapping navigator.share() calls (mis. tap ganda) —
// Web Share API melempar InvalidStateError kalau dipanggil lagi sebelum
// share sebelumnya selesai, dan sebelumnya error itu TIDAK ditangani
// khusus jadi diam-diam jatuh ke fallback wa.me di bawah. Guard ini murni
// mencegah pemanggilan share() kedua sama sekali selagi yang pertama
// masih berjalan — bukan menunggu/antre, cuma no-op supaya tidak ada
// percobaan share() kedua yang bakal gagal.
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
 * buildShareText(product)
 * Teks caption untuk share produk — kode, nama, bahan, dan link ke halaman
 * detail publik (foto + video lengkap). Tidak ada harga.
 */
export function buildShareText(product) {
  const lines = [`*DEERA Indonesia*`, ``, `*${product.kode}*`, `*${product.nama}*`];

  if (product.bahan) {
    lines.push(``, `Bahan: ${product.bahan}`);
  }

  lines.push(``, `Lihat foto & video lengkap:`, `${CATALOG_BASE_URL}/code/${product.kode}`);

  return lines.join("\n");
}

/**
 * shareProductViaWA(product)
 * Share produk (foto/video + teks) via Web Share API supaya reseller bisa
 * meneruskan produk ke kontak/pelanggan mereka sendiri — pola sama persis
 * dengan shareProductViaWA di apps/admin/src/features/produk/utils.js,
 * hanya beda sumber teks (buildShareText, tanpa harga).
 *
 * Urutan lampiran (coba satu-satu, berhenti di yang pertama berhasil):
 * 1. Foto seri warna (representasi semua warna produk) — jika ada
 * 2. Foto utama — kalau seri warna tidak ada / gagal diunduh
 * 3. Video — kalau foto utama juga tidak ada / gagal
 * Lalu:
 * 4. navigator.share({ files, text }) — mobile, file(s) terlampir
 * 5. navigator.share({ text }) — fallback teks saja
 * 6. window.open wa.me — fallback desktop
 *
 * Guard `shareInFlight` mencegah navigator.share() dipanggil dua kali
 * bersamaan (mis. tap ganda) — panggilan kedua langsung return
 * { method: "busy" } tanpa mencoba share() sama sekali. Ini penting karena
 * Web Share API melempar InvalidStateError kalau share() dipanggil lagi
 * selagi panggilan sebelumnya masih berjalan, dan sebelumnya error itu
 * tidak ditangani khusus sehingga diam-diam jatuh ke fallback wa.me di
 * bawah. InvalidStateError kini ditangani sama seperti AbortError
 * (dianggap dibatalkan, TIDAK lanjut ke fallback berikutnya).
 *
 * @returns {{ method: string }} method yang berhasil dipakai
 */
// fetchWithTimeout — sama seperti fetch() biasa, tapi dibatalkan paksa
// setelah `ms` supaya network lambat TIDAK menghabiskan "transient user
// activation" browser (jendela waktu singkat, umumnya cuma beberapa detik,
// di mana browser masih menganggap navigator.share()/window.open() sebagai
// hasil aksi user). Kalau timeout habis sebelum fetch selesai, dianggap
// gagal (lempar) — pemanggil di bawah sudah punya try/catch utk lanjut ke
// lampiran berikutnya / text-only share.
async function fetchWithTimeout(url, ms = 2500) {
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
    const text = buildShareText(product);

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

    const files = [];

    // 1. Coba foto seri warna dulu (representasi semua warna produk)
    if (product.seri_warna) {
      try {
        const imgUrl = cldUrl(product.seri_warna, { width: 1080 });
        const res = await fetchWithTimeout(imgUrl);
        if (res.ok) {
          const blob = await res.blob();
          const ext = blob.type.includes("webp") ? "webp" : "jpg";
          files.push(new File([blob], `${product.kode}-seri-warna.${ext}`, { type: blob.type }));
        }
      } catch {
        // foto seri warna gagal/timeout, lanjut ke foto utama
      }
    }

    // 2. Kalau tidak ada / gagal, coba foto utama
    if (files.length === 0 && product.image) {
      try {
        const imgUrl = cldUrl(product.image, { width: 1080 });
        const res = await fetchWithTimeout(imgUrl);
        if (res.ok) {
          const blob = await res.blob();
          const ext = blob.type.includes("webp") ? "webp" : "jpg";
          files.push(new File([blob], `${product.kode}.${ext}`, { type: blob.type }));
        }
      } catch {
        // foto gagal/timeout, lanjut ke video
      }
    }

    // 3. Kalau masih tidak ada, coba video
    if (files.length === 0 && product.video) {
      try {
        const res = await fetchWithTimeout(product.video, 4000);
        if (res.ok) {
          const blob = await res.blob();
          const ext = blob.type.includes("mp4")
            ? "mp4"
            : blob.type.includes("quicktime") ? "mov" : "mp4";
          files.push(new File([blob], `${product.kode}.${ext}`, { type: blob.type }));
        }
      } catch {
        // video gagal/timeout, lanjut ke text-only share
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
 * getAdjacentKodes(products, kode)
 * Hitung kode produk sebelumnya/selanjutnya berdasarkan urutan katalog
 * resmi (sortCatalogProducts), plus posisi & total — dipakai untuk tombol
 * navigasi sebelumnya/selanjutnya di ProductDetailPage.
 */
export function getAdjacentKodes(products, kode) {
  const sorted = sortCatalogProducts(products);
  const index = sorted.findIndex((p) => p.kode === kode);
  if (index === -1) {
    return { prevKode: null, nextKode: null, position: 0, total: sorted.length };
  }
  return {
    prevKode: index > 0 ? sorted[index - 1].kode : null,
    nextKode: index < sorted.length - 1 ? sorted[index + 1].kode : null,
    position: index + 1,
    total: sorted.length,
  };
}
