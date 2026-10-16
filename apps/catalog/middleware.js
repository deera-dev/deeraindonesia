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
  // /code/:kode → data produk; / dan /catalog → daftar produk (HTML yang bisa dirayapi crawler).
  matcher: ["/", "/catalog", "/code/:kode*"],
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
  if (!url || typeof url !== "string") return "https://deera.id/og-image.jpg";
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
  if (url.pathname === "/" || url.pathname === "/catalog") return renderCatalog();
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
      `?kode=eq.${encodeURIComponent(kode)}&select=kode,nama,bahan,image,variants,warna,detail&limit=1`;

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
    const pageUrl = `https://deera.id/code/${encodeURIComponent(product.kode)}`;

    const prices = (product.variants ?? []).map((v) => Number(v.harga)).filter((n) => n > 0);
    const low = prices.length ? Math.min(...prices) : null;
    const imgs = [image, ...(Array.isArray(product.detail) ? product.detail.slice(0, 4).map(cldOgImage) : [])];
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${product.nama} (${product.kode})`,
      sku: product.kode,
      description,
      brand: { "@type": "Brand", name: "Deera Indonesia" },
      image: imgs,
      ...(low
        ? { offers: { "@type": "Offer", url: pageUrl, priceCurrency: "IDR", price: String(low), itemCondition: "https://schema.org/NewCondition" } }
        : {}),
    }).replace(/</g, "\\u003c");

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
<script type="application/ld+json">${jsonLd}</script>
</head>
<body><h1>${escapeHtml(product.nama)} (${escapeHtml(product.kode)})</h1><p>${escapeHtml(description)}</p></body>
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


/**
 * Versi HTML katalog untuk crawler: judul, deskripsi, daftar semua produk (nama + foto + tautan
 * ke /code/KODE) dan JSON-LD ItemList. Manusia tetap mendapat aplikasi React seperti biasa.
 */
export async function renderCatalog() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return next();
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/products?select=kode,nama,bahan,image&image=not.is.null&order=position.asc&limit=500`,
      { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } },
    );
    if (!res.ok) return next();
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return next();

    const site = "https://deera.id";
    const title = "Deera Indonesia | Gamis & Busana Muslim Premium";
    const description = `Katalog ${rows.length} model gamis dan busana muslim premium Deera Indonesia. Tersedia di Pasar Tasik Cideng Jakarta dan Pasar Sandang Tegalgubug Cirebon.`;
    const items = rows.map((p) => ({
      url: `${site}/code/${encodeURIComponent(p.kode)}`,
      name: `${p.nama} (${p.kode})`,
      image: cldOgImage(p.image),
    }));
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      url: `${site}/catalog`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: items.length,
        itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, url: it.url, name: it.name, image: it.image })),
      },
    }).replace(/</g, "\\u003c");
    const list = items
      .map((it) => `<li><a href="${escapeHtml(it.url)}"><img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}" width="300" height="300" loading="lazy" />${escapeHtml(it.name)}</a></li>`)
      .join("\n");

    const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${site}/catalog" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${site}/og-image.jpg" />
<meta property="og:url" content="${site}/catalog" />
<meta property="og:site_name" content="Deera Indonesia" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<h1>Deera Indonesia — Gamis &amp; Busana Muslim Premium</h1>
<p>${escapeHtml(description)}</p>
<ul>
${list}
</ul>
</body>
</html>`;
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  } catch {
    return next();
  }
}
