/**
 * features/map-quota/hooks.js — public surface utk guard kuota Google Maps.
 *
 * Pola sama persis dgn `features/toast/hooks.js`: `useMapQuotaStore` dipakai
 * dari KOMPONEN React (misal utk nampilin progress bar "125/250 geocoding
 * hari ini"), sedangkan `mapQuota` adalah objek biasa (BUKAN hook) yang
 * membungkus `useMapQuotaStore.getState()` supaya modul non-React seperti
 * `packages/shared/lib/geocode.js` bisa panggil langsung dari fungsi async
 * biasa. Ini BUKAN pelanggaran Dependency Inversion (CLAUDE.md §7) — baik
 * komponen maupun `lib/geocode.js` tetap cuma menyentuh `hooks.js`, tidak
 * pernah import `store.js` langsung.
 *
 * ⚠️ PENTING — ini HANYA proteksi sisi klien (mencegah loop/bug yang ngirim
 * request bertubi-tubi, dan kasih peringatan dini ke user). Ini BUKAN
 * pengganti quota cap asli di Google Cloud Console, karena:
 *   - localStorage bisa dihapus user (reset counter)
 *   - device/browser lain akan punya counter sendiri-sendiri (tidak global)
 * Utk proteksi sungguhan yang tidak bisa dibypass, Denny WAJIB set "Requests
 * per day" quota di Google Cloud Console per API (APIs & Services -> pilih
 * API -> Quotas & System Limits) utk Maps JavaScript API, Geocoding API, dan
 * Directions API. Lihat MAP_QUOTA_LIMITS di store.js utk angka rekomendasi.
 */
import { useMapQuotaStore, MAP_QUOTA_LIMITS } from "./store";

export { useMapQuotaStore, MAP_QUOTA_LIMITS };

export const mapQuota = {
  tryConsume: (kind, amount = 1) => useMapQuotaStore.getState().tryConsume(kind, amount),
  remaining: (kind) => useMapQuotaStore.getState().remaining(kind),
  limit: (kind) => MAP_QUOTA_LIMITS[kind] ?? Infinity,
};
