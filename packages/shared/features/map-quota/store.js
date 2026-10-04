/**
 * features/map-quota/store.js — penjaga batas pemakaian harian Google Maps
 * Platform (permintaan Denny 2026-10: cuma mau pakai free tier, jangan
 * sampai kebablasan ke billing).
 *
 * Google Maps Platform (per cek Okt 2026) kasih free tier BULANAN per SKU,
 * TIDAK saling pool satu sama lain:
 *   - Maps JavaScript API (map load)  : 10.000 / bulan
 *   - Geocoding API                   : 10.000 / bulan
 *   - Directions API                  : 40.000 / bulan
 * (Angka ini bisa berubah sewaktu-waktu di pihak Google — cek ulang di
 * Google Cloud Console kalau ragu, lihat catatan di hooks.js.)
 *
 * Guard ini SENGAJA dibikin HARIAN (bukan bulanan) dgn angka JAUH di bawah
 * batas bulanan Google (biar ada buffer kalau dipakai 7 hari/minggu penuh
 * sebulan, dan progress-nya gampang dipahami: "sisa X hari ini" vs "sisa X
 * bulan ini"). ANGKA DI SINI HANYA PROTEKSI SISI KLIEN — bukan pengganti
 * quota cap asli di Google Cloud Console (lihat README di hooks.js), krn
 * client-side bisa saja di-bypass (localStorage dihapus, buka tab baru,
 * dst). Tetap WAJIB di-set juga di Console utk proteksi sungguhan.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAP_QUOTA_LIMITS = {
  geocoding: 250, // 250 x 30 hari = 7.500/bulan (< 10.000 free tier)
  directions: 800, // 800 x 30 hari = 24.000/bulan (< 40.000 free tier)
  placesSearch: 100, // Text Search (New) tier Pro: 100 x 30 = 3.000/bulan (< 5.000 free)
  placeDetails: 25, // Place Details tier Enterprise (telp/rating/jam buka): 25 x 30 = 750/bulan (< 1.000 free)
  routeMatrix: 250, // ELEMEN matriks (origin x tujuan): 250 x 30 = 7.500/bulan (< 10.000 free)
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const useMapQuotaStore = create(
  persist(
    (set, get) => ({
      date: todayStr(),
      counts: { geocoding: 0, directions: 0 },

      _resetIfNewDay: () => {
        const today = todayStr();
        if (get().date !== today) {
          set({ date: today, counts: { geocoding: 0, directions: 0 } });
        }
      },

      remaining: (kind) => {
        get()._resetIfNewDay();
        const limit = MAP_QUOTA_LIMITS[kind] ?? Infinity;
        return Math.max(0, limit - (get().counts[kind] ?? 0));
      },

      // Cek + langsung "pakai" satu kuota dalam satu operasi atomik (hindari
      // race baca-lalu-tulis kalau dipanggil beruntun cepat). Return true
      // kalau masih ada jatah & berhasil dipakai, false kalau sudah habis.
      // `amount` > 1 utk SKU yang dihitung per elemen (mis. routeMatrix).
      tryConsume: (kind, amount = 1) => {
        get()._resetIfNewDay();
        const limit = MAP_QUOTA_LIMITS[kind] ?? Infinity;
        const current = get().counts[kind] ?? 0;
        if (current + amount > limit) return false;
        set((s) => ({ counts: { ...s.counts, [kind]: current + amount } }));
        return true;
      },
    }),
    { name: "map_quota_v1" },
  ),
);
