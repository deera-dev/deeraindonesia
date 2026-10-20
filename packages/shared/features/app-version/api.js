export async function fetchLatestVersion() {
  const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memeriksa versi terbaru");
  const data = await res.json();
  return data.version;
}
