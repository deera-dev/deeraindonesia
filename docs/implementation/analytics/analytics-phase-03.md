# Laporan Implementasi — Analytics (BI) Phase 3: Markets

**Tanggal:** 12 Juli 2026
**Scope:** Tab Markets (Ringkasan seluruh market + Detail 1 market lazy) di `apps/admin`, di atas fondasi Phase 1 (Overview + Trends) dan Phase 2 (Products) yang sudah ada. Tidak ada perubahan pada Overview, Products, Trends, Global Filter, atau RPC yang sudah ada — `analytics_market_detail()` hanya memanggil `analytics_trend()` yang sudah ada (komposisi, bukan modifikasi).

---

## 1. File Baru

| File | Isi |
|---|---|
| `supabase/migrations/20260712_analytics_phase3_markets_rpc.sql` | RPC `analytics_markets()` + `analytics_market_detail()` — 260 baris termasuk dokumentasi lengkap business rule & edge case. |
| `apps/admin/src/features/analytics/components/tabs/MarketsTab.jsx` | Tab Markets — ringkasan kartu per market + state expand lokal (`useState`). |
| `apps/admin/src/features/analytics/components/tabs/MarketsTab.test.jsx` | 9 test, termasuk 4 test khusus lazy-loading di level tab. |
| `apps/admin/src/features/analytics/components/tabs/MarketDetailPanel.jsx` | Panel detail 1 market — KPI kecil + Produk Terlaris (reuse `Leaderboard`) + Trend Revenue (reuse `TrendChart`). |
| `apps/admin/src/features/analytics/components/tabs/MarketDetailPanel.test.jsx` | 7 test. |
| `apps/admin/src/features/analytics/queries.test.js` | **Baru** — 7 test yang secara langsung memverifikasi gerbang `enabled: !!market` di `useAnalyticsMarketDetailQuery` (lapisan tempat aturan lazy sesungguhnya ditegakkan). |

## 2. File yang Diubah

| File | Perubahan |
|---|---|
| `apps/admin/src/features/analytics/api.js` | Tambah `fetchAnalyticsMarkets()` dan `fetchAnalyticsMarketDetail()` (pass-through RPC murni) + fallback shape kosong masing-masing. |
| `apps/admin/src/features/analytics/queries.js` | Tambah `analyticsKeys.markets(...)`/`marketDetail(...)`, `useAnalyticsMarketsQuery()` (selalu aktif), `useAnalyticsMarketDetailQuery()` (`enabled: !!market && !!fromDate && !!toDate` — satu-satunya penegakan lazy). |
| `apps/admin/src/features/analytics/hooks.js` | Tambah `useAnalyticsMarkets()` dan `useAnalyticsMarketDetail(market)` (pass-through, fallback struktur kosong). |
| `apps/admin/src/features/analytics/constants.js` | `ANALYTICS_TABS` jadi `[overview, products, markets, trends]`. Tambah `MARKET_DETAIL_PRODUCT_LIMIT=5`. |
| `apps/admin/src/features/analytics/index.js` | Ekspor `useAnalyticsMarkets`/`useAnalyticsMarketDetail` dari barrel. |
| `apps/admin/src/features/analytics/components/AnalyticsPage.jsx` | Import + render `<MarketsTab/>` saat `activeTab === "markets"`. |
| `apps/admin/src/features/analytics/api.test.js`, `hooks.test.js`, `components/AnalyticsPage.test.jsx` | Tambah test untuk fungsi/hook/tab baru; test Overview/Products/Trends yang sudah ada tetap dipertahankan apa adanya. |

Tidak ada perubahan pada: `store.js`, `utils.js`, `GlobalFilterBar.jsx`, `OverviewTab.jsx`, `ProductsTab.jsx`, `TrendsTab.jsx`, `Leaderboard.jsx`, `TrendChart.jsx`, `KpiCard.jsx`/`InsightCard.jsx`, migration Phase 1/2, atau `App.jsx`/`AdminBottomNav.jsx`.

> **Catatan verifikasi tambahan:** saat menjalankan test suite pasca-implementasi, ditemukan `OverviewTab.jsx` (file Phase 1/2 yang TIDAK disentuh sesi ini) sempat berisi versi lama (`quickInsight.produkTerlaris?.kode` alih-alih `?.nama`) dan `OverviewTab.test.jsx` sempat terpotong di mount Linux — keduanya bukan hasil perubahan sesi ini, terdeteksi via `npx vitest run` + `esbuild` syntax check, dan langsung diperbaiki kembali ke versi yang sudah benar dari Phase 2 sebelum lanjut. Tidak ada perubahan behavior/data pada Overview.

## 3. RPC

### `analytics_markets(p_from, p_to, p_kode)`

Dibangun di atas `sales_flat()` (Phase 1, tidak diubah). **Sengaja tidak menerima `p_location`** — kalau filter Market Global Filter ikut membatasi RPC ini, hasilnya cuma 1 baris, bertentangan dengan instruksi "seluruh market selalu ditampilkan". Frontend hanya meneruskan `fromDate`/`toDate`/`kode`, `filter.location` sengaja diabaikan (dikonfirmasi lewat test khusus di `hooks.test.js`).

Return:
```
{ markets: [{location, revenue, profit, qty, customer}, ...] }
```

Business rule: **selalu 3 baris** (gudang/cideng/tegalgubug) via `LEFT JOIN` dari daftar lokasi tetap — market tanpa transaksi tetap muncul dengan value 0, bukan hilang. `customer` = `COUNT(DISTINCT pelanggan_id)`, walk-in (`NULL`) dikecualikan. Diurutkan `ORDER BY profit DESC`.

### `analytics_market_detail(p_market, p_from, p_to, p_kode)`

Dipanggil **hanya saat user expand 1 market**. Dibangun di atas `sales_flat()` untuk KPI + Produk Terlaris (top 5, filter `qty > 0`, pola sama seperti leaderboard `terlaris` di Phase 2), dan **memanggil `analytics_trend()` secara internal** untuk `trend` (granularity otomatis, heuristik identik dengan `analytics_overview` — ≤31 hari harian, ≤180 hari mingguan, selebihnya bulanan). Tidak ada logika trend yang ditulis ulang.

Return:
```
{ revenue, profit, qty, customer, produkTerlaris: [{kode, value}], trend: {...} }
```

Sudah diverifikasi dengan `sqlfluff --dialect postgres` — 0 parse error.

## 4. Business Rule (sesuai instruksi + §5.5/§5.6 ANALYTICS_ARCHITECTURE_PLAN.md)

- Filter Market di Global Filter Bar **tidak berlaku** di tab Markets — pesan kecil di UI mengomunikasikan ini eksplisit ke user.
- `analytics_markets` selalu 3 baris (termasuk market kosong), diurut profit DESC.
- `analytics_market_detail` hanya untuk 1 market yang dipilih; `produkTerlaris` top 5 by qty (qty > 0 saja); `trend` = pemanggilan langsung `analytics_trend()`.
- **Lazy loading ditegakkan di 2 lapis**: (1) `MarketDetailPanel` hanya di-*mount* saat `expandedLocation === market` di `MarketsTab.jsx`, (2) `enabled: !!market` di `useAnalyticsMarketDetailQuery` sebagai jaring pengaman kedua kalau suatu saat komponen dipanggil unconditionally.
- Hanya 1 market bisa expanded dalam satu waktu (state `expandedLocation` tunggal) — klik market lain otomatis menutup yang sebelumnya.

## 5. Frontend / UI

- Urutan tab: **Overview | Products | Markets | Trends**.
- Ringkasan Market = kartu per lokasi (bukan table baris), grid 2 kolom untuk Revenue/Profit/Qty/Customer — konsisten dengan pola Market Summary di OverviewTab (redesign mobile-first sebelumnya). Tidak ada horizontal scroll, tidak ada ellipsis.
- Tombol "Lihat Detail"/"Tutup Detail" per kartu meng-expand `MarketDetailPanel` inline (accordion), bukan modal — sesuai arahan "kalau card terlalu sempit, gunakan layout vertikal".
- `MarketDetailPanel` reuse penuh: `<Leaderboard/>` (sama komponen dari tab Products) untuk Produk Terlaris, `<TrendChart/>` (sama komponen dari Overview/Trends) untuk Trend Revenue — tidak ada komponen baru yang menduplikasi keduanya.

## 6. Testing

38 test baru/diperbarui untuk fitur Markets, ditambah seluruh test Phase 1/2 yang tetap hijau (total 192 test di seluruh fitur `analytics`):

| Area | File | Test |
|---|---|---|
| RPC call | `api.test.js` | +13 (fetchAnalyticsMarkets ×6, fetchAnalyticsMarketDetail ×6, termasuk assert `p_location` TIDAK pernah dikirim) |
| Query (lazy gate) | `queries.test.js` | 7 (baru) — termasuk transisi `market: null → "gudang"` dan verifikasi `fetchAnalyticsMarketDetail` benar-benar tidak terpanggil sebelum itu |
| Hook | `hooks.test.js` | +9 (useAnalyticsMarkets ×4, useAnalyticsMarketDetail ×4, termasuk assert `filter.location` tidak diteruskan) |
| Komponen | `MarketDetailPanel.test.jsx` | 7 (baru) |
| Komponen | `MarketsTab.test.jsx` | 9 (baru) — termasuk 4 test lazy-loading di level tab (panel tidak mount sebelum klik, mount hanya utk market yang diklik, unmount saat tutup, hanya 1 expanded dalam satu waktu) |
| Halaman | `AnalyticsPage.test.jsx` | +3 (switch tab Markets, urutan 4 tab, Customers belum ada) |

Dijalankan dan lolos (per kelompok, karena runtime environment jsdom cukup berat untuk 1 kali jalan penuh dalam batas waktu tooling):
- `{utils,api,hooks,store,queries}.test.js` — 81 test
- `components/tabs/*` (5 file, termasuk `OverviewTab.test.jsx`/`ProductsTab.test.jsx`/`TrendsTab.test.jsx` yang tidak diubah) — 40 test
- `components/shared/*` + `AnalyticsPage.test.jsx` + `GlobalFilterBar.test.jsx` — 45 test
- `App.test.jsx` + `AdminBottomNav.test.jsx` — 26 test
- `npm run build:admin` — sukses (307 modul, tidak ada error)
- Truncation scan (`esbuild` syntax check) atas seluruh 34 file `.js`/`.jsx` di `features/analytics` — bersih

## 7. Kemungkinan Improvement Phase 4 (Customers)

- `analytics_customers()` bisa reuse pola yang sama persis dengan `analytics_market_detail()`: `produkTerlaris`/leaderboard pakai `<Leaderboard/>`, dan kalau butuh trend per customer, tinggal panggil `analytics_trend()` lagi (tidak perlu RPC trend baru).
- Pola **lazy-detail** yang baru dibangun di sini (`MarketDetailPanel` + `enabled: !!param`) adalah kandidat kuat untuk direplikasi di Customers kalau tab tersebut juga butuh drill-down per pelanggan (mengingat jumlah pelanggan biasanya jauh lebih banyak dari 3 market, lazy-loading di sana justru lebih penting).
- `anonymousTransactionCount`/`anonymousRevenue` (sudah didesain di §5.7 dokumen arsitektur) perlu diputuskan cara ditampilkan di UI — bisa jadi catatan kecil mirip catatan "Filter Market tidak berlaku" yang dipakai di tab Markets ini.
- Definisi "Repeat Customer" (all-time) sudah diputuskan Denny sebelumnya (§12 poin 4) — tidak perlu pertanyaan baru, tinggal implementasi.
