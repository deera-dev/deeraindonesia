# Laporan Implementasi — Analytics Phase 6 Extension (Advanced Analytics lanjutan) + Phase 9 (Executive Dashboard)

Tanggal: 2026-07-12
Status: **SELESAI** — seluruh test PASS (393 test fitur Analytics, 0 regresi), build PASS, sqlfluff PASS, pglast PASS, truncation scan PASS.

## Ringkasan

Sesi ini mengerjakan **dua phase sekaligus** sesuai instruksi eksplisit Denny:

1. **Phase 6 Extension** — saat instruksi diterima, `analytics_advanced()` (RPC Phase 6 dasar: Return Rate, Margin Portfolio, Growth/Declining Product, Contribution, Product Mix, Pareto, New vs Returning, Basket Size, Weekday/Hourly Performance, MoM/YoY) **SUDAH ADA** di working directory dari sesi sebelumnya — berbeda dari status yang disampaikan Denny ("Phase 6 belum dikerjakan"). Perbedaan ini dikonfirmasi lewat pertanyaan eksplisit ke Denny, dan Denny memilih **"Extend RPC lama secara additive"**. RPC diperluas lewat `CREATE OR REPLACE FUNCTION` yang menyalin SELURUH CTE lama apa adanya dan menambahkan CTE/field baru sebagai sibling key: **ABC Classification, Revenue Concentration, Customer Concentration, Market Concentration, Margin Risk, Sales Distribution (weekday/weekend), dan Week-over-Week (WoW)** di dalam `periodComparison`.
2. **Phase 9 — Executive Dashboard** — dibangun sebagai **AGREGATOR MURNI** sesuai instruksi eksplisit ("JANGAN membuat `analytics_executive()`"). Tab baru **Executive** menggabungkan 5 hook yang sudah ada (`useAnalyticsOverview`, `useAnalyticsAdvanced`, `useAnalyticsCustomers`, `useAnalyticsInventory`, `useAnalyticsForecast`) lewat `useAnalyticsExecutive()`, dengan seluruh reshape/klasifikasi (Business Health, Biggest Opportunity, Biggest Risk, Executive Insight, Recommendation) dilakukan oleh fungsi PURE di `utils.js` — tidak ada SUM/AVG/COUNT/JOIN baru, hanya PICK/COMPARE/CLASSIFY/FORMAT dari angka yang sudah final.

Tidak ada RPC lama yang diubah perilakunya, tidak ada struktur data yang dipakai tab lain yang berubah, tidak ada UI tab lama yang diubah — seluruh pekerjaan bersifat **additive**, sesuai aturan kritis yang diberikan Denny.

## File Baru

| File | Baris | Keterangan |
| --- | --- | --- |
| `supabase/migrations/20260712_analytics_phase6_extension_rpc.sql` | 608 | `CREATE OR REPLACE FUNCTION analytics_advanced(...)` — seluruh CTE lama dipertahankan verbatim + 6 CTE/section baru |
| `apps/admin/src/features/analytics/components/tabs/ExecutiveTab.jsx` | 311 | Tab Executive — 10 section, mobile-first, minim angka, banyak insight teks |
| `apps/admin/src/features/analytics/components/tabs/ExecutiveTab.test.jsx` | 204 | 17 test |

## File yang Diubah

| File | Perubahan |
| --- | --- |
| `apps/admin/src/features/analytics/api.js` | `EMPTY_ADVANCED` diperluas (6 field baru + `periodComparison.wow`), `fetchAnalyticsAdvanced()` kirim parameter baru `p_low_margin_threshold` |
| `apps/admin/src/features/analytics/hooks.js` | `useAnalyticsAdvanced()` diperluas pass-through field baru; tambah **`useAnalyticsExecutive()`** (agregator murni, TIDAK memanggil RPC baru) |
| `apps/admin/src/features/analytics/utils.js` | Tambah `fmtPct1()`; tambah 8 fungsi murni Phase 9 (`classifyMarginHealth`, `classifyReturnRateHealth`, `classifyRevenueTrendHealth`, `buildBusinessHealth`, `buildBiggestOpportunity`, `buildBiggestRisk`, `buildExecutiveInsights`, `buildRecommendations`) |
| `apps/admin/src/features/analytics/constants.js` | Tambah entri `"executive"` di `ANALYTICS_TABS` (di akhir array, urutan 8 tab lama TIDAK berubah); tambah 7 konstanta `EXECUTIVE_*` (threshold Business Health, limit Opportunity/Risk/Insight) |
| `apps/admin/src/features/analytics/components/AnalyticsPage.jsx` | Import + render `<ExecutiveTab/>` saat `activeTab === "executive"` |
| `apps/admin/src/features/analytics/components/tabs/AdvancedTab.jsx` | Tambah 5 section baru (Sales Distribution, ABC Classification, Revenue & Customer Concentration, Market Concentration, Margin Risk) + kartu WoW disisipkan ke grid Perbandingan Periode yang sudah ada. Seluruh section lama TIDAK diubah. |
| `api.test.js`, `hooks.test.js`, `utils.test.js`, `AdvancedTab.test.jsx`, `AnalyticsPage.test.jsx` | Tambah test untuk seluruh penambahan (lihat bagian Testing) |

## RPC yang Diperluas (Additive)

**`analytics_advanced(p_from date, p_to date, p_location text, p_kode text, p_low_margin_threshold numeric DEFAULT 0.10)`**

Parameter ke-5 punya `DEFAULT`, jadi signature TETAP backward-compatible — kode lama yang memanggil dengan 4 argumen tetap valid. Field jsonb lama (`kpi`, `growth`, `contribution`, `productMix`, `pareto`, `newVsReturning`, `weekdayPerformance`, `hourlyPerformance`, `periodComparison.mom`/`.yoy`) TIDAK diubah nilainya sama sekali — CTE-nya disalin verbatim dari migration Phase 6 asli. Field baru ditambahkan sebagai sibling key:

- **`abcClassification`** — reuse `pareto_final.cumulative_pct` yang SUDAH dihitung untuk Pareto Analysis (zero duplicate logic). Kelas A = kumulatif 0-80%, B = 80-95%, C = 95-100% (konvensi bisnis standar, threshold dikirim di response supaya tidak hardcode di frontend).
- **`revenueConcentration`** — top5Pct/top10Pct, `SUM(revenue) FILTER (WHERE rn <= 5/10)` dari `pareto_final` yang sama.
- **`customerConcentration`** — reuse ranking customer dari CTE `newVsReturning` yang sudah ada (`customer_period`), tidak query ulang.
- **`marketConcentration`** — CTE baru (`market_agg`), `GROUP BY location` dari `filtered` (CTE dasar yang sama dipakai seluruh metric lain di RPC ini).
- **`marginRisk`** — reuse `contribution.revenueByProduct`/`profitByProduct` (CTE `contrib_product`), margin_pct = profit/revenue, dibandingkan terhadap `p_low_margin_threshold`.
- **`salesDistribution`** — reagregasi dari `weekdayPerformance` yang sudah ada (`weekday_final`), `SUM(...) FILTER (WHERE dow BETWEEN 1 AND 5)` untuk weekday vs `dow IN (6,7)` untuk weekend.
- **`periodComparison.wow`** — CTE baru, pola SAMA PERSIS dengan `mom`/`yoy` yang sudah ada (`date_trunc('week', ...)` alih-alih `'month'`/`'year'`), bisa `null` kalau histori belum 2 minggu penuh.

Sesuai instruksi "gunakan `sales_flat()` sebanyak mungkin, reuse logic, jangan duplicate query" — TIDAK ADA satupun metric baru yang query ulang `sales_flat()` dari awal; semuanya reuse CTE yang sudah dihitung untuk metric Phase 6 lama.

## Business Rule (Phase 9 — Executive Dashboard = Agregator)

**TIDAK ADA `analytics_executive()`.** `useAnalyticsExecutive()` (`hooks.js`) memanggil 5 hook publik yang sudah ada:

- `useAnalyticsOverview()` → Revenue/Profit/Customer/Transaksi + Best Product/Market/Customer (`quickInsight`)
- `useAnalyticsAdvanced()` → Margin/Return Rate/MoM/Margin Risk/Market Concentration (termasuk field Phase 6 Extension)
- `useAnalyticsCustomers()` → HANYA `insight.repeatCustomer` (satu-satunya angka yang tidak tersedia dari hook lain)
- `useAnalyticsInventory()` → Dead Stock/Critical Stock/Inventory Value/Days of Inventory/Suggested Restock
- `useAnalyticsForecast()` → Revenue/Profit/Sales Forecast (ES) + Restock Forecast

**Sengaja TIDAK memanggil** `useAnalyticsProducts()`/`useAnalyticsMarkets()` — Best Product/Market sudah tersedia via `overview.quickInsight`, breakdown market sudah tersedia via `advanced.marketConcentration` (Phase 6 Extension). Memanggilnya lagi berarti query ganda untuk data yang sama.

Seluruh reshape didelegasikan ke `utils.js` (`buildBusinessHealth`, `buildBiggestOpportunity`, `buildBiggestRisk`, `buildExecutiveInsights`, `buildRecommendations`) — fungsi-fungsi ini PURE (tidak ada I/O), dan HANYA melakukan:
1. Memilih (top-N dari array yang sudah diurutkan RPC-nya, mis. `biggestOpportunity` sort by `suggestedOrderQty` DESC).
2. Membandingkan 2 angka yang sudah ada (mis. forecast ES vs titik histori terakhir → arah naik/turun).
3. Mengklasifikasi 1 angka terhadap threshold TETAP di `constants.js` (mis. margin ≥20% → hijau).
4. Menyusun kalimat template dari angka-angka tsb.

Tidak ada SUM/AVG/COUNT/JOIN atas data mentah di frontend.

## UI yang Dibuat

**Tab Executive** (mobile-first, reuse penuh `KpiCard`/`InsightCard`/`LoadingState`/`ErrorState`/`classNames.js` — TIDAK ADA komponen shared baru) dengan 10 section:

1. **Executive KPI** — 7 KpiCard (Revenue, Profit, Margin, Growth MoM, Customer, Transaksi, Repeat Customer).
2. **Business Health** — daftar status hijau/kuning/merah (dot warna Tailwind, bukan emoji literal, konsisten visual dengan tab lain) untuk Revenue MoM/Margin Portfolio/Return Rate + Dead Stock/Overstock kalau relevan.
3. **Best Performance** — 3 InsightCard (Produk/Pelanggan/Market Terbaik), pass-through dari `quickInsight`.
4. **Biggest Opportunity** — daftar produk demand forecast tinggi + stok rendah (dari Forecast).
5. **Biggest Risk** — gabungan dead stock + margin negatif.
6. **Executive Insight** — daftar kalimat (BUKAN tabel), hanya insight yang datanya benar-benar cukup.
7. **Recommendation** — daftar kalimat rekomendasi.
8. **Forecast Summary** — 3 KpiCard ringkas (Revenue/Profit/Sales, nilai ES), **TANPA chart besar** dan TANPA Product Demand/Customer Forecast (itu tetap di tab Forecast).
9. **Inventory Summary** — 4 KpiCard (Dead Stock, Critical Stock, Inventory Value, Days of Inventory).
10. **Quick Action** — daftar baris pendek ("1 SKU harus direstock", dst), atau pesan "Tidak ada tindakan mendesak" kalau semua nol.

Biggest Opportunity/Biggest Risk/Executive Insight/Recommendation/Quick Action dirender sebagai **daftar baris teks** (bukan `<Leaderboard/>`) karena isinya kalimat deskriptif panjang, bukan pasangan {label, value} pendek seperti kontrak Leaderboard — memaksakannya ke situ akan merusak keterbacaan mobile. Tidak ada `truncate`/`whitespace-nowrap`/`overflow-hidden` di mana pun (diverifikasi test otomatis).

**Tab Advanced** — 5 section baru ditambahkan SETELAH section lama (Sales Distribution, ABC Classification, Revenue & Customer Concentration, Market Concentration, Margin Risk), kartu WoW disisipkan ke grid "Perbandingan Periode" yang sudah ada (di samping MoM/YoY). Seluruh section/kartu lama posisi dan isinya TIDAK berubah.

## Testing

| Suite | Test | Status |
| --- | --- | --- |
| `api.test.js` (+field baru) | 47 | PASS |
| `hooks.test.js` (+14 test `useAnalyticsExecutive`) | 54 | PASS |
| `utils.test.js` (+37 test fungsi Phase 9) | 73 | PASS |
| `AdvancedTab.test.jsx` (+7 section Phase 6 Extension) | 20 | PASS |
| `ExecutiveTab.test.jsx` (baru) | 17 | PASS |
| `AnalyticsPage.test.jsx` (9 tab, +1 test Executive) | 16 | PASS |
| `queries.test.js`, `store.test.js` | 25 | PASS |
| 6 tab lama lain (Overview/Products/Markets/MarketDetail/Trends/Customers) + Inventory/Forecast | 118 | PASS (0 regresi) |
| shared (KpiCard/InsightCard/Leaderboard/BarList/LoadingState/ErrorState/TrendChart/GlobalFilterBar) | 79 | PASS (0 regresi) |

**Total: 393 test fitur Analytics, SELURUHNYA PASS.** Dijalankan dalam beberapa batch (menghindari timeout runner tunggal), tidak ada test yang gagal atau di-skip di batch manapun.

## Build

`npm run build:admin` — **PASS** (891 modules, build 9.24s). Warning ukuran bundle pre-existing (>500kB), tidak terkait perubahan sesi ini.

## sqlfluff

`sqlfluff parse --dialect postgres` atas `20260712_analytics_phase6_extension_rpc.sql` (608 baris, ~31KB) — file ini melebihi `large_file_skip_byte_limit` default sqlfluff (20000 byte), yang tadinya menyebabkan WARNING "skip" (exit code 0, terlihat seperti lolos padahal sebenarnya TIDAK diparse). Diperbaiki dengan config kustom (`large_file_skip_byte_limit = 0`) — hasil akhir: **0 baris unparsable**.

## pglast

`pglast.parse_sql()` (parser C PostgreSQL asli via `libpg_query`) atas migration yang sama — **PARSE OK, 2 statements** (`CREATE OR REPLACE FUNCTION` + `GRANT EXECUTE`).

## Truncation Scan

Seluruh file yang ditulis/diubah sesi ini ditulis via bash heredoc/Python ke path Linux (`/sessions/.../mnt/deeraindonesia/...`), TIDAK PERNAH via Windows `Edit`/`Write` tool langsung ke mount tsb — setiap penulisan diverifikasi `wc -l` + `tail` + esbuild sebelum lanjut ke file berikutnya. esbuild dijalankan ulang di 13 file inti (RPC-consuming layer: `constants.js`, `utils.js`, `api.js`, `hooks.js`, `AnalyticsPage.jsx`, `ExecutiveTab.jsx`, `AdvancedTab.jsx`, + 6 file test terkait) — **seluruhnya bersih, 0 error**. Grep untuk `truncate`/`whitespace-nowrap`/`overflow-hidden` di file baru — hanya 1 match, itu pun di dalam komentar prosa ("tanpa truncate"), bukan class Tailwind aktual.

## ⚠️ Keterbatasan Data (BAGIAN PALING PENTING dari laporan ini)

**1. "2 customer VIP belum transaksi" (contoh Quick Action di roadmap) — TIDAK diimplementasikan.** Diaudit langsung: tidak ada RPC manapun (Overview/Advanced/Customers/Inventory/Forecast) yang mengembalikan field "tanggal transaksi terakhir per pelanggan". `useAnalyticsCustomers()` hanya mengembalikan agregat (revenue/profit/qty per pelanggan pada rentang filter), bukan timestamp transaksi individual. Membuat metric ini akan berarti MENGARANG angka yang tidak bisa dihitung dari data yang tersedia — solusi realistis yang dipakai: Quick Action HANYA mencakup 3 hal yang benar-benar bisa dihitung (restock count, margin negatif count, dead stock count).

**2. "Market berkembang" (contoh Biggest Opportunity di roadmap) — TIDAK diimplementasikan.** `marketConcentration` (Phase 6 Extension) hanya snapshot 1 periode (kontribusi revenue per lokasi PADA rentang filter aktif), BUKAN perbandingan antar periode — tidak ada field growth/trend per market di RPC manapun. Solusi realistis: Biggest Opportunity di Executive Dashboard HANYA dari sisi demand produk (`restockForecast`), bukan dari sisi pertumbuhan market.

**3. Threshold Business Health (margin ≥20%/10%, return rate ≥3%/5%) adalah HEURISTIK bisnis, bukan definisi baku universal** — dikirim dari `constants.js` (`EXECUTIVE_MARGIN_HEALTHY_PCT` dkk), bisa disesuaikan kapan saja tanpa migration baru karena murni konstanta frontend.

**4. `classifyRevenueTrendHealth(null)` SENGAJA "kuning" (netral), bukan hijau/merah** — histori MoM yang belum mencakup 2 bulan kalender penuh berarti arah trend memang TIDAK DIKETAHUI, bukan "netral secara nilai". Ini konsisten dengan penanganan `periodComparison.mom === null` di seluruh tab Advanced sejak Phase 6.

**5. Catatan proses (bukan keterbatasan data, tapi transparansi kerja):** di awal sesi ditemukan bahwa Phase 6 (`analytics_advanced()`, `AdvancedTab.jsx`, test-nya) **SUDAH ADA** dari sesi sebelumnya, berbeda dari status yang disampaikan Denny. Hal ini dikonfirmasi via pertanyaan eksplisit sebelum melanjutkan (BUKAN diasumsikan begitu saja ke salah satu arah), dan Denny memilih untuk extend secara additive — pendekatan inilah yang dipakai di seluruh Phase 6 Extension.

## Improvement / Ide Phase Berikutnya

- Kalau ke depan ditambahkan kolom `last_transaction_at` per pelanggan (mis. materialized dari `sales.created_at` terbaru per `pelanggan_id`), Quick Action "customer VIP belum transaksi" bisa ditambahkan secara additive tanpa mengubah struktur `analytics_customers()` yang ada.
- Kalau `marketConcentration` suatu saat dibandingkan antar 2 periode (pola SAMA seperti `periodComparison.mom/yoy/wow`), "market berkembang" bisa dihitung sebagai delta kontribusi %, bukan snapshot tunggal.
- `EXECUTIVE_INSIGHT_MAX` saat ini efektif tidak pernah terpakai sebagai pembatas nyata (hanya ada 10 kemungkinan insight, satu per kondisi) — kalau nanti ditambah lebih banyak jenis insight, constant ini akan mulai benar-benar memotong daftar, bukan sekadar dokumentasi niat.
- Business Health saat ini hanya 3-5 item (statis per kondisi) — kalau Denny ingin threshold yang bisa diatur dari UI (bukan hardcode `constants.js`), itu perubahan kecil (pindah ke tabel `hpp_config`-style key-value), tapi TIDAK dikerjakan sekarang karena tidak diminta.

## Catatan Penting: Belum Ter-commit ke Git

Seluruh pekerjaan Analytics (Phase 1 sampai Phase 9 + Phase 6 Extension) **masih berada di working directory lokal**, belum pernah di-`git commit`. Commit terakhir di riwayat git adalah `"phase 1 migration"`. Ini murni informasi status — TIDAK ada tindakan commit yang diambil di sesi ini karena tidak ada instruksi eksplisit untuk melakukannya. Kalau Denny ingin seluruh pekerjaan ini di-commit (dan/atau dipecah jadi beberapa commit per phase), beri tahu saja dan itu bisa dikerjakan sebagai langkah terpisah.

---

Dengan ini, Phase 6 Extension dan Phase 9 (Executive Dashboard) SELESAI. Seluruh 9 tab Analytics (Overview, Products, Markets, Trends, Customers, Advanced, Inventory, Forecast, Executive) sudah berjalan lengkap di atas 9 RPC (`analytics_overview`, `analytics_trend`, `analytics_products`, `analytics_markets`, `analytics_market_detail`, `analytics_customers`, `analytics_advanced`, `analytics_inventory`, `analytics_forecast`), TIDAK ADA RPC baru untuk Executive Dashboard sesuai instruksi.
