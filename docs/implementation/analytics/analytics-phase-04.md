# Laporan Implementasi — Analytics (BI): Requirement Change (R1–R6) + Phase 4 Customers

**Tanggal:** 12 Juli 2026
**Scope:** (1) Enam perubahan requirement atas Overview/Global Filter/Trends yang diputuskan Denny sebagai **keputusan final** sebelum Phase 4 dimulai, dan (2) Phase 4 — tab Customers, di atas fondasi Phase 1-3 (Overview, Trends, Products, Markets) yang sudah ada.

---

## Bagian A — Requirement Change (R1–R6)

### A.1 Ringkasan Keputusan Final

| # | Keputusan | Status |
|---|---|---|
| R1 | Quick Insight Produk Terlaris/Produk Profit Tertinggi di Overview pakai **`.kode`**, bukan `.nama` — standar ini berlaku permanen untuk seluruh identitas PRODUK di Analytics. Customer Terbaik tetap pakai `.nama`. | Selesai |
| R2 | Trend/chart **dihapus total** dari Overview. Overview = KPI + Quick Insight + Market Summary saja. Seluruh visualisasi trend dipusatkan di tab Trends. | Selesai |
| R3 | Global Filter dapat preset tanggal: **7 Hari / 30 Hari / 1 Tahun / Custom**. Preset mengisi ulang `fromDate`/`toDate` otomatis; date picker manual hanya muncul saat "Custom". | Selesai |
| R4 | Adopsi chart library — **Recharts** dipasang, `TrendChart.jsx` dibangun ulang di atasnya (SVG murni sebelumnya dihapus). | Selesai |
| R5 | Trends tab menjadi **satu chart gabungan** multi-series (Revenue/Profit di sumbu kiri, Qty di sumbu kanan) dengan legend-toggle, tooltip custom, dual Y-axis. `MarketDetailPanel` diupdate ke API TrendChart baru. | Selesai |
| R6 | Test suite lengkap untuk R1-R5 + build + truncation scan. | Selesai |

### A.2 File yang Diubah (R1–R6)

| File | Perubahan |
|---|---|
| `apps/admin/src/features/analytics/components/tabs/OverviewTab.jsx` | Quick Insight produk kembali ke `.kode`; seluruh section Trend Chart (3 chart) dihapus. |
| `apps/admin/src/features/analytics/hooks.js` | `useAnalyticsOverview()` tidak lagi mengekspos field `trend` (RPC tidak diubah, hanya hook-nya). `useAnalyticsFilter()` menambah `datePreset`/`setDatePreset`. |
| `apps/admin/src/features/analytics/constants.js` | Tambah `DATE_PRESETS` (7d/30d/1y/custom) + `DEFAULT_DATE_PRESET = "30d"`. |
| `apps/admin/src/features/analytics/utils.js` | `dateRangeForDays(days, today)` generik ditambah; `defaultDateRange()` jadi wrapper tipis di atasnya (tidak ada perubahan behavior). |
| `apps/admin/src/features/analytics/store.js` | State `datePreset` + action `setDatePreset(key)` — preset selain "custom" langsung menghitung ulang `fromDate`/`toDate` lewat `dateRangeForDays`; `resetFilter()` ikut mereset `datePreset`. |
| `apps/admin/src/features/analytics/components/GlobalFilterBar.jsx` | Baris tombol preset (7 Hari/30 Hari/1 Tahun/Custom) ditambahkan; 2 date picker manual hanya render saat `datePreset === "custom"`. |
| `apps/admin/src/features/analytics/components/shared/TrendChart.jsx` | **Dibangun ulang total** dari SVG manual ke Recharts (`ComposedChart`/`Line`/dual `YAxis`/`Tooltip`/`Legend`). API baru: `data`/`series[].dataKey`/`xKey`/`height` (API lama `labels`/`series[].values` dihapus). |
| `apps/admin/src/features/analytics/components/tabs/TrendsTab.jsx` | 3 chart terpisah (Revenue/Profit/Qty) digabung jadi 1 `<TrendChart/>` multi-series dengan legend-toggle. |
| `apps/admin/src/features/analytics/components/tabs/MarketDetailPanel.jsx` | Update ke API TrendChart baru (`data`/`series`, bukan `labels`/`series[].values`). |
| Test file terkait (`OverviewTab.test.jsx`, `hooks.test.js`, `store.test.js`, `utils.test.js`, `GlobalFilterBar.test.jsx`, `TrendChart.test.jsx`, `TrendsTab.test.jsx`, `MarketDetailPanel.test.jsx`) | Diperbarui mengikuti behavior baru. |

Tidak ada perubahan pada RPC/migration SQL manapun untuk R1-R6 — seluruhnya perubahan frontend (hook exposure, komponen, state preset). `analytics_overview()` sengaja TIDAK diubah (field `trend` tetap dikembalikan untuk backward-compat, hook saja yang berhenti menerukannya).

### A.3 Dependency Baru: Recharts

**Package:** `recharts@^3.9.2`, dipasang di `apps/admin` (`npm install recharts --workspace=apps/admin`).

**Alasan (sesuai prioritas eksplisit Denny — Recharts):**
- **React-native**, bukan wrapper canvas/D3 generik — komponennya (`<Line>`, `<XAxis>`, dst) adalah komponen React biasa, cocok dengan seluruh stack Vertical Slice yang sudah 100% React + Tailwind.
- **`ComposedChart` + dual `YAxis`** cocok persis untuk kebutuhan R5: menggabungkan Revenue/Profit (skala Rupiah) dan Qty (skala angka biasa) dalam satu chart tanpa salah satu series terlihat "mendatar" karena skala berbeda.
- **`ResponsiveContainer`** bawaan menangani resize/mobile secara otomatis — tidak perlu listener manual seperti implementasi SVG lama.
- **`Legend` mendukung `onClick` bawaan** — dipakai langsung untuk requirement "klik legend untuk toggle series" tanpa membangun sistem toggle sendiri.
- **Tooltip custom via `content` prop** — mudah dibentuk sesuai kebutuhan (Tanggal + Revenue + Profit + Qty dalam satu tooltip).
- **Ringan** dibanding alternatif seperti Victory atau Nivo untuk kebutuhan line/composed chart sederhana ini, dan **aktif maintained** (rilis v3.x per Juli 2026).
- Trade-off yang disadari: testing Recharts di jsdom butuh mock `ResponsiveContainer` (karena `ResizeObserver` di jsdom tidak pernah memberi ukuran nyata) — sudah diselesaikan dengan pola `vi.mock("recharts", ...)` yang meng-`cloneElement` chart dengan width/height tetap, dipakai di 3 file test (`TrendChart.test.jsx`, `TrendsTab.test.jsx`, `MarketDetailPanel.test.jsx`).

---

## Bagian B — Phase 4: Customers

### B.1 File Baru

| File | Isi |
|---|---|
| `supabase/migrations/20260712_analytics_phase4_customers_rpc.sql` | RPC `analytics_customers()` — 373 baris termasuk dokumentasi business rule & edge case lengkap. |
| `apps/admin/src/features/analytics/components/tabs/CustomersTab.jsx` | Tab Customers — Insight (4 KPI card), Leaderboard (3 daftar via `Leaderboard`), Ranking (kartu per-pelanggan). |
| `apps/admin/src/features/analytics/components/tabs/CustomersTab.test.jsx` | 8 test. |

### B.2 File yang Diubah

| File | Perubahan |
|---|---|
| `apps/admin/src/features/analytics/api.js` | Tambah `fetchAnalyticsCustomers()` (pass-through RPC murni) + fallback shape kosong `EMPTY_CUSTOMERS`. |
| `apps/admin/src/features/analytics/queries.js` | Tambah `analyticsKeys.customers(...)`, `useAnalyticsCustomersQuery()` (selalu aktif begitu tanggal terisi — TIDAK lazy seperti market detail, karena 1 payload gabungan). |
| `apps/admin/src/features/analytics/hooks.js` | Tambah `useAnalyticsCustomers()` (pass-through, fallback struktur kosong). |
| `apps/admin/src/features/analytics/constants.js` | `ANALYTICS_TABS` jadi `[overview, products, markets, trends, customers]` (tab baru di paling kanan, urutan lama tidak berubah). Tambah `CUSTOMERS_LEADERBOARD_LIMIT=10`, `CUSTOMERS_RANKING_LIMIT=50`. |
| `apps/admin/src/features/analytics/index.js` | Ekspor `useAnalyticsCustomers` dari barrel. |
| `apps/admin/src/features/analytics/components/AnalyticsPage.jsx` | Import + render `<CustomersTab/>` saat `activeTab === "customers"`; tab switcher disesuaikan untuk 5 tab (flex-wrap, tanpa horizontal scroll). |
| `apps/admin/src/features/analytics/components/shared/Leaderboard.jsx` | **Digeneralisasi** — tambah prop `labelKey` (default `"kode"`) dan `mono` (default `true`). Seluruh caller existing (Products, MarketDetailPanel) TIDAK berubah perilakunya (default sama persis seperti sebelumnya); Customers memanggil dengan `labelKey="nama"` + `mono={false}`. |
| `apps/admin/src/features/analytics/api.test.js`, `queries.test.js`, `hooks.test.js`, `components/AnalyticsPage.test.jsx`, `components/shared/Leaderboard.test.jsx` | Tambah test untuk fungsi/hook/tab/prop baru; test Overview/Products/Markets/Trends yang sudah ada tetap dipertahankan apa adanya. |

Tidak ada perubahan pada: `store.js`, `GlobalFilterBar.jsx`, `OverviewTab.jsx`, `ProductsTab.jsx`, `MarketsTab.jsx`, `TrendsTab.jsx`, `TrendChart.jsx`, `KpiCard.jsx`/`InsightCard.jsx`, migration Phase 1-3, atau `App.jsx`/`AdminBottomNav.jsx`.

### B.3 RPC: `analytics_customers(p_from, p_to, p_location, p_kode)`

Dibangun sepenuhnya di atas `sales_flat()` (Phase 1, tidak diubah) — termasuk field **all-time** (`repeatCustomer`/`ltv`), yang dicapai dengan memanggil `sales_flat('1900-01-01', '9999-12-31')` (rentang sangat lebar) alih-alih menulis ulang logika unnest jsonb di tempat lain.

Return:
```
{
  leaderboard: { revenueTertinggi, profitTertinggi, qtyTerbanyak: [{pelangganId, nama, value}, ...] },
  insight: { customerBaru, repeatCustomer, avgOrder, ltv, anonymousTransactionCount, anonymousRevenue },
  ranking: [{pelangganId, nama, revenue, profit, qty, jumlahTransaksi}, ...]
}
```

**Business rule kunci (didokumentasikan lengkap di komentar migration SQL):**
- **Identitas customer = `nama`**, bukan kode — pelanggan tidak punya kode. Standar "pakai kode" (R1) hanya berlaku untuk produk.
- **leaderboard & ranking** = periode filter aktif, HANYA transaksi bernama (`pelanggan_id IS NOT NULL`). Leaderboard difilter `value > 0` (pola koreksi yang sama seperti Products); ranking TIDAK difilter (bisa menampilkan revenue/profit negatif kalau ada retur besar), dibatasi `LIMIT 50`.
- **`insight.avgOrder`** = agregat `SUM(revenue)/COUNT(DISTINCT sale_id)` HANYA transaksi bernama pada periode filter — interpretasi eksplisit karena §3.4 dokumen arsitektur menulis definisi ini secara ringkas "per customer" padahal di sini SATU angka aggregate.
- **`insight.ltv`** = ALL-TIME, tapi populasinya "pelanggan yang aktif periode ini" — untuk setiap pelanggan aktif, dihitung SUM(revenue) sepanjang riwayat mereka, lalu di-AVG. Ini interpretasi eksplisit (didokumentasikan sebagai keputusan, bukan bug) karena "LTV" di §3.4/§5.7 juga ditulis sebagai definisi per-pelanggan, sementara output RPC butuh SATU angka.
- **`insight.repeatCustomer`** = ALL-TIME murni, **100% tidak terpengaruh** `p_from`/`p_to` (keputusan final §12 poin 4) — TETAP menghormati `p_location`/`p_kode` seperti pola all-time di Products (`tidakPernahTerjual`).
- **`insight.customerBaru`** = klasifikasi periode filter, tapi window pencarian "tanggal pertama"-nya ALL-TIME (MIN(tanggal) dari seluruh riwayat pelanggan tsb, sale maupun retur) — pelanggan dihitung "baru" kalau tanggal pertama ALL-TIME itu jatuh di `[p_from, p_to]` yang aktif.
- **`insight.anonymousTransactionCount`/`anonymousRevenue`** = transparansi walk-in (§8.3) — transaksi tanpa nama pembeli pada periode filter, TIDAK masuk leaderboard/ranking, ditampilkan sebagai catatan terpisah di UI.

Sudah diverifikasi dengan `sqlfluff --dialect postgres` — hanya warning kosmetik (baris komentar >80 karakter, spacing parameter) yang IDENTIK dengan warning yang sudah ada di migration Phase 2 yang sudah shipped — bukan error baru.

### B.4 Frontend / UI

- Urutan tab: **Overview | Products | Markets | Trends | Customers**.
- Section **Insight**: 4 `KpiCard` (Customer Baru, Repeat Customer, Average Order, Lifetime Value) + catatan kecil membedakan mana yang periode-filter vs all-time, plus catatan transparansi walk-in (hanya muncul kalau ada transaksi anonim > 0).
- Section **Leaderboard**: 3 daftar (Revenue/Profit/Qty Tertinggi) memakai `<Leaderboard labelKey="nama" mono={false}/>` — komponen yang sama dipakai Products, digeneralisasi supaya bisa menampilkan nama (bukan kode) tanpa duplikasi komponen baru.
- Section **Ranking Pelanggan**: kartu per-pelanggan (bukan Leaderboard, karena butuh 4 kolom sub-metric) mengikuti pola visual `MarketDetailPanel`/`MarketsTab` (grid 2 kolom Revenue/Profit/Qty/Transaksi per kartu).
- Tab switcher `AnalyticsPage.jsx` diaudit ulang untuk 5 tab — TETAP `flex-1` (bukan `overflow-x-auto`) supaya tidak reintroduce pola horizontal-scroll yang pernah diperbaiki di audit responsif sebelumnya di codebase ini; label boleh membungkus 2 baris di layar sempit.

### B.5 Testing

62 + 30 test baru/diperbarui untuk requirement change (R1-R6) dan Phase 4 gabungan, ditambah seluruh test Phase 1-3 yang tetap hijau:

| Area | File | Test |
|---|---|---|
| RPC call | `api.test.js` | +5 (`fetchAnalyticsCustomers`) |
| Query | `queries.test.js` | +2 (`useAnalyticsCustomersQuery`) |
| Hook | `hooks.test.js` | +3 (`useAnalyticsCustomers`) + 2 (`datePreset`/`setDatePreset`) + 1 (trend tidak lagi diekspos) |
| Komponen | `CustomersTab.test.jsx` | 8 (baru) |
| Komponen | `Leaderboard.test.jsx` | +4 (`labelKey`/`mono`) |
| Komponen | `TrendChart.test.jsx` | 9 (rewrite total, Recharts) |
| Komponen | `TrendsTab.test.jsx` | 7 (rewrite, chart gabungan) |
| Komponen | `MarketDetailPanel.test.jsx` | 7 (update API TrendChart baru) |
| Komponen | `OverviewTab.test.jsx` | 8 (rewrite, kode + no-chart) |
| Komponen | `GlobalFilterBar.test.jsx` | 12 (rewrite, preset) |
| State | `store.test.js` | 10 (+`datePreset`) |
| Utils | `utils.test.js` | 31 (+`dateRangeForDays`) |
| Halaman | `AnalyticsPage.test.jsx` | 10 (5 tab, switch Customers) |

Dijalankan dan lolos (per kelompok, environment jsdom cukup berat untuk 1 kali jalan penuh dalam batas waktu tooling):
- `{utils,api,hooks,store,queries}.test.js` — 123 test
- `components/tabs/*` (6 file) — 55 test
- `components/shared/*` (5 file) + `AnalyticsPage.test.jsx` + `GlobalFilterBar.test.jsx` — 78 test
- `npm run build:admin` — sukses (883 modul, tidak ada error)
- Truncation scan (`esbuild` syntax check) atas seluruh 36 file `.js`/`.jsx` di `features/analytics` — bersih

### B.6 Kemungkinan Improvement Phase 5

- Drill-down/paginasi per-pelanggan penuh kalau basis pelanggan makin besar (`ranking` saat ini dibatasi `LIMIT 50`) — kandidat kuat untuk pola lazy-detail yang sudah dibangun di Markets (`enabled: !!param`).
- Metric tambahan dari roadmap §4 dokumen arsitektur: Retur Rate, New vs Returning Revenue Split, Basket Size, Weekday Performance, alert Margin Negatif.
- Kalau data historis membesar: pertimbangkan materialized view harian, HANYA kalau ada bukti nyata query mulai lambat.
