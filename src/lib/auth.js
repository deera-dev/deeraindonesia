const KEY = "admin_auth";
const TTL = 24 * 60 * 60 * 1000; // 1 hari

export function isAdminAuth() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < TTL;
  } catch {
    return false;
  }
}

export function setAdminAuth() {
  localStorage.setItem(KEY, JSON.stringify({ ts: Date.now() }));
}

export function clearAdminAuth() {
  localStorage.removeItem(KEY);
}
