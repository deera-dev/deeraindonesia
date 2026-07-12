# Laporan Implementasi — Analytics (BI) Phase 1

**Tanggal:** 12 Juli 2026
**Scope:** Overview + Trends (sesuai `ANALYTICS_ARCHITECTURE_PLAN.md` §7 Phase 1). Products/Markets/Customers/Category Filter SENGAJA belum diimplementasikan.

---

## 1. File yang Dibuat

### Migration
- `supabase/migrations/20260712_analytics_phase1_rpc.sql`

### Feature `apps/admin/src/features/analytics/`
```
api.js                              queries.js
store.js            store.test.js
hooks.js             hooks.test.js
constants.js
utils.js              utils.test.js
index.js
api.test.js
components/
  AnalyticsPage.jsx        AnalyticsPage.test.jsx
  GlobalFilterBar.jsx      GlobalFilterBar.test.jsx
  tabs/
    OverviewTab.jsx        OverviewTab.test.jsx
    TrendsTab.jsx           TrendsTab.test.jsx
  shared/
    KpiCard.jsx              KpiCard.test.jsx
    TrendChart.jsx            TrendChart.test.jsx
```
23 file baru (11 kode + 12 test — `queries.js`/`constants.js`/`index.js` tidak punya test terpisah karena tidak berisi logic bercabang, konsisten dengan pola `queries.js` di fitur lain di repo ini yang juga tidak selalu punya test file sendiri).

---

## 2. File yang Diubah

| File | Perubahan |
|---|---|
| `apps/admin/src/App.jsx` | Tambah `import { AnalyticsPage }` + route `/analytics` (dalam `ProtectedRoute`) |
| `apps/admin/src/App.test.jsx` | Tambah mock `./features/analytics` + test `renders AnalyticsPage at /analytics` |
| `apps/admin/src/shared/components/AdminBottomNav.jsx` | Tambah `IconAnalytics` + nav item "Analytics" (`/analytics`) — total 6→7 item |
| `apps/admin/src/shared/components/AdminBottomNav.test.jsx` | Update assertion jumlah nav jadi 7, tambah test "Analytics link is active at /analytics" + href |

Tidak ada file di luar 2 pasang ini yang diubah — tidak ada refactor di luar scope.

---

## 3. Migration yang Dibuat

**`20260712_analytics_phase1_rpc.sql`** — 1 file, 3 fungsi, idempotent (`CREATE OR REPLACE FUNCTION`). Divalidasi via `sqlfluff lint --dialect postgres` — 0 parse error (hanya warning gaya baris-panjang/indentasi, konsisten dengan seluruh migration RPC sebelumnya di repo ini).

---

## 4. RPC yang Dibuat

### `sales_flat(p_from date, p_to date)` — lapisan dasar
Meratakan `sales.items` (jsonb) jadi baris per kode×warna, dengan tanda (+/-) untuk retur sudah diterapkan, dan `revenue`/`profit` per baris sudah dihitung. Dipakai INTERNAL oleh kedua RPC di bawah — tidak dipanggil langsung dari frontend (tapi tetap di-`GRANT` ke `authenticated` untuk keperluan query manual admin).

Business rule kunci yang direplikasi dari kode JS asli (`apps/pos/src/features/kasir/hooks.js`, `packages/shared/lib/bepUtils.js`):
- Qty per item bisa berbentuk flat (`item.qty`) atau per-warna (`item.warna[].qty`) — array warna KOSONG `[]` tetap dianggap kasus flat (bug lama yang HAMPIR salah direplikasi saat desain, sudah diperbaiki di komentar migration §1).
- `type='retur'` membalik tanda qty/revenue/profit.
- `hpp` = snapshot `item.hpp` (harga pokok SAAT transaksi), bukan join ulang ke `products`/`hpp_template` — supaya profit historis tidak berubah retroaktif kalau HPP produk diedit kemudian.

### `analytics_trend(p_from, p_to, p_location, p_kode, p_granularity)`
Return `{ granularity, buckets: [{periode,revenue,profit,qty}], topProductTrend: [...], marketTrend: [...] }`. Dipakai LANGSUNG oleh tab Trends, dan dipanggil INTERNAL oleh `analytics_overview` (granularity otomatis untuk 3 chart kecil) — satu-satunya tempat logika bucketing/trend ditulis.

### `analytics_overview(p_from, p_to, p_location, p_kode)`
Return `{ kpi, quickInsight, marketSummary, trend }` — kpi (revenue/profit/qty/transaksi/customer/AOV), quickInsight (produk terlaris, produk profit tertinggi, pasar terbaik **by profit**, customer terbaik **by revenue**, sesuai keputusan final Denny di `ANALYTICS_ARCHITECTURE_PLAN.md` §12), marketSummary per lokasi, dan `trend` = hasil pemanggilan `analytics_trend()` dengan granularity otomatis (≤31 hari→day, ≤180→week, selebihnya→month).

**Koreksi yang disengaja terhadap notasi ringkas di dokumen desain**: `totalTransaksi` dihitung via `COUNT(DISTINCT sale_id) FILTER (WHERE type='sale')`, BUKAN `COUNT(*)` — karena RPC ini dibangun di atas `sales_flat` yang sudah dipecah per item×warna (1 transaksi bisa jadi banyak baris). Dijelaskan lengkap di komentar migration supaya tidak disalahpahami sebagai bug.

Dependency graph (tidak ada duplikasi logika unnest jsonb):
```
sales_flat()  →  analytics_trend()  →  analytics_overview() (memanggil trend secara internal)
```

Semua fungsi `LANGUAGE sql` (bukan `plpgsql`) supaya bisa di-inline oleh query planner — penting untuk performa full-range scan yang jadi pola akses khas Analytics.

---

## 5. Testing yang Dilakukan

### Unit test (Vitest)
```
apps/admin/src/features/analytics/api.test.js                                9 tests
apps/admin/src/features/analytics/hooks.test.js                              6 tests
apps/admin/src/features/analytics/store.test.js                              6 tests
apps/admin/src/features/analytics/utils.test.js                             19 tests
apps/admin/src/features/analytics/components/AnalyticsPage.test.jsx          7 tests
apps/admin/src/features/analytics/components/GlobalFilterBar.test.jsx        8 tests
apps/admin/src/features/analytics/components/tabs/OverviewTab.test.jsx       7 tests
apps/admin/src/features/analytics/components/tabs/TrendsTab.test.jsx         5 tests
apps/admin/src/features/analytics/components/shared/KpiCard.test.jsx         6 tests
apps/admin/src/features/analytics/components/shared/TrendChart.test.jsx      5 tests
                                                                    Subtotal 78 tests

apps/admin/src/App.test.jsx (existing, diperbarui)                          14 tests
apps/admin/src/shared/components/AdminBottomNav.test.jsx (existing, diperbarui) 12 tests
                                                                    Subtotal 26 tests

TOTAL                                                                      104 tests, SEMUA PASS
```
Dijalankan via `npx vitest run --config apps/admin/vitest.config.js` per file/direktori (dibagi beberapa batch untuk menghindari timeout 45 detik shell, bukan karena ada test lambat) — tidak ada kegagalan pada seluruh file yang dibuat/diubah.

### Verifikasi lain
- **Sintaks SQL**: `sqlfluff lint --dialect postgres` pada migration — 0 parse error.
- **Sintaks JS/JSX**: `esbuild` per file (23 file baru + 4 file diubah) — 0 error, sesuai protokol wajib repo ini (verifikasi setelah setiap penulisan file via bash/heredoc, BUKAN Windows Edit/Write tool — lihat catatan proses di §7).
- **Build produksi**: `npm run build:admin` (Vite) — sukses, 302 modul, tidak ada error. Warning ukuran chunk yang muncul adalah PRE-EXISTING (tidak disebabkan perubahan ini — didominasi `html-to-image` yang sudah dipakai fitur lain).

---

## 6. Kemungkinan Improvement untuk Phase 2

1. **Products tab** — RPC `analytics_products()` (leaderboard, harga dari transaksi aktual, movement fast/slow, inventory hari-cover) sesuai desain §5.4 di `ANALYTICS_ARCHITECTURE_PLAN.md`.
2. **Markets tab** — `analytics_markets()` + `analytics_market_detail()` (drill-down on-click, reuse `analytics_trend()` yang sudah ada).
3. **Customers tab** — `analytics_customers()`, termasuk subquery all-time terpisah untuk LTV/Repeat Customer (sudah diputuskan all-time di §12).
4. **Zero-filling periode kosong di trend chart** — saat ini `analytics_trend()` TIDAK mengisi bucket dengan value 0 untuk periode tanpa transaksi (grafik bisa terlihat "meloncat" kalau ada tanggal kosong di tengah rentang). Solusi: `generate_series` per granularity di-`LEFT JOIN` ke hasil agregasi. Sengaja tidak dikerjakan sekarang (instruksi eksplisit "jangan optimisasi prematur").
5. **Category filter asli** — saat ini belum ada sama sekali (bukan proxy `bahan` — itu juga ditunda). Butuh keputusan skema (`products.kategori`) sebelum dikerjakan.
6. **Chart library** — `TrendChart.jsx` saat ini adalah SVG murni buatan sendiri (tidak menambah dependency baru, karena `apps/admin` belum punya chart library terpasang sama sekali). Untuk kebutuhan visual lebih kaya (tooltip hover, zoom, area chart) di Phase 2+, pertimbangkan mengevaluasi library ringan (mis. Chart.js) — TIDAK dilakukan sekarang karena di luar scope Phase 1 dan berarti dependency baru yang perlu persetujuan terpisah.
7. **`topProductTrend`/`marketTrend`** — sudah DIHITUNG oleh RPC `analytics_trend()` (untuk dipakai Markets drill-down & Products di Phase berikutnya) tapi BELUM dirender di UI Phase 1 (sesuai instruksi "jangan chart tambahan"). Tidak perlu perubahan RPC saat Phase 2/3 dikerjakan — tinggal dikonsumsi dari response yang sudah ada.
8. **Index tambahan** (`sales_date_type_idx`, partial index `sales_pelanggan_id_idx`) yang direkomendasikan di `ANALYTICS_ARCHITECTURE_PLAN.md` §5.9 belum dibuat di migration ini (scope migration ini murni 3 fungsi RPC sesuai instruksi eksplisit "Jangan membuat migration lain"). Pertimbangkan menambahkannya di migration terpisah SEBELUM Phase 2 kalau volume data mulai terasa lambat — TIDAK mendesak untuk volume data saat ini (~2 bulan sejak sistem POS berjalan).
