import type { Product } from "@deera/shared/features/products/schema";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { sortCatalogProducts } from "../product-catalog/utils";

const CATALOG_BASE_URL = "https://catalog.deera.id";

let shareInFlight = false;
let shareInFlightTimer: ReturnType<typeof setTimeout> | undefined;

export type ShareResult =
  | { method: "busy" }
  | { method: "share-file" }
  | { method: "share-text" }
  | { method: "aborted" }
  | { method: "wa-link" };

export type Media =
  | { type: "image"; src: string; blurSrc: string; alt: string }
  | { type: "video"; src: string; poster: string };

export function buildShareText(product: Pick<Product, "kode" | "nama" | "bahan">): string {
  const lines = [`*DEERA Indonesia*`, ``, `*${product.kode}*`, `*${product.nama}*`];

  if (product.bahan) {
    lines.push(``, `Bahan: ${product.bahan}`);
  }

  lines.push(``, `Lihat foto & video lengkap:`, `${CATALOG_BASE_URL}/code/${product.kode}`);

  return lines.join("\n");
}

async function fetchWithTimeout(url: string, ms = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function shareProductViaWA(
  product: Pick<Product, "kode" | "nama" | "bahan" | "seri_warna" | "image" | "video">,
): Promise<ShareResult> {
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

    if (!navigator.share) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      return { method: "wa-link" };
    }

    const files: File[] = [];

    if (product.seri_warna) {
      try {
        const imgUrl = cldUrl(product.seri_warna, { width: 1080 });
        const res = await fetchWithTimeout(imgUrl);
        if (res.ok) {
          const blob = await res.blob();
          const ext = blob.type.includes("webp") ? "webp" : "jpg";
          files.push(new File([blob], `${product.kode}-seri-warna.${ext}`, { type: blob.type }));
        }
      } catch {}
    }

    if (files.length === 0 && product.image) {
      try {
        const imgUrl = cldUrl(product.image, { width: 1080 });
        const res = await fetchWithTimeout(imgUrl);
        if (res.ok) {
          const blob = await res.blob();
          const ext = blob.type.includes("webp") ? "webp" : "jpg";
          files.push(new File([blob], `${product.kode}.${ext}`, { type: blob.type }));
        }
      } catch {}
    }

    if (files.length === 0 && product.video) {
      try {
        const res = await fetchWithTimeout(product.video, 4000);
        if (res.ok) {
          const blob = await res.blob();
          const ext = blob.type.includes("mp4")
            ? "mp4"
            : blob.type.includes("quicktime")
              ? "mov"
              : "mp4";
          files.push(new File([blob], `${product.kode}.${ext}`, { type: blob.type }));
        }
      } catch {}
    }

    if (files.length > 0 && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files, text });
        return { method: "share-file" };
      } catch (err) {
        if (err instanceof Error && (err.name === "AbortError" || err.name === "InvalidStateError"))
          return { method: "aborted" };
      }
    }

    try {
      await navigator.share({ text });
      return { method: "share-text" };
    } catch (err) {
      if (err instanceof Error && (err.name === "AbortError" || err.name === "InvalidStateError"))
        return { method: "aborted" };
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    return { method: "wa-link" };
  } finally {
    clearTimeout(shareInFlightTimer);
    shareInFlight = false;
  }
}

export interface AdjacentKodes {
  prevKode: string | null;
  nextKode: string | null;
  position: number;
  total: number;
}

export function getAdjacentKodes(
  products: Product[] | null | undefined,
  kode: string,
): AdjacentKodes {
  const sorted = sortCatalogProducts(products);
  const index = sorted.findIndex((p) => p.kode === kode);
  if (index === -1) {
    return { prevKode: null, nextKode: null, position: 0, total: sorted.length };
  }
  return {
    prevKode: index > 0 ? (sorted[index - 1]?.kode ?? null) : null,
    nextKode: index < sorted.length - 1 ? (sorted[index + 1]?.kode ?? null) : null,
    position: index + 1,
    total: sorted.length,
  };
}

const SITE = "https://deera.id";

export interface ProductSeo {
  title: string;
  description: string;
  canonical: string;
  image: string | undefined;
  jsonLd: Record<string, unknown>;
}

export function buildProductSeo(product: Product | null | undefined): ProductSeo {
  if (!product) {
    return { title: "", description: "", canonical: "", image: undefined, jsonLd: {} };
  }
  const prices = (product.variants ?? []).map((v) => Number(v.harga)).filter((n) => n > 0);
  const low = prices.length ? Math.min(...prices) : null;
  const url = `${SITE}/code/${encodeURIComponent(product.kode)}`;
  const images = [product.image, ...(Array.isArray(product.detail) ? product.detail : [])]
    .filter(Boolean)
    .slice(0, 5);
  const warna =
    Array.isArray(product.warna) && product.warna.length
      ? ` Tersedia ${product.warna.length} warna.`
      : "";
  const description = `${product.nama}${product.bahan ? ` (${product.bahan})` : ""} — koleksi gamis & busana muslim premium Deera Indonesia.${warna}${low ? ` Mulai Rp ${low.toLocaleString("id-ID")}.` : ""}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.nama} (${product.kode})`,
    sku: product.kode,
    description,
    brand: { "@type": "Brand", name: "Deera Indonesia" },
    category: "Gamis & Busana Muslim",
    ...(images.length ? { image: images } : {}),
    ...(low
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "IDR",
            price: String(low),
            itemCondition: "https://schema.org/NewCondition",
          },
        }
      : {}),
  };
  return {
    title: `${product.kode} — ${product.nama} | Deera Indonesia`,
    description,
    canonical: url,
    image: product.image || undefined,
    jsonLd,
  };
}
