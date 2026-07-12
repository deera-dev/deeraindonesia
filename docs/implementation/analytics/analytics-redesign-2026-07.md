# Laporan Implementasi — Perbaikan SQL Forecast & Redesign UI/UX Analytics
**Tanggal:** 12 Juli 2026
**Modul:** `apps/admin/src/features/analytics/` (halaman Analytics/Dasbor Bisnis, admin.deera.id)

---

## 1. Ringkasan Perubahan

Pekerjaan ini terdiri dari dua bagian yang saling independen tapi dikerjakan dalam satu sesi:

**Bagian A — Perbaikan SQL (WAJIB, error 42P20).** Migration `analytics_forecast()` diaudit menyeluruh untuk pola *nested window function* (`MAX(ROW_NUMBER() OVER(...)) OVER(...)` dan sejenisnya) yang menyebabkan PostgreSQL menolak query dengan error `42P20: window function calls cannot be nested`. Hasil audit: migration tersebut **sudah berisi perbaikan yang benar dan lengkap** (staged CTE `all_series_rn` → `all_series_ranked`), sehingga tidak ada perubahan SQL yang perlu dilakukan lagi. Perbaikan yang sudah ada divalidasi ulang di sesi ini lewat tiga lapis: `sqlfluff parse`, `pglast.parse_sql()`, dan yang terpenting — **eksekusi nyata di server PostgreSQL 14 lokal** (dibangun rootless di sandbox) dengan 5 skenario data berbeda. Seluruh migration Analytics lain (Phase 1-7) turut diaudit untuk pola serupa — tidak ditemukan pelanggaran.

**Bagian B — Redesign total UI/UX Analytics (WAJIB, requirement change).** Seluruh halaman Analytics (9 tab) dirombak untuk target pengguna pemilik toko non-teknis: navigasi tab horizontal (yang overflow di mobile) diganti dengan pemilih halaman berbentuk bottom-sheet terkelompok; seluruh istilah bisnis/teknis diterjemahkan & disederhanakan ke Bahasa Indonesia yang akrab bagi pemilik toko fashion; setiap section diberi deskripsi 1 kalimat; setiap KPI yang berpotensi membingungkan diberi `hint` penjelasan; halaman "Ringkasan Bisnis" (dulu Executive) dijadikan halaman utama/default dengan struktur baru yang berfokus pada 4 pertanyaan (kondisi bisnis, masalah terbesar, peluang terbesar, tindakan yang perlu dilakukan) dan Tindakan Prioritas 3-tingkat (Tinggi/Sedang/Rendah); halaman-halaman yang terlalu padat (Produk, Persediaan, Prediksi Penjualan, Analisis Lanjutan) direstrukturisasi memakai progressive disclosure (`<details>` collapsed by default) supaya tetap mudah dipindai di layar HP tanpa kehilangan data apa pun.

**TIDAK ADA perubahan business logic.** Seluruh RPC, query Supabase, kalkulasi, dan struktur data tetap identik — perubahan di Bagian B murni pada label teks, pengelompokan tampilan, dan urutan render.

---

## 2. File Baru

| File | Keterangan |
|---|---|
| `apps/admin/src/features/analytics/components/shared/SectionPicker.jsx` | Komponen navigasi baru — trigger button + bottom-sheet terkelompok, menggantikan tab horizontal. Reuse `BottomSheet` yang sudah ada di `shared/components/`. |
| `apps/admin/src/features/analytics/components/shared/SectionPicker.test.jsx` | 8 test: trigger, buka/tutup sheet, grouping, deskripsi, seleksi, `aria-current`, scoped truncate-scan. |

---

## 3. File yang Diubah

**SQL:** Tidak ada — `20260712_analytics_phase8_forecast_rpc.sql` sudah benar sejak awal sesi ini (lihat §5).

**Konstanta & routing:**
- `constants.js` — `ANALYTICS_TABS` (array flat) diganti `ANALYTICS_SECTION_GROUPS` (dikelompokkan per tema) + `ANALYTICS_TABS` diturunkan otomatis via `.flatMap()` (backward compatible) + `DEFAULT_ANALYTICS_SECTION = "executive"`.
- `components/AnalyticsPage.jsx` — navigasi tab diganti `<SectionPicker/>`, halaman default diubah ke Ringkasan Bisnis, judul halaman disederhanakan jadi "Dasbor Bisnis".

**Komponen shared (aditif, tidak mengubah kontrak lama):**
- `components/shared/KpiCard.jsx` — tambah prop opsional `hint` (penjelasan istilah, selalu tampil sebagai teks kecil, bukan tooltip).

**Logic (aditif, tidak mengubah field/perilaku lama):**
- `utils.js` — `trendDirection()` di-export (dulu privat); tambah `buildPrioritizedQuickActions()` (fungsi murni, pengelompokan Tinggi/Sedang/Rendah dari data yang sudah ada).
- `hooks.js` — `useAnalyticsExecutive()` menambahkan field baru `quickActionsPrioritized` (field lama `quickActions` tetap ada, tidak dihapus).

**Sembilan halaman tab (redesign label, deskripsi, hint, dan pengelompokan tampilan):**
`ExecutiveTab.jsx` (→ "Ringkasan Bisnis", redesign total), `OverviewTab.jsx` (→ "Ringkasan Penjualan"), `ProductsTab.jsx` (→ "Produk"), `MarketsTab.jsx` (→ "Pasar") + `MarketDetailPanel.jsx`, `CustomersTab.jsx` (→ "Pelanggan"), `TrendsTab.jsx` (→ "Tren Penjualan"), `InventoryTab.jsx` (→ "Persediaan"), `ForecastTab.jsx` (→ "Prediksi Penjualan"), `AdvancedTab.jsx` (→ "Analisis Lanjutan").

**Seluruh file test yang bersesuaian dengan 9 halaman di atas** diperbarui mengikuti label/struktur baru (lihat §6).

---

## 4. Redesign UI/UX — Penjelasan & Alasan Desain

### 4.1 Navigasi: dari 9 tab horizontal → `SectionPicker` (trigger + bottom-sheet terkelompok)

Tab horizontal lama overflow di layar HP (9 label, sebagian dalam Bahasa Inggris panjang). Opsi yang dipertimbangkan: segmented control, chip nav, card selector, accordion menu, floating picker. Dipilih **bottom-sheet dengan grouping tematik** karena: (1) hanya perlu 1 tap untuk membuka, cocok penggunaan satu tangan; (2) reuse komponen `BottomSheet` yang sudah ada di codebase (`shared/components/BottomSheet.jsx`, dipakai fitur `produksi-hpp`) — sesuai prinsip "jangan buat komponen baru kalau yang lama bisa dipakai"; (3) grouping (Penjualan / Produk & Stok / Pasar & Pelanggan / Prediksi & Analisis) langsung menjawab instruksi untuk mengurangi kompleksitas navigasi lebih lanjut, bukan sekadar daftar 9 nama datar; (4) trigger button menampilkan nama halaman aktif, jadi pemilik toko selalu tahu "saya sedang di halaman apa" tanpa perlu membuka sheet.

### 4.2 Ringkasan Bisnis sebagai halaman utama

Diubah dari "Executive" (tab ke-8 dari 9, jarang dilihat pertama) menjadi entri pertama dan default (`DEFAULT_ANALYTICS_SECTION`), karena inilah halaman yang paling sering dibutuhkan pemilik toko: kondisi bisnis, masalah, peluang, dan tindakan — dalam satu pandangan. Direstruktur total: 7 KPI Executive lama dipadatkan jadi 4 KPI utama + 3 KPI sekunder di balik `<details>` "Lihat Detail Angka Lainnya" (progressive disclosure, native HTML, tanpa JS tambahan); ringkasan Prediksi & Persediaan yang tadinya berupa grid KPI dipadatkan jadi satu kalimat naratif (`InsightCard`) supaya tidak duplikasi angka dengan section lain; Tindakan Prioritas dikelompokkan 3 tingkat urgensi (Tinggi/Sedang/Rendah) sesuai skema yang diminta, dengan pesan "kondisi bisnis sedang baik" jika tidak ada yang perlu ditindaklanjuti.

### 4.3 Terjemahan & penyederhanaan istilah

Seluruh istilah bisnis/statistik diterjemahkan mengikuti pemetaan yang diberikan (Margin→Persentase Keuntungan, Inventory Turnover→Kecepatan Perputaran Stok, Dead Stock→Stok Tidak Bergerak, Pareto→Produk Paling Berpengaruh, ABC Classification→Kelompok Produk Penting, Revenue/Customer/Market Concentration→Penyumbang Penjualan Terbesar/Pelanggan Paling Berkontribusi/Cabang Penyumbang Penjualan Terbesar, dst) dan diperluas ke istilah lain yang tidak eksplisit disebutkan tapi sama teknisnya (mis. "SKU"→"Jenis Produk Berstok", "HPP"→"Modal" di halaman Produk, "Moving Average/Weighted MA/Exponential Smoothing"→"Perkiraan Stabil/Menyesuaikan/Tren Terbaru" di Prediksi Penjualan dengan angka mentahnya tetap tersedia di balik `<details>` "Detail Teknis" — tidak dihapus, hanya disembunyikan dari tampilan default).

### 4.4 Progressive disclosure untuk halaman padat

Empat halaman paling padat direstruktur pakai `<details>` (native, tanpa state JS tambahan, aksesibel):
- **Produk**: sub-section "Harga" dan "Kecepatan Terjual" collapsed; "Produk Terbaik" dan "Stok" tetap terbuka (paling sering dicari).
- **Persediaan**: "Ringkasan", "Kesehatan Stok", "Saran Tambah Stok" terbuka; "Stok Tidak Bergerak", "Stok Berlebih & Kurang", "Indikator Risiko Stok" collapsed.
- **Prediksi Penjualan**: "Prediksi Penjualan (Rupiah)" dan "Prediksi Keuntungan" terbuka; "Jumlah Terjual & Pelanggan" dan "Permintaan per Produk" collapsed; "Saran Restock" tetap terbuka (paling actionable). Detail teknis (alpha, lookback, granularity mentah) disembunyikan di balik toggle terpisah.
- **Analisis Lanjutan** (paling padat, 12 section lama) — direstruktur jadi 1 section terbuka ("Angka Penting") + 7 accordion tematik (Perbandingan Periode; Produk Naik & Turun; Kontribusi Penjualan yang menggabungkan Contribution+Product Mix+Pareto+ABC; Penyumbang Penjualan Terbesar; Pelanggan Baru vs Lama; Waktu Penjualan; Risiko Keuntungan). Tidak ada data yang dihilangkan — hanya dikelompokkan ulang supaya halaman ini terasa seperti menu eksplorasi lanjutan, bukan dashboard yang harus dibaca sekaligus.

### 4.5 Deskripsi section & hint KPI

Setiap section (baik yang terbuka maupun di dalam accordion) diberi 1-2 kalimat deskripsi dalam Bahasa Indonesia sederhana, tanpa jargon. KPI yang istilahnya berpotensi membingungkan (Kecukupan Stok, Kecepatan Perputaran Stok, Nilai Persediaan, Nilai Pelanggan, dll) diberi `hint` — teks kecil selalu tampil di bawah nilai (bukan tooltip, karena tooltip tidak ramah sentuh di HP).

---

## 5. Penjelasan Perbaikan SQL Forecast (Bagian A)

Migration `supabase/migrations/20260712_analytics_phase8_forecast_rpc.sql` (fungsi `analytics_forecast()`) diaudit baris-per-baris untuk pola `MAX(ROW_NUMBER() OVER(...)) OVER(...)` dan variannya. Hasilnya: file tersebut **sudah memuat perbaikan yang benar dan lengkap sejak awal sesi ini**, dengan struktur staged-CTE persis seperti yang diminta:

1. CTE `all_series_rn` — menghitung `ROW_NUMBER() OVER(PARTITION BY series_key ORDER BY periode) AS rn` dan `COUNT(*) OVER(PARTITION BY series_key) AS n` sebagai kolom biasa (window function TIDAK bersarang di sini, keduanya window function level pertama).
2. CTE `all_series_ranked` — menghitung `MAX(rn) OVER(PARTITION BY series_key) AS max_rn`, di mana `rn` pada titik ini sudah menjadi KOLOM BIASA (hasil dari CTE sebelumnya), bukan panggilan window function lagi — sehingga TIDAK ADA nested window function.

Verifikasi dilakukan berlapis:
- **`sqlfluff parse --dialect postgres`** (dengan config `large_file_skip_byte_limit=0` supaya file besar tidak di-skip diam-diam) → 0 unparsable.
- **`pglast.parse_sql()`** → PARSE OK, 2 statements.
- **Eksekusi nyata** di server PostgreSQL 14 rootless (dibangun di sandbox via `apt-get download` + `dpkg -x`, tanpa akses root/docker) — fungsi dependensi (`sales_flat()`, `analytics_trend()`), tabel stub (`products`, `pelanggan`, `sales`, `stok_warna`), dan 10 minggu data sample di-seed, lalu `analytics_forecast()` dijalankan 5 skenario: rentang 12 minggu normal, rentang 1 hari (memverifikasi `ma`/`wma`/`es` mengembalikan `null` bukan error saat histori < 2 titik), filter lokasi+kode, granularity harian/bulanan/tahunan, dan rentang tanggal kosong. **Hasil: 0 error 42P20 di seluruh skenario, struktur output sesuai kontrak yang didokumentasikan.**

Audit yang sama (pencarian pola `OVER`) juga dijalankan ke seluruh migration Analytics lain (Phase 1, 2, 3, 4, 6, 6-extension, 7) — Phase 6/6-extension memakai dua window function independen (tidak bersarang), yang sah secara PostgreSQL. Tidak ditemukan pelanggaran lain.

**Kesimpulan Bagian A: tidak ada perubahan kode SQL yang dilakukan pada sesi ini** — fungsi sudah benar, RPC output/field/urutan data/algoritma forecast 100% tidak berubah.

---

## 6. Testing

Seluruh 25 file test dalam `features/analytics/` dijalankan (bukan hanya file yang diubah), untuk memastikan tidak ada regresi lintas file:

| Kelompok | File | Test |
|---|---|---|
| Tab (9 halaman) | `ExecutiveTab`, `OverviewTab`, `ProductsTab`, `MarketsTab`, `MarketDetailPanel`, `CustomersTab`, `TrendsTab`, `InventoryTab`, `ForecastTab`, `AdvancedTab` | 20+11+14+12+8+12+10+12+12+20 = **131 test** |
| Navigasi & halaman | `AnalyticsPage`, `SectionPicker` | 16+8 = **24 test** |
| Komponen shared lain | `KpiCard`, `InsightCard`, `Leaderboard`, `LoadingState`, `ErrorState`, `BarList`, `GlobalFilterBar` | 12+6+12+5+5+6+13 = **59 test** |
| Logic | `utils.test.js`, `hooks.test.js`, `queries.test.js`, `api.test.js`, `store.test.js` | 85+56+15+47+10 = **213 test** |
| **Total** | **25 file** | **427 test — SEMUA PASSED** |

Kegagalan yang ditemukan & diperbaiki selama pengerjaan (semua akibat ambiguitas query test setelah rename label, bukan bug produk): teks berulang lintas konteks setelah istilah Indonesia dipakai di lebih dari satu tempat (mis. "Keuntungan" muncul sebagai label KPI dan label statistik cabang di `OverviewTab`; "Produk"/"Stok Berlebih" muncul di trigger + isi sheet) — diperbaiki dengan `getAllByText`/selector yang lebih spesifik, bukan mengubah komponen.

---

## 7. Build

```
npm run build:admin
✓ 892 modules transformed
✓ built in 8.76s
```

Build produksi berhasil tanpa error. Satu warning pre-existing (chunk `index.js` 1.34 MB, di luar cakupan pekerjaan ini) tidak berkaitan dengan perubahan sesi ini.

---

## 8. sqlfluff

```
sqlfluff parse --dialect postgres (config large_file_skip_byte_limit=0)
→ 0 unparsable
```

Lihat detail lengkap di §5.

---

## 9. Truncation Scan

Seluruh 53 file JS/JSX di `features/analytics/` di-scan pakai `esbuild` (mendeteksi truncation via syntax error) — **0 file rusak**. Seluruh penulisan file di sesi ini dilakukan via `bash heredoc`/Python ke path Linux (`/sessions/.../mnt/deeraindonesia/...`), TIDAK PERNAH via tool `Edit`/`Write` Windows pada mount tersebut, sesuai aturan CLAUDE.md. Grep tambahan untuk class `truncate`/`whitespace-nowrap`/`overflow-hidden` di seluruh komponen non-test — 0 kemunculan di kode aktif (hanya muncul di dalam komentar dokumentasi yang menjelaskan bahwa class tersebut SENGAJA tidak dipakai).

---

## 10. Catatan Implementasi & Keputusan Desain

- **Tidak ada perubahan business logic** di seluruh Bagian B — setiap komponen tab tetap memanggil hook yang sama persis (`useAnalyticsOverview()`, `useAnalyticsProducts()`, dst), field yang dibaca dari hook tetap sama, hanya cara merender & label teks yang berubah.
- **Prop/field baru bersifat aditif** — `KpiCard` menerima `hint` opsional (default tidak tampil, tidak mempengaruhi pemanggil lama), `useAnalyticsExecutive()` menambah `quickActionsPrioritized` tanpa menghapus `quickActions` lama, `ANALYTICS_TABS` tetap ada (diturunkan dari `ANALYTICS_SECTION_GROUPS`) untuk kompatibilitas mundur jika ada konsumen lain.
- **`GlobalFilterBar.jsx` dan `AdminBottomNav.jsx` sengaja tidak disentuh** — di luar cakupan redesign Analytics, dan kedua komponen ini dipakai lintas fitur lain.
- **Detail teknis tidak pernah dihapus, hanya disembunyikan** — angka MA/WMA/ES/alpha/lookback di Prediksi Penjualan, dan breakdown lengkap di Analisis Lanjutan, semuanya tetap bisa diakses lewat `<details>`, memenuhi prinsip "jangan sembunyikan data, kelola kepadatannya".
- **Ranking Pelanggan** (daftar lengkap di halaman Pelanggan) sengaja dijadikan collapsed karena sudah terwakili oleh section "Pelanggan Terbaik" (top 3 per kategori) di atasnya.

---

## 11. Improvement Selanjutnya (Rekomendasi, Belum Dikerjakan)

- Pertimbangkan menambahkan indikator visual kecil (badge angka) pada trigger `SectionPicker` untuk halaman yang punya tindakan mendesak (mis. badge merah kecil di "Persediaan" kalau ada stok kritis) — akan membantu pemilik toko tahu ke mana harus melihat tanpa membuka semua halaman.
- `AdvancedTab` (Analisis Lanjutan) masih merupakan halaman terpadat meski sudah di-accordion — bisa dipertimbangkan untuk memecah jadi sub-halaman terpisah lewat `SectionPicker` di masa depan jika datanya terus bertambah.
- Precompute/cache di sisi RPC untuk `analytics_forecast` bisa dipertimbangkan jika jumlah produk & histori transaksi terus tumbuh (saat ini dihitung on-demand per request).
- Chunk size warning saat build (`index.js` 1.34 MB) bukan bagian dari pekerjaan ini, tapi layak diagendakan terpisah — code-splitting per fitur/halaman admin akan mempercepat load awal.
