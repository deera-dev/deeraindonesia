# Laporan Implementasi — Analytics Phase 8 (Forecast)

Tanggal: 2026-07-12
Status: **SELESAI** — seluruh test PASS, build PASS, sqlfluff PASS, pglast PASS, esbuild (truncation scan) PASS.

## Ringkasan

Phase 8 menambahkan tab baru **Forecast** berisi proyeksi sederhana &
explainable (TANPA AI/ML, sesuai instruksi eksplisit roadmap): Revenue
Forecast, Profit Forecast, Sales Forecast, Customer Forecast, Product
Demand Forecast, dan Restock Forecast. Setiap series ditampilkan dengan 3
metode sekaligus — Moving Average (MA), Weighted Moving Average (WMA),
Simple Exponential Smoothing (ES) — bukan 1 angka "black box", supaya
Denny bisa melihat sendiri rentang estimasi dan menilai metode mana yang
paling masuk akal untuk pola datanya. Seluruh metric dihitung di 1 RPC
baru (`analytics_forecast`), dibangun di atas `analytics_trend()` (Phase
1) yang dipanggil langsung untuk data historis — tidak ada logika
bucketing/top-produk yang ditulis ulang.

## File Baru

| File | Baris | Keterangan |
| --- | --- | --- |
| `supabase/migrations/20260712_analytics_phase8_forecast_rpc.sql` | 308 | RPC `analytics_forecast()` — MA/WMA/ES untuk 4 series waktu + product demand + restock |
| `apps/admin/src/features/analytics/components/tabs/ForecastTab.jsx` | 230 | Tab Forecast — info meta, 4 section forecast series (chart + 3 kartu metode), Product Demand Forecast, Restock Forecast |
| `apps/admin/src/features/analytics/components/tabs/ForecastTab.test.jsx` | 139 | 10 test |

## File yang Diubah

| File | Perubahan |
| --- | --- |
| `api.js` | Tambah `fetchAnalyticsForecast()` + `EMPTY_FORECAST`/`EMPTY_FORECAST_SERIES` (ma/wma/es default `null`, BUKAN 0) |
| `queries.js` | Tambah `useAnalyticsForecastQuery()` + `analyticsKeys.forecast` |
| `hooks.js` | Tambah `useAnalyticsForecast()` (pass-through murni, fallback struktur kosong dengan ma/wma/es `null`, `refetch` konsisten pola Phase 5) |
| `constants.js` | Tambah `"forecast"` di `ANALYTICS_TABS`, `FORECAST_GRANULARITY_DEFAULT`/`FORECAST_ALPHA_DEFAULT`/`FORECAST_LOOKBACK_PERIODS_DEFAULT`/`FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT` (dikirim sebagai parameter RPC, bukan hardcode SQL), `FORECAST_PRODUCT_DEMAND_LIMIT`/`FORECAST_RESTOCK_LIMIT` (label UI) |
| `AnalyticsPage.jsx` | Import + render `<ForecastTab/>` saat `activeTab === "forecast"`, header comment diperbarui (8 tab) |
| `api.test.js`, `queries.test.js`, `hooks.test.js`, `AnalyticsPage.test.jsx` | Tambah test untuk seluruh penambahan di atas (13 test baru) |

## RPC yang Dibuat

**`analytics_forecast(p_from, p_to, p_location, p_kode, p_granularity, p_alpha, p_lookback_periods, p_restock_horizon_periods)`**

Metode (WAJIB explainable, TANPA AI/ML — instruksi eksplisit roadmap):

- **Moving Average (MA)** — rata-rata N periode terakhir (`p_lookback_periods`, default 8).
- **Weighted Moving Average (WMA)** — rata-rata N periode terakhir, periode LEBIH BARU diberi bobot LEBIH BESAR (bobot linear 1..N).
- **Simple Exponential Smoothing (ES)** — `level = alpha × nilai_terbaru + (1-alpha) × level_sebelumnya`, dihitung berulang dari AWAL histori via recursive CTE. Forecast periode berikutnya = level TERAKHIR — TIDAK ADA komponen tren/musiman, sesuai instruksi "metode sederhana".

Reuse: histori Revenue/Profit/Qty dan Top 5 Produk per periode diambil
dengan MEMANGGIL LANGSUNG `analytics_trend()` (Phase 1) — tidak ada logika
unnest jsonb/bucketing yang ditulis ulang. Untuk menghindari menulis ulang
kalkulasi MA/WMA/ES 5x (revenue/profit/qty/customer/per-produk), seluruh
series di-uniontarikan jadi 1 tabel "long-format" (`series_key`, `periode`,
`value`) dan kalkulasi MA/WMA/ES ditulis SATU KALI, diterapkan generik ke
semua series lewat `PARTITION BY`/`GROUP BY series_key`.

## ⚠️ Keterbatasan Data (BAGIAN PALING PENTING dari laporan ini)

**1. Forecast MEMBUTUHKAN minimal 2 titik histori (periode) untuk
bermakna.** Kalau rentang filter terlalu pendek atau granularity terlalu
kasar sehingga hanya ada 0-1 bucket histori, seluruh angka forecast
(`ma`/`wma`/`es`) untuk series tersebut dikembalikan `null` — BUKAN 0 atau
angka yang diekstrapolasi paksa dari 1 titik data. Frontend WAJIB
menampilkan "Data belum cukup" secara eksplisit saat null (pola SAMA
persis dengan `periodComparison.mom/yoy` di Phase 6) — ini diterapkan
konsisten di `hooks.js` (fallback), `api.js` (`EMPTY_FORECAST_SERIES`), dan
`ForecastTab.jsx` (`MethodCard` khusus untuk kasus null, plus
`productDemandForecast` yang punya `es: null` dipisah dari BarList dan
ditampilkan sebagai catatan teks, BUKAN batang 0 pcs yang menyesatkan).

**2. Restock Forecast SENGAJA TIDAK memakai `expected_stok`** — sama
seperti Suggested Restock di Phase 7 (lihat audit lengkap di migration SQL
Phase 7: tabel itu adalah baseline rekonsiliasi produksi "Buku Potongan",
bukan target restock). Restock Forecast dihitung murni dari estimasi
demand periode berikutnya (memakai ES — metode paling responsif terhadap
tren terbaru) dikombinasikan dengan stok `stok_warna` saat ini. Hanya
produk dengan forecast valid (`es IS NOT NULL`) yang muncul di daftar ini
— produk dengan histori kurang otomatis TIDAK disarankan restock-nya
(lebih aman diam daripada menyarankan angka karangan).

**3. Simple Exponential Smoothing di sini TIDAK punya komponen tren atau
musiman** — ini bukan kelalaian, tapi konsekuensi langsung dari instruksi
eksplisit roadmap "metode sederhana yang explainable" dan "TANPA AI/ML".
Metode yang lebih canggih (Holt-Winters, dst) akan menangkap tren/musiman
lebih baik tapi juga lebih sulit dijelaskan ke pemilik bisnis tanpa
istilah statistik — trade-off ini dijelaskan apa adanya di komentar
migration SQL, bukan disembunyikan.

**4. Tidak ada Postgres/Docker live di sandbox tempat pekerjaan ini
dikerjakan** (percobaan `sudo apt-get install postgresql` gagal — tidak
ada akses root). Validasi SQL dilakukan lewat 2 lapis: `sqlfluff parse
--dialect postgres` (grammar approksimasi) DAN `pglast` (Python wrapper
atas parser C asli PostgreSQL, `libpg_query`) — keduanya PASS untuk
migration Phase 8 (`pglast.parse_sql()`: PARSE OK, 2 statement). Ini lebih
kuat dari sqlfluff saja (dipakai sejak Phase 6-7), tapi TETAP BUKAN
substitusi validasi semantik/runtime terhadap skema data sesungguhnya.
**Rekomendasi**: setelah migration ini di-deploy ke Supabase asli, jalankan
manual query verifikasi yang sudah disiapkan di footer file migration
(`SELECT jsonb_pretty(public.analytics_forecast(...))` — 2 skenario: 12
minggu terakhir dengan data cukup, dan rentang 1 hari untuk memastikan
`ma`/`wma`/`es` benar-benar `null` saat histori < 2 periode).

Tidak ada metric yang diminta roadmap yang gagal dihitung.

## UI yang Dibuat

Tab **Forecast** (mobile-first, reuse `KpiCard`/`TrendChart`/`BarList`/
`LoadingState`/`ErrorState`/`classNames.js`) dengan struktur: info meta
(granularity aktif, jumlah periode histori, alpha, lookback periods,
label periode forecast berikutnya), 4 section forecast series identik
bentuknya (Revenue/Profit/Sales/Customer Forecast — masing-masing 1 chart
histori + 3 `KpiCard` metode MA/WMA/ES, dengan kartu khusus "Data belum
cukup" saat null), Product Demand Forecast (`BarList` top 5 produk,
urutan alfabetis per kode — BUKAN ranking, produk tanpa forecast valid
dipisah jadi catatan teks terpisah), dan Restock Forecast (`BarList`,
label menggabungkan kode + demand + stok saat ini, value = suggested
order qty, dengan catatan transparansi "BUKAN dari Buku Potongan").
`BarList` (bukan `Leaderboard`) dipilih untuk kedua daftar produk karena
urutan dari RPC adalah alfabetis per kode, bukan ranking by value —
memakai `Leaderboard` (yang selalu menampilkan badge nomor urut) akan
menyiratkan ranking yang tidak ada.

## Testing

| Suite | Test | Status |
| --- | --- | --- |
| `api.test.js` (+6 baru) | 46 | PASS |
| `queries.test.js` (+2 baru) | 15 | PASS |
| `hooks.test.js` (+4 baru) | 41 | PASS |
| `ForecastTab.test.jsx` (baru) | 10 | PASS |
| `AnalyticsPage.test.jsx` (+1 baru, 2 diubah) | 15 | PASS |
| 8 tab lama (Overview/Products/Markets/MarketDetail/Trends/Customers/Advanced/Inventory) | 80 | PASS (0 regresi) |
| shared (Leaderboard/KpiCard/BarList/InsightCard/LoadingState/ErrorState/TrendChart) | 51 | PASS (0 regresi) |

**Total: 258 test dijalankan di sesi ini, seluruhnya PASS.**

## Build

`npm run build:admin` — **PASS** (890 modules, build 7.9s). Warning bundle
size pre-existing, tidak terkait Phase 8.

## sqlfluff, pglast & esbuild (Truncation Scan)

`sqlfluff parse --dialect postgres` DAN `pglast.parse_sql()` atas
migration Phase 8 — **keduanya PASS**, tidak ada bagian unparsable. Scan
esbuild (line count + trailing-newline check) atas seluruh 11 file yang
disentuh Phase 8 (`api.js`, `queries.js`, `hooks.js`, `constants.js`,
`AnalyticsPage.jsx`, `ForecastTab.jsx`, dan file test terkait) — **bersih**.

## ⚠️ Insiden Truncation yang Tertangkap (transparansi penuh)

Dua file (`constants.js` — 2x edit, `ForecastTab.test.jsx` — 1x edit)
sempat ditulis lewat tool edit langsung ke path Windows
(`D:\dev\deeraindonesia\...`) alih-alih heredoc/Python ke path Linux
sesuai aturan CLAUDE.md §"Peringatan Kritis". Akibatnya kedua file
**silent-truncated** — terpotong tanpa error, kehilangan bagian akhir
(`constants.js` kehilangan `INVENTORY_RISK_LIMIT` dan seluruh blok
`FORECAST_*`; `ForecastTab.test.jsx` kehilangan 1 test terakhir).
**Tertangkap** oleh `npm run build:admin` yang gagal dengan error import
eksplisit ("`FORECAST_GRANULARITY_DEFAULT` is not exported"), BUKAN oleh
gejala diam-diam. Kedua file ditulis ulang PENUH via bash heredoc,
diverifikasi `wc -l` + `tail` + esbuild + `grep -c` jumlah export/describe
block sebelum dianggap selesai. Build dan seluruh test dijalankan ulang
setelah perbaikan — semua PASS. Dicatat di sini apa adanya karena
insiden ini justru membuktikan pentingnya aturan CLAUDE.md tersebut, dan
supaya Denny tahu persis apa yang terjadi, bukan disembunyikan.

## Improvement / Ide Phase Berikutnya

- Alpha (ES), lookback periods (MA/WMA), dan restock horizon saat ini
  adalah nilai default yang dikirim FE (bukan hardcode SQL) — kalau
  Denny mau tuning per produk/kategori nanti, itu penyesuaian parameter,
  bukan perubahan struktural RPC.
- Kalau pola penjualan musiman (misal lonjakan Ramadan/Lebaran) mulai
  terlihat jelas di data historis, metode yang lebih canggih (Holt-Winters
  dengan komponen musiman) bisa dipertimbangkan sebagai OPSI TAMBAHAN di
  samping MA/WMA/ES sederhana yang sudah ada — bukan pengganti, supaya
  opsi "sederhana & explainable" tetap tersedia.
- Product Demand Forecast saat ini mengikuti Top 5 Produk dari
  `analytics_trend()` (by qty) — kalau Denny ingin forecast untuk produk
  tertentu di luar top 5, filter `p_kode` di Global Filter sudah bisa
  dipakai untuk itu (RPC menghormati filter kode aktif).

## Catatan Implementasi

- Seluruh penulisan file baru (migration SQL, `ForecastTab.jsx`,
  `ForecastTab.test.jsx` awal) dan edit `api.js`/`queries.js`/`hooks.js`/
  `AnalyticsPage.jsx`/test file lain dilakukan via bash heredoc/Python ke
  path Linux — sesuai aturan. Pelanggaran HANYA terjadi pada 2 edit kecil
  (`constants.js`, `ForecastTab.test.jsx`) yang memakai tool edit Windows;
  lihat bagian "Insiden Truncation" di atas untuk detail penuh & perbaikan.
- Verifikasi SQL Phase 8 memakai 2 lapis (`sqlfluff` + `pglast`) —
  peningkatan dari Phase 6-7 yang hanya memakai `sqlfluff` — karena SQL
  Phase 8 memakai `WITH RECURSIVE` dan window function kompleks yang lebih
  rawan salah-parse oleh grammar approksimasi sqlfluff.
- Bug `WITH RECURSIVE` (keyword harus di `WITH` terluar, bukan per-CTE)
  ditemukan lewat review manual sebelum finalisasi, bukan lewat kegagalan
  test — dicatat sebagai pengingat bahwa review manual tetap perlu untuk
  SQL kompleks yang tidak bisa dieksekusi langsung di sandbox ini.

---

Phase 8 selesai. Lanjut ke **Phase 9 — Executive Dashboard** (Executive
KPI, Revenue/Profit Summary, Cashflow Indicator, Best/Worst Market, Best
Product/Customer, Biggest Opportunity/Risk, Executive Insight, Trend/
Weekly/Monthly Summary, Alert & Recommendation — WAJIB sangat ringkas,
prioritas informasi untuk pengambilan keputusan) sesuai roadmap.
