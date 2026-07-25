import { next } from "@vercel/edge";

/**
 * middleware.js — Vercel Edge Middleware untuk apps/catalog.
 *
 * MASALAH: apps/catalog adalah SPA murni (Vite build, satu index.html untuk
 * semua route via vercel.json rewrite). Meta tag Open Graph statis di
 * index.html cuma pas untuk homepage — saat link produk (/code/:kode)
 * di-share ke WhatsApp/dll, crawler platform itu TIDAK menjalankan
 * JavaScript, jadi mereka baca index.html mentah dan selalu dapat gambar
 * generik, bukan foto produk yang sebenarnya.
 *
 * SOLUSI: middleware ini jalan di edge SEBELUM rewrite ke index.html.
 * Untuk request biasa (browser manusia) -> next() -> lanjut ke SPA seperti
 * biasa, tidak ada perubahan apa pun. Untuk request dari bot crawler yang
 * dikenali (lewat User-Agent) ke /code/:kode -> fetch data produk dari
 * Supabase REST API (pakai anon key, sama seperti yang dipakai client-side)
 * -> balas HTML minimal berisi og:title/og:image/og:description sesuai
 * produk tsb, supaya preview link di WA/FB/dll menampilkan foto produk.
 *
 * CATATAN: karena berjalan di Vercel Edge Runtime (bukan Node.js biasa),
 * hindari API Node-only (fs, path, dst). Env var VITE_SUPABASE_URL &
 * VITE_SUPABASE_ANON_KEY dibaca lewat process.env — sudah tersedia di
 * Vercel Project Settings karena dipakai juga saat build Vite (prefix VITE_
 * hanya berpengaruh ke bundling client, tidak membatasi akses process.env
 * di edge/serverless function).
 */

export const config = {
  matcher: "/code/:kode*",
};

// User-Agent bot yang dikenal MENGAMBIL preview link (perlu og:image
// dinamis). Googlebot disertakan supaya hasil pencarian juga dapat
// deskripsi & gambar yang benar per produk (bonus SEO), bukan wajib.
const BOT_UA_REGEX =
  /facebookexternalhit|Facebot|WhatsApp|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot|Pinterest|redditbot|vkShare|SkypeUriPreview|Googlebot|Bingbot/i;

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function cldOgImage(url) {
  if (!url || typeof url !== "string") return "https://catalog.deera.id/og-image.jpg";
  if (!url.includes("/upload/")) return url;
  const [before, after] = url.split("/upload/");
  return `${before}/upload/f_auto,q_auto,w_1200,h_1200,c_fill/${after}`;
}

export default async function middleware(request) {
  const userAgent = request.headers.get("user-agent") || "";
  if (!BOT_UA_REGEX.test(userAgent)) {
    return next();
  }

  const url = new URL(request.url);
  const kode = decodeURIComponent(
    url.pathname.replace(/^\/code\//, "").replace(/\/+$/, ""),
  );
  if (!kode) return next();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return next();

  try {
    const apiUrl =
      `${supabaseUrl}/rest/v1/products` +
      `?kode=eq.${encodeURIComponent(kode)}&select=kode,nama,bahan,image&limit=1`;

    const res = await fetch(apiUrl, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!res.ok) return next();

    const rows = await res.json();
    const product = Array.isArray(rows) ? rows[0] : null;
    if (!product) return next();

    const title = `${product.kode} — ${product.nama} | Deera Indonesia`;
    const description = product.bahan
      ? `${product.nama} (${product.bahan}) — koleksi Deera Indonesia. Lihat foto & video lengkap.`
      : `${product.nama} — koleksi Deera Indonesia. Lihat foto & video lengkap.`;
    const image = cldOgImage(product.image);
    const pageUrl = `https://catalog.deera.id/code/${encodeURIComponent(product.kode)}`;

    const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(pageUrl)}" />
<meta property="og:type" content="product" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:url" content="${escapeHtml(pageUrl)}" />
<meta property="og:site_name" content="Deera Indonesia" />
<meta property="og:locale" content="id_ID" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body></body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch {
    // Supabase gagal dihubungi / respons tidak terduga -> jangan blokir
    // request, biarkan lanjut ke SPA normal (fallback ke og:image generik
    // dari index.html).
    return next();
  }
}
