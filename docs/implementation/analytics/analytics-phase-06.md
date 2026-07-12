# Laporan Implementasi — Analytics Phase 6 (Advanced Analytics)

Tanggal: 2026-07-12
Status: **SELESAI** — seluruh test PASS, build PASS, sqlfluff PASS, esbuild (truncation scan) PASS.

## Ringkasan

Phase 6 menambahkan tab baru **Advanced** berisi insight bisnis tingkat
lanjut: Return Rate, Margin Portfolio, Top Growth/Declining Product,
Revenue/Profit Contribution, Product Mix, Pareto Analysis (80/20), New vs
Returning Revenue, Average Basket Size, Average Item per Transaksi,
Weekday Performance, Hourly Performance, dan ringkasan MoM/YoY. Seluruh
metric dihitung di 1 RPC baru (`analytics_advanced`) — frontend murni
formatting, sesuai prinsip RPC-first yang sudah dipakai sejak Phase 1.

## File Baru

| File | Baris | Keterangan |
| --- | --- | --- |
| `supabase/migrations/20260712_analytics_phase6_advanced_rpc.sql` | 462 | RPC `analytics_advanced()` — seluruh metric Phase 6 |
| `apps/admin/src/features/analytics/components/shared/BarList.jsx` | 55 | Komponen reusable baru: bar list kronologis (BEDA dari Leaderboard yang me-ranking) — dipakai Weekday & Hourly Performance |
| `apps/admin/src/features/analytics/components/shared/BarList.test.jsx` | 52 | 6 test |
| `apps/admin/src/features/analytics/components/tabs/AdvancedTab.jsx` | 263 | Tab Advanced — 8 section (KPI, Perbandingan Periode, Growth/Declining, Contribution, Product Mix, Pareto, New vs Returning, Performa Waktu) |
| `apps/admin/src/features/analytics/components/tabs/AdvancedTab.test.jsx` | 145 | 14 test |

## File yang Diubah

| File | Perubahan |
| --- | --- |
| `api.js` | Tambah `fetchAnalyticsAdvanced()` + `EMPTY_ADVANCED` (bentuk kosong) |
| `queries.js` | Tambah `useAnalyticsAdvancedQuery()` + `analyticsKeys.advanced` |
| `hooks.js` | Tambah `useAnalyticsAdvanced()` (pass-through murni, fallback struktur kosong, `refetch` diteruskan konsisten pola Phase 5) |
| `constants.js` | Tambah entri `"advanced"` di `ANALYTICS_TABS` (paling kanan — urutan tab lama tidak berubah), `ADVANCED_GROWTH_LIMIT`, `ADVANCED_CONTRIBUTION_LIMIT`, `ADVANCED_PARETO_ITEMS_LIMIT` (label UI saja, bukan pembatas data — pembatas sesungguhnya di SQL) |
| `AnalyticsPage.jsx` | Import + render `<AdvancedTab/>` saat `activeTab === "advanced"` |
| `api.test.js` | Tambah 5 test `fetchAnalyticsAdvanced` |
| `queries.test.js` | Tambah 2 test `useAnalyticsAdvancedQuery` |
| `hooks.test.js` | Tambah 3 test `useAnalyticsAdvanced` + 1 test refetch pass-through |
| `AnalyticsPage.test.jsx` | Update tab count 5→6, urutan tab, tambah test switch ke Advanced |

## RPC yang Dibuat

**`analytics_advanced(p_from, p_to, p_location, p_kode)`** — dibangun
sepenuhnya di atas `sales_flat()` (Phase 1), TIDAK ada logika unnest jsonb
yang ditulis ulang. Return jsonb berisi 9 section: `kpi`, `growth`,
`contribution`, `productMix`, `pareto`, `newVsReturning`,
`weekdayPerformance`, `hourlyPerformance`, `periodComparison`. Detail
lengkap ada di komentar migration SQL (462 baris, sebagian besar
dokumentasi business rule).

**SENGAJA TIDAK dibuat**: RPC/chart terpisah untuk "Revenue vs Profit
Comparison" dan deret waktu "Monthly Comparison" — keduanya SUDAH tercakup
tab Trends existing (chart gabungan Revenue/Profit/Qty + toggle granularity
Bulanan). Membuat ulang akan melanggar aturan "Tidak duplicate business
logic/SQL/component, Reuse TrendChart" dari roadmap. Yang benar-benar baru
untuk perbandingan periode adalah `periodComparison` (MoM/YoY sebagai
ringkasan delta %, bukan deret waktu).

## Business Rule (ringkasan — detail lengkap di komentar migration SQL)

`returnRate` dihitung berbasis UNIT (qty retur ÷ qty sale), bukan revenue.
`overallMarginPct` adalah margin PORTFOLIO (1 angka agregat) — beda level
dari `marginTertinggi`/`marginTerendah` per-produk di Phase 2, bukan
duplikasi. `avgItemPerTransaksi` didefinisikan sebagai rata-rata JUMLAH
KODE PRODUK BERBEDA per transaksi (bukan jumlah baris checkout asli, karena
granularitas itu sudah hilang setelah `sales_flat` memecah per warna — ini
proxy yang wajar, bukan angka yang dikarang). `growth`/`topDeclining`
membandingkan revenue terhadap periode SEBELUMNYA dengan panjang sama
persis. `productMix` memakai `products.bahan` sebagai proxy kategori
(konsisten keputusan lama yang menunda Category Filter sungguhan).
`pareto.items` dibatasi 50 baris tapi `productsFor80Pct`/`totalProducts`
selalu akurat dari ranking penuh. `newVsReturning` mereplikasi persis
logika "customer baru" dari `analytics_customers` (Phase 4).
`weekdayPerformance`/`hourlyPerformance` di-zero-fill (7/24 baris tetap,
beda dari `analytics_trend` yang sengaja tidak zero-fill karena domainnya
tidak terbatas).

## Keterbatasan Data (WAJIB dibaca)

1. **Zona waktu `hourlyPerformance`** — jam diambil dari `sales.created_at`
   dikonversi eksplisit ke `Asia/Jakarta`. Ini ASUMSI, bukan fakta yang
   sudah diverifikasi terhadap data produksi sungguhan. **Disarankan**:
   Denny membandingkan manual 1-2 transaksi yang jam checkout aslinya
   diketahui pasti dengan hasil `hourlyPerformance` sebelum benar-benar
   mengandalkan widget ini untuk keputusan operasional. Kalau ternyata
   bergeser, perbaikannya cukup 1 baris SQL (ganti nama zona waktu), tidak
   perlu migration/restrukturisasi.
2. **MoM/YoY bisa `null`** — kalau histori toko belum mencakup 2 periode
   kalender PENUH (2 bulan atau 2 tahun), field ini `null` secara sengaja.
   AdvancedTab menampilkan "Data belum cukup" secara eksplisit, BUKAN 0 —
   sudah diverifikasi lewat test `renders YoY sebagai 'Data belum cukup'
   saat null`. Ini bukan bug, murni keterbatasan data riil toko.
3. **Growth/Declining Product** hanya menampilkan produk yang PUNYA data di
   periode sebelumnya (previousRevenue > 0) — produk yang baru mulai
   terjual di periode ini tidak muncul di sini karena "growth dari nol"
   secara matematis tidak informatif untuk di-ranking.

Tidak ada metric yang diminta roadmap yang GAGAL dihitung — seluruhnya
computable dari skema yang ada (`sales`, `sales_flat`, `products`,
`pelanggan`). Tidak ada angka yang dikarang.

## UI yang Dibuat

Tab **Advanced** (mobile-first, reuse `KpiCard`/`Leaderboard`/`LoadingState`/
`ErrorState`/`classNames.js` dari Phase 1-5) dengan 8 section: KPI Lanjutan
(4 kartu), Perbandingan Periode (MoM/YoY, menangani `null` eksplisit), Growth
& Declining Product (2 Leaderboard, warna hijau/merah), Revenue & Profit
Contribution (2 Leaderboard), Product Mix (1 Leaderboard by `bahan`), Pareto
Analysis (ringkasan teks + Leaderboard cumulative %), New vs Returning
Revenue (2 KpiCard + catatan transparansi walk-in, pola sama Phase 4), dan
Performa Waktu (2 `BarList` baru — Weekday & Hourly).

**Komponen baru `BarList`**: dipilih alih-alih memaksakan `Leaderboard`
untuk Weekday/Hourly karena kedua data itu punya urutan KRONOLOGIS tetap
(Senin→Minggu, 00:00→23:00), BUKAN ranking — `Leaderboard` menampilkan nomor
urut 1,2,3 dan MENGASUMSIKAN data sudah diurutkan value DESC oleh RPC, yang
akan menyesatkan untuk data time-of-day. `BarList` reusable untuk phase
berikutnya (Executive Dashboard Phase 9 kemungkinan juga butuh pola serupa).

## Testing

| Suite | Test | Status |
| --- | --- | --- |
| `api.test.js` (+5 baru) | 35 | PASS |
| `queries.test.js` (+2 baru) | 11 | PASS |
| `hooks.test.js` (+4 baru) | 33 | PASS |
| `BarList.test.jsx` (baru) | 6 | PASS |
| `AdvancedTab.test.jsx` (baru) | 14 | PASS |
| `AnalyticsPage.test.jsx` (updated) | 13 | PASS |
| 6 tab lama (Overview/Products/Markets/MarketDetail/Trends/Customers) | 58 | PASS (0 regresi) |
| shared lain (Leaderboard/KpiCard/InsightCard/LoadingState/ErrorState/GlobalFilterBar/store) | 59 | PASS (0 regresi) |
| `utils.test.js`, `TrendChart.test.jsx` | 40 | PASS (0 regresi) |

**Total: 269 test, seluruhnya PASS.** Satu bug ditemukan & diperbaiki
selama proses ini: `BarList.jsx` awalnya memakai `overflow-hidden` pada
track bar (pola progress-bar umum), tapi ini melanggar konvensi
lint-by-test repo (CLAUDE.md §13 melarang `overflow-hidden`, dicek blanket
oleh test "no ellipsis/truncate/overflow-hidden" di semua tab). Diperbaiki
dengan menghapus `overflow-hidden` — tidak fungsional diperlukan karena
lebar bar sudah dijamin ≤100% dari perhitungan JS, jadi tidak pernah
meluber walau tanpa clip eksplisit.

## Build

`npm run build:admin` — **PASS** (888 modules, build 19s). Warning bundle
size pre-existing (>500kB), tidak terkait Phase 6.

## sqlfluff & esbuild (Truncation Scan)

`sqlfluff parse --dialect postgres` atas migration Phase 6 — **PASS**,
tidak ada bagian unparsable. Scan esbuild atas seluruh file
`.js`/`.jsx` di `features/analytics/**` — **bersih**, tidak ada file
terpotong (2 kali sempat salah pakai tool Edit Windows pada `api.js`
selama sesi ini — silent truncation terdeteksi langsung via `wc -l`+esbuild,
diperbaiki dengan rewrite penuh via heredoc sebelum lanjut).

## Improvement / Ide Phase Berikutnya

- Validasi manual zona waktu `hourlyPerformance` (lihat Keterbatasan Data
  poin 1) sebaiknya dilakukan Denny sebelum widget ini dipakai untuk
  keputusan jam operasional/staffing.
- `BarList` bisa diperkaya dengan warna bar berbeda untuk nilai
  negatif/positif kalau Phase 7+ butuh menampilkan data yang bisa negatif
  (Weekday/Hourly Performance saat ini selalu ≥0 karena revenue/profit
  agregat, tapi kalau ada metric net negatif di masa depan, `BarList`
  perlu penyesuaian kecil).
- Pareto Analysis saat ini hanya berbasis revenue — kalau Denny butuh
  Pareto berbasis profit juga, itu extension kecil (CTE serupa) untuk
  phase mendatang, bukan perubahan struktural.

## Catatan Implementasi

- Seluruh penulisan file ke mount Linux dilakukan via bash heredoc/Python
  sesuai aturan CLAUDE.md. `api.js` sempat 2x ditulis via tool Edit Windows
  secara tidak sengaja dan langsung terpotong diam-diam — terdeteksi segera
  lewat `wc -l`+esbuild sebelum sempat lolos ke test, diperbaiki dengan
  rewrite penuh.
- Tidak ada business rule Phase 1-5 yang diubah — Phase 6 murni penambahan
  RPC + tab baru, konsisten dengan aturan roadmap "Tidak duplicate business
  logic/SQL/component".

---

Phase 6 selesai. Lanjut ke **Phase 7 — Inventory Intelligence** (Stock
Health, Dead/Aging/Slow/Fast Moving, Overstock/Understock, Inventory
Value/Turnover, Days of Inventory, Suggested Restock, Stock Risk) — akan
dibangun di atas `stok_warna`/`products`/`sales_flat` yang sudah ada, sesuai
roadmap.
