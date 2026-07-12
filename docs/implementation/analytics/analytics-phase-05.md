# Laporan Implementasi — Analytics Phase 5 (Dashboard Polish)

Tanggal: 2026-07-12
Status: **SELESAI** — seluruh test PASS, build PASS, truncation scan bersih.

## Ringkasan

Phase 5 adalah audit & polish menyeluruh atas modul Analytics (Phase 1-4)
tanpa mengubah satu pun business rule atau RPC. Scope: loading state,
error state, skeleton, animation ringan, accessibility, konsistensi
styling, dan performance ringan (memoization). Semua perubahan bersifat
presentational — tidak ada migration SQL baru pada phase ini.

## File Baru

| File | Baris | Keterangan |
| --- | --- | --- |
| `apps/admin/src/features/analytics/components/shared/classNames.js` | 33 | Konstanta className bersama (sectionTitleCls, subTitleCls, statLabelCls, statValueCls) — DRY, dipakai 6 tab |
| `apps/admin/src/features/analytics/components/shared/LoadingState.jsx` | 62 | Skeleton loader (`variant`: kpi/list/chart) menggantikan teks "Memuat X..." |
| `apps/admin/src/features/analytics/components/shared/ErrorState.jsx` | 37 | Kotak error + tombol "Coba Lagi" (retry via `refetch`) |
| `apps/admin/src/features/analytics/components/shared/LoadingState.test.jsx` | 36 | 5 test |
| `apps/admin/src/features/analytics/components/shared/ErrorState.test.jsx` | 33 | 5 test |

## File yang Diubah

| File | Perubahan |
| --- | --- |
| `hooks.js` | Setiap hook data (`useAnalyticsOverview`, `useAnalyticsTrend`, `useAnalyticsProducts`, `useAnalyticsMarkets`, `useAnalyticsMarketDetail`, `useAnalyticsCustomers`) sekarang juga mengembalikan `refetch` (pass-through murni dari `useQuery().refetch`) |
| `OverviewTab.jsx`, `ProductsTab.jsx`, `MarketsTab.jsx`, `MarketDetailPanel.jsx`, `TrendsTab.jsx`, `CustomersTab.jsx` | Tambah `if (error) return <ErrorState onRetry={refetch}/>` sebelum branch loading; branch loading diganti dari teks polos ke `<LoadingState variant="..."/>` sesuai layout akhir tiap section; import className dari `shared/classNames.js` |
| `AnalyticsPage.jsx` | Tab switcher: `role="tablist"` pada wrapper, `role="tab"` + `aria-selected` pada tiap button; konten tab dibungkus `key={activeTab}` + `animate-fadeIn` + `role="tabpanel"` |
| `GlobalFilterBar.jsx` | Tombol preset tanggal (7 Hari/30 Hari/1 Tahun/Custom) dapat `aria-pressed` |
| `MarketsTab.jsx` | Tombol "Lihat Detail/Tutup Detail" dapat `aria-expanded` |
| `TrendsTab.jsx` | Tombol granularity dapat `aria-pressed` |
| `KpiCard.jsx`, `InsightCard.jsx`, `Leaderboard.jsx` | Dibungkus `React.memo()` — cegah re-render tak perlu saat sibling state berubah (mis. GlobalFilterBar select) |
| `apps/admin/tailwind.config.js` | Tambah `keyframes.fadeIn` + `animation.fadeIn` (250ms, opacity-only) di `theme.extend` |
| 6 file test tab (`OverviewTab/ProductsTab/MarketsTab/MarketDetailPanel/TrendsTab/CustomersTab.test.jsx`) | Ganti assertion "Memuat X..." → cek `.animate-pulse`; tambah test ErrorState + retry |
| `GlobalFilterBar.test.jsx` | Tambah test `aria-pressed` pada preset tanggal |
| `AnalyticsPage.test.jsx` | Tambah test `role="tablist"`/`role="tab"`/`aria-selected`; perbaiki 1 test lama (`getAllByRole("button")` → `getAllByRole("tab")`, karena role eksplisit `tab` meng-override role implisit `button`) |
| `hooks.test.js` | Tambah 6 test refetch pass-through (satu per hook data) |
| `MarketsTab.test.jsx`, `TrendsTab.test.jsx` | Tambah test `aria-expanded`/`aria-pressed` masing-masing |

## RPC yang Dibuat

Tidak ada. Phase 5 murni presentation layer — tidak menyentuh migration
atau RPC apa pun, sesuai instruksi "Jangan mengubah business rule".

## Business Rule

**Tidak berubah.** Satu-satunya penyesuaian visual yang berbatasan dengan
"konsistensi data tampilan" (bukan business rule): warna value "Qty" pada
Market Summary di `OverviewTab.jsx` diseragamkan dari `text-skin-text3`
menjadi `text-skin-text2` (lewat `statValueCls` bersama) — sebelumnya ini
outlier dibanding pola yang sama di `MarketsTab.jsx`/`MarketDetailPanel.jsx`
yang sudah pakai `text-skin-text2`. Ini keputusan desain sadar (dicatat di
komentar kode), bukan perubahan angka/kalkulasi apa pun.

## UI yang Dibuat

- **Skeleton loading** (`LoadingState`, 3 varian: kpi/list/chart) menggantikan
  teks "Memuat..." di seluruh 6 tab + MarketDetailPanel — bentuk skeleton
  mengikuti layout akhir tiap section supaya transisi loading→data tidak
  "melompat".
- **Error state dengan retry** (`ErrorState`) — sebelumnya `error` dari hook
  sudah ada sejak Phase 1 tapi tidak pernah dirender; sekarang setiap tab
  menampilkan pesan error + tombol "Coba Lagi" yang memanggil `refetch()`.
- **Animasi ringan**: transisi fade 250ms (opacity-only) saat berpindah tab,
  via Tailwind `animate-fadeIn` + `key={activeTab}`.
- **Accessibility**: `role="tablist"`/`role="tab"`/`aria-selected` pada tab
  switcher, `aria-pressed` pada tombol preset tanggal & granularity,
  `aria-expanded` pada tombol expand/collapse detail market.
- **Konsistensi**: `classNames.js` menghapus duplikasi literal className di
  6 tab; 1 inkonsistensi warna nyata ditemukan & diperbaiki (lihat di atas).
- **Performance ringan**: `KpiCard`/`InsightCard`/`Leaderboard` dibungkus
  `React.memo()`. Catatan jujur: efektivitasnya tidak seragam — pemanggil
  yang mengoper inline arrow function sebagai prop (`valueFormatter`,
  `valueClassName`, dsb) tetap membuat identitas prop baru tiap render,
  sehingga `memo` tidak selalu mencegah re-render pada kasus itu. Tetap
  dipasang karena tidak merugikan dan membantu pada pemanggil yang memakai
  fungsi level-modul (identitas stabil).

## Testing

Seluruh test suite terkait Phase 5 dijalankan (batch per grup file, semua PASS):

- `hooks.test.js`, `GlobalFilterBar.test.jsx`, `AnalyticsPage.test.jsx` — 54 test
- `OverviewTab/ProductsTab/MarketsTab/MarketDetailPanel.test.jsx` — 40 test
- `TrendsTab/CustomersTab.test.jsx`, `LoadingState/ErrorState.test.jsx` — 28 test
- `Leaderboard/KpiCard/InsightCard.test.jsx`, `GlobalFilterBar.test.jsx`, `hooks.test.js` — 68 test
- `api.test.js`, `queries.test.js`, `store.test.js`, `utils.test.js` (tidak tersentuh Phase 5, verifikasi tanpa regresi) — 80 test

**Total: 208+ test, seluruhnya PASS, nol regresi** pada file yang tidak
diubah Phase 5.

Satu bug ditemukan & diperbaiki selama proses ini: test lama
`AnalyticsPage.test.jsx` memakai `getAllByRole("button")` untuk membaca
label tab — setelah tab button diberi `role="tab"` eksplisit (untuk
accessibility), role eksplisit meng-override role implisit `button`
sehingga query lama tidak lagi menemukan elemen. Diperbaiki ke
`getAllByRole("tab")`.

## Build

`npm run build:admin` — **PASS** (886 modules, build 7.5s). Satu warning
pre-existing (bundle size >500kB, chunking) tidak terkait Phase 5 dan
sudah ada sejak Phase 1-4.

## Truncation Scan

Scan esbuild atas seluruh file `.js`/`.jsx` di `features/analytics/**` —
**bersih**, tidak ada file terpotong. (Script repo `check-truncation.sh`
timeout saat scan seluruh repo di sandbox ini — sudah cukup diverifikasi
lewat scan langsung terhadap seluruh file yang disentuh Phase 5.)

## Improvement / Ide Phase Berikutnya

- Skeleton `LoadingState` masih generik per-variant; kalau modul Analytics
  terus tumbuh, mungkin perlu skeleton yang benar-benar per-komponen
  (misal skeleton chart yang meniru bentuk garis TrendChart).
- `React.memo` pada `Leaderboard`/`KpiCard` baru benar-benar berguna kalau
  pemanggil di tab-tab juga menstabilkan prop function (misal
  `useCallback`/formatter level-modul) — bisa jadi follow-up kecil di
  Phase 6 kalau profiling menunjukkan re-render berlebih.
- Empty state (data kosong, bukan loading/error) sudah ada di
  `Leaderboard` (`emptyMessage`) sejak Phase 1-4 — tidak diubah di Phase
  5, sudah cukup konsisten.

## Catatan Implementasi

- Semua penulisan file ke mount Linux dilakukan via bash heredoc/Python
  sesuai aturan CLAUDE.md — dua kali sempat salah pakai tool Edit Windows
  (pada `Leaderboard.jsx` dan `AnalyticsPage.jsx`) dan langsung terdeteksi
  via `wc -l`+esbuild sebelum sempat lolos ke test/build, lalu diperbaiki
  dengan rewrite penuh via heredoc.
- Tidak ada metric/data yang "dikarang" — Phase 5 tidak memperkenalkan
  metric baru sama sekali, murni presentation layer di atas data yang
  sudah ada sejak Phase 1-4.

---

Phase 5 selesai. Lanjut ke **Phase 6 — Advanced Analytics** (Return Rate,
Margin Analysis, Pareto 80/20, dll — semua lewat RPC baru), sesuai roadmap.
