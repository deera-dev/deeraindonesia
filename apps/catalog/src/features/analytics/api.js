// REVISI (November 2026 — Denny: "saya juga mau di halaman trafik bisa
// terlihat lokasinya yang buka ada dimana"): sebelumnya trackVisit()
// manggil Supabase RPC LANGSUNG dari browser. Sekarang lewat 1 Edge
// Function (apps/catalog/api/track.js) dulu — satu-satunya cara baca
// header geo (x-vercel-ip-*) yang Vercel sisipkan di request Edge, yang
// TIDAK bisa dibaca browser sama sekali. Edge Function itu yang
// meneruskan ke track_visit RPC bareng data geo-nya.
export async function trackVisit(payload) {
  const res = await fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  if (!res.ok) throw new Error(`track gagal: ${res.status}`);
}
