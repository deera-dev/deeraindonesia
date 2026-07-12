# Laporan Implementasi — Analytics (BI) Phase 2: Products

**Tanggal:** 12 Juli 2026
**Scope:** Tab Products (Leaderboard, Harga, Movement, Inventory) di `apps/admin`, di atas fondasi Phase 1 (Overview + Trends) yang sudah ada. Tidak ada perubahan pada Overview, Trends, RPC Phase 1, Global Filter, atau business logic lain yang sudah berjalan.

---

## 1. File Baru

| File | Isi |
|---|---|
| `supabase/migrations/20260712_analytics_phase2_products_rpc.sql` | RPC `analytics_products()` — 1 fungsi baru, 427 baris termasuk dokumentasi lengkap business rule & edge case. |
| `apps/admin/src/features/analytics/components/shared/Leaderboard.jsx` | Komponen list ranking reusable ({kode, value} → baris list bernomor), dipakai 13× di ProductsTab, siap dipakai lagi untuk Markets/Customers Phase berikutnya. |
| `apps/admin/src/features/analytics/components/shared/Leaderboard.test.jsx` | 8 test. |
| `apps/admin/src/features/analytics/components/tabs/ProductsTab.jsx` | Tab Products — 4 section (Leaderboard, Harga, Movement, Inventory), 13 sub-list. |
| `apps/admin/src/features/analytics/components/tabs/ProductsTab.test.jsx` | 11 test. |

## 2. File yang Diubah

| File | Perubahan |
|---|---|
| `apps/admin/src/features/analytics/api.js` | Tambah `fetchAnalyticsProducts()` (pass-through RPC murni) + `EMPTY_PRODUCTS` fallback shape. Overview/Trend tidak disentuh. |
| `apps/admin/src/features/analytics/queries.js` | Tambah `analyticsKeys.products(...)` + `useAnalyticsProductsQuery()`. |
| `apps/admin/src/features/analytics/hooks.js` | Tambah `useAnalyticsProducts()` (pass-through, fallback struktur kosong). |
| `apps/admin/src/features/analytics/constants.js` | `ANALYTICS_TABS` jadi `[overview, products, trends]` (urutan sesuai instruksi). Tambah `PRODUCTS_LEADERBOARD_LIMIT=10` dan `LOW_STOCK_COVER_DAYS=7`. |
| `apps/admin/src/features/analytics/utils.js` | Tambah `fmtPercent()` dan `fmtDecimal()` — murni formatting, tidak ada agregasi. |
| `apps/admin/src/features/analytics/index.js` | Ekspor `useAnalyticsProducts` dari barrel. |
| `apps/admin/src/features/analytics/components/AnalyticsPage.jsx` | Import + render `<ProductsTab/>` saat `activeTab === "products"`. |
| `apps/admin/src/features/analytics/api.test.js`, `hooks.test.js`, `utils.test.js`, `components/AnalyticsPage.test.jsx` | Tambah test untuk fungsi/hook/tab baru; test Overview/Trends yang sudah ada tetap dipertahankan apa adanya (tidak ada regresi). |

Tidak ada perubahan pada: `store.js`, `GlobalFilterBar.jsx`, `OverviewTab.jsx`, `TrendsTab.jsx`, `KpiCard.jsx`, `InsightCard.jsx`, `TrendChart.jsx`, migration Phase 1, atau `App.jsx`/`AdminBottomNav.jsx` (tab Products muncul otomatis lewat `ANALYTICS_TABS`, tidak perlu route baru karena masih di bawah `/analytics`).

## 3. RPC: `analytics_products(p_from, p_to, p_location, p_kode, p_low_stock_cover_days)`

Dibangun di atas `sales_flat()` (Phase 1, tidak diubah) untuk seluruh metric transaksi, plus join langsung ke `stok_warna` (pola sama seperti `get_stock_summary`) untuk Inventory, dan query terpisah ke `sales`/`products` mentah (all-time, tanpa `sales_flat`) khusus `tidakPernahTerjual`.

Setiap entri list berbentuk `{kode, value}` — **sengaja tanpa `nama`** (instruksi eksplisit: tab Products cukup tampilkan kode). Setiap list dibatasi `LIMIT 10` di SQL.

Return:
```
{
  leaderboard: { terlaris, omsetTertinggi, profitTertinggi, marginTertinggi, marginTerendah },
  harga:       { hppTertinggi, hppTerendah, hargaJualTertinggi, hargaJualTerendah },
  movement:    { fastMoving, slowMoving },
  inventory:   { stokTerbanyak, stokHampirHabis, tidakPernahTerjual, tidakAdaPenjualanPeriode }
}
```

Sudah diverifikasi dengan `sqlfluff --dialect postgres` — 0 parse error (hanya warning gaya baris-panjang, sama seperti migration Phase 1).

## 4. Business Rule (sesuai §12 ANALYTICS_ARCHITECTURE_PLAN.md)

- **Harga & HPP** — dari `sales_flat` (transaksi aktual periode filter), bukan dari `products`/`variants` master, karena kasir bisa override harga manual saat checkout.
- **Pasar** — `p_location` tetap mempersempit semua angka (leaderboard, stok, cek "pernah terjual"), tapi tidak pernah jadi dimensi breakdown di output (tidak ada grouping per market di tab ini).
- **Produk Tidak Pernah Terjual** — **all-time**, query terpisah membaca `sales` mentah (bukan `sales_flat(p_from,p_to)` yang selalu dibatasi rentang), supaya tidak ikut berubah saat filter tanggal diganti.
- **Fast/Slow Moving** — `qty terjual periode ÷ jumlah hari periode`, hanya untuk kode dengan qty > 0.
- **Hari Cover / Stok Hampir Habis** — `total_stok ÷ qty_per_hari`, ambang default 7 hari (`LOW_STOCK_COVER_DAYS`, dikirim sebagai parameter RPC, bukan hardcode SQL). Produk dengan qty terjual = 0 **tidak** dihitung hari cover — otomatis masuk `tidakAdaPenjualanPeriode`.

Dua koreksi yang saya dokumentasikan eksplisit di komentar migration (pola sama seperti koreksi `totalTransaksi` di Phase 1):
1. `terlaris`/`omsetTertinggi`/`profitTertinggi` hanya menyertakan value > 0 — mencegah kode dengan retur net-negatif nongol sebagai "terlaris".
2. `fastMoving`/`slowMoving` mengecualikan qty=0 dengan alasan yang sama seperti aturan hari-cover — supaya "Slow Moving" dan "Tidak Ada Penjualan" tidak tumpang tindih.

## 5. Testing

13 file test (86 test case baru/diperbarui untuk fitur Products, ditambah seluruh test Phase 1 yang tetap hijau):

| Area | File | Test |
|---|---|---|
| RPC call | `api.test.js` | +6 (fetchAnalyticsProducts) |
| Hook | `hooks.test.js` | +3 (useAnalyticsProducts) |
| Formatting | `utils.test.js` | +7 (fmtPercent, fmtDecimal) |
| Komponen | `Leaderboard.test.jsx` | 8 (baru) |
| Komponen | `ProductsTab.test.jsx` | 11 (baru) |
| Halaman | `AnalyticsPage.test.jsx` | +2 (switch tab Products, urutan tab) |

Dijalankan dan lolos:
- `apps/admin/src/features/analytics/{utils,api,hooks,store}.test.js` — 55 test
- `apps/admin/src/features/analytics/components/shared/*` — 27 test
- `apps/admin/src/features/analytics/components/tabs/*` (termasuk `OverviewTab.test.jsx`/`TrendsTab.test.jsx` yang tidak diubah) — 24 test
- `AnalyticsPage.test.jsx`, `GlobalFilterBar.test.jsx`, `App.test.jsx`, `AdminBottomNav.test.jsx` — 43 test
- `npm run build:admin` — sukses (305 modul, tidak ada error)
- Truncation scan (`esbuild` syntax check) atas seluruh 29 file `.js`/`.jsx` di `features/analytics` — bersih

## 6. Kemungkinan Improvement Phase 3+

- **Phase 3 (Markets)** — `analytics_markets()`/`analytics_market_detail()` bisa reuse `<Leaderboard/>` yang baru dibuat di sini.
- **Retur Rate & Margin Negatif alert** (usulan §4 dokumen desain) — `marginTerendah` sudah menyingkap margin negatif secara pasif; alert eksplisit di Overview bisa jadi item terpisah.
- **`stokHampirHabis`/`tidakAdaPenjualanPeriode`/`tidakPernahTerjual` LIMIT 10** — kalau di pemakaian nyata ternyata daftar dead-stock lebih panjang dari 10 dan Denny butuh visibilitas penuh, tinggal naikkan `LIMIT` di SQL (parameter `PRODUCTS_LEADERBOARD_LIMIT` di FE hanya label, tidak perlu migration terpisah untuk ubah SQL `LIMIT`).
- **Materialized view / index tambahan** — belum diperlukan (tidak ada bukti query lambat), sesuai prinsip "jangan optimisasi prematur" yang sudah dipegang sejak Phase 1.
