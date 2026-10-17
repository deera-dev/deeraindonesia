export const config = { runtime: "edge" };

const SITE = "https://deera.id";

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
}

export default async function handler() {
  const urls = [{ loc: `${SITE}/catalog`, changefreq: "daily", priority: "1.0" }];
  try {
    const base = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (base && key) {
      const res = await fetch(`${base}/rest/v1/products?select=kode,created_at&image=not.is.null&order=position.asc&limit=2000`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const rows = await res.json();
        for (const p of rows) {
          urls.push({
            loc: `${SITE}/code/${encodeURIComponent(p.kode)}`,
            lastmod: p.created_at ? String(p.created_at).slice(0, 10) : null,
            changefreq: "weekly",
            priority: "0.8",
          });
        }
      }
    }
  } catch {
  }
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;
  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
