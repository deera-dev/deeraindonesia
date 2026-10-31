import { cldUrl } from "@deera/shared/lib/cloudinary";
import {
  compressImageIfNeeded,
  MAX_IMAGE_MB,
  overSizeImageNotice,
} from "@deera/shared/lib/mediaUpload";
import { generateWABulkText, generateWAText } from "@deera/shared/lib/waFormat";

let shareInFlight = false;
let shareInFlightTimer = null;

export function fmtTanggal(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function fmtWaktu(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

    if (!navigator.share) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      return { method: "wa-link" };
    }

    let candidate = null;
    if (product.seri_warna) {
      candidate = {
        url: cldUrl(product.seri_warna, { width: 1080 }),
        kind: "image",
        suffix: "-seri-warna",
      };
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
              ? blob.type.includes("quicktime")
                ? "mov"
                : "mp4"
              : blob.type.includes("webp")
                ? "webp"
                : "jpg";
          files.push(
            new File([blob], `${product.kode}${candidate.suffix}.${ext}`, { type: blob.type }),
          );
        }
      } catch {}
    }

    if (files.length > 0 && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files, text });
        return { method: "share-file" };
      } catch (err) {
        if (err?.name === "AbortError" || err?.name === "InvalidStateError")
          return { method: "aborted" };
      }
    }

    try {
      await navigator.share({ text });
      return { method: "share-text" };
    } catch (err) {
      if (err?.name === "AbortError" || err?.name === "InvalidStateError")
        return { method: "aborted" };
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    return { method: "wa-link" };
  } finally {
    clearTimeout(shareInFlightTimer);
    shareInFlight = false;
  }
}

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

    if (!navigator.share) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      return { method: "wa-link" };
    }

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
    const files = results.filter((r) => r.status === "fulfilled").map((r) => r.value);

    if (files.length > 0 && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files, text });
        return { method: "share-file", fileCount: files.length };
      } catch (err) {
        if (err?.name === "AbortError" || err?.name === "InvalidStateError")
          return { method: "aborted" };
      }
    }

    try {
      await navigator.share({ text });
      return { method: "share-text" };
    } catch (err) {
      if (err?.name === "AbortError" || err?.name === "InvalidStateError")
        return { method: "aborted" };
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    return { method: "wa-link" };
  } finally {
    clearTimeout(shareInFlightTimer);
    shareInFlight = false;
  }
}

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

export const BADGE_META = {
  terlaris: {
    label: "Terlaris",
    hint: "Penjualan terbanyak",
    border: "border-amber-500",
    bg: "bg-amber-500",
    icon: "M2 5l3 12h14l3-12-5.5 4.5L12 3 7.5 9.5 2 5zM5 21h14",
    tier: "Mythic",
    frame: "rar rar-mythic",
  },
  cepat_habis: {
    label: "Cepat Habis",
    hint: "Paling cepat terjual sampai habis",
    border: "border-sky-500",
    bg: "bg-sky-500",
    icon: "M13 2L4 14h6l-1 8 9-12h-6l1-8z",
    tier: "Epic",
    frame: "rar rar-epic",
  },
  paling_untung: {
    label: "Paling Untung",
    hint: "Total margin terbesar",
    border: "border-emerald-500",
    bg: "bg-emerald-500",
    icon: "M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    tier: "Legendary",
    frame: "rar rar-legendary",
  },
  margin_tinggi: {
    label: "Margin Tertinggi",
    hint: "Persentase margin paling tebal",
    border: "border-violet-500",
    bg: "bg-violet-500",
    icon: "M19 5L5 19M7.5 7.5h.01M16.5 16.5h.01",
    tier: "Rare",
    frame: "rar rar-rare",
  },
  terbaru: {
    label: "Terbaru",
    hint: "Produk paling baru",
    border: "border-teal-500",
    bg: "bg-teal-500",
    icon: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z",
    tier: "Uncommon",
    frame: "rar rar-uncommon",
  },
  hampir_habis: {
    label: "Hampir Habis",
    hint: "Laku, stok tinggal sedikit",
    border: "border-indigo-500",
    bg: "bg-indigo-500",
    icon: "M6 2h12M6 22h12M7 2v4a5 5 0 002 4l3 2-3 2a5 5 0 00-2 4v4M17 2v4a5 5 0 01-2 4l-3 2 3 2a5 5 0 012 4v4",
    tier: "Rare",
    frame: "rar rar-rare",
  },
  kurang_jalan: {
    label: "Kurang Jalan",
    hint: "Penjualan paling sedikit",
    border: "border-slate-400 border-dashed",
    bg: "bg-slate-400",
    icon: "M3 7l6 6 4-4 8 8M15 17h6v-6",
    tier: "Common",
    frame: "rar rar-common",
  },
};
export const BADGE_ORDER = [
  "terlaris",
  "cepat_habis",
  "paling_untung",
  "margin_tinggi",
  "hampir_habis",
  "terbaru",
  "kurang_jalan",
];

export function describeBadgeHistory(history, currentBadge) {
  const fmt = (iso) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return (history ?? [])
    .filter((h) => BADGE_META[h.badge])
    .map((h) => {
      const current = h.badge === currentBadge;
      const hari = h.days ?? 1;
      const range =
        fmt(h.first_seen) === fmt(h.last_seen)
          ? fmt(h.first_seen)
          : `${fmt(h.first_seen)} – ${fmt(h.last_seen)}`;
      return {
        badge: h.badge,
        label: BADGE_META[h.badge].label,
        tier: BADGE_META[h.badge].tier,
        current,
        text: current
          ? `Sedang menyandang sejak ${fmt(h.first_seen)} (${hari} hari)`
          : `Pernah masuk nominasi ${range} · bertahan ${hari} hari`,
        reason: h.reason ? `${current ? "Alasan" : "Saat itu"}: ${h.reason}` : null,
      };
    })
    .sort((a, b) => Number(b.current) - Number(a.current));
}
