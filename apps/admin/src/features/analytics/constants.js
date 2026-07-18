/**
 * features/analytics/constants.js
 * Konstanta murni — tidak ada logic, tidak ada I/O.
 */

// Rentang default saat halaman Analytics pertama dibuka: 30 hari terakhir.
export const DEFAULT_RANGE_DAYS = 30;

// Pilihan granularity untuk tab Trends (RPC analytics_trend mem-fallback ke
// "day" kalau nilai di luar daftar ini dikirim, lihat migration SQL).
export const TREND_GRANULARITIES = [
  { value: "day", label: "Harian" },
  { value: "week", label: "Mingguan" },
  { value: "month", label: "Bulanan" },
  { value: "year", label: "Tahunan" },
];

// ── Redesign navigasi (2026-07) — SectionPicker, BUKAN tab horizontal ────
// Perubahan requirement eksplisit Denny: 9 tab sejajar sudah terlalu banyak
// untuk mobile (tumpang tindih/terpotong/overflow). Diganti dengan 1 tombol
// trigger + bottom sheet terkelompok (lihat shared/SectionPicker.jsx untuk
// alasan lengkap pemilihan pola ini). Nama halaman SEKARANG Bahasa
// Indonesia sederhana ("Ringkasan Bisnis" bukan "Executive", dst) — target
// dashboard ini adalah OWNER TOKO yang bukan orang teknis (instruksi
// eksplisit Denny). `description` (BARU) adalah 1 kalimat penjelasan
// singkat per halaman, ditampilkan di dalam sheet supaya owner tahu isi
// halaman SEBELUM membukanya.
//
// "Ringkasan Bisnis" (dulu "Executive") SENGAJA disematkan (pinned, group
// tersendiri tanpa judul kelompok) DAN menjadi halaman DEFAULT saat
// Analytics dibuka (lihat DEFAULT_ANALYTICS_SECTION di bawah + AnalyticsPage
// .jsx) — evaluasi ulang urutan lama (instruksi eksplisit poin 9 redesign):
// halaman ini yang paling sering dibuka owner, jadi ditaruh sebagai
// beranda, BUKAN dipertahankan di posisi lama (dulu paling kanan/terakhir)
// hanya demi konsistensi urutan tab.
//
// 4 kelompok sisanya (bukan hierarki bisnis formal, murni pengelompokan
// UX supaya 8 halaman non-beranda terasa ~4 pilihan, bukan 8 pilihan
// datar):
//   Penjualan            — Ringkasan Penjualan, Tren Penjualan
//   Produk & Stok        — Produk, Persediaan
//   Pasar & Pelanggan    — Pasar, Pelanggan
//   Prediksi & Analisis  — Prediksi Penjualan, Analisis Lanjutan
export const ANALYTICS_SECTION_GROUPS = [
  {
    groupLabel: null,
    items: [
      {
        key: "executive",
        label: "Ringkasan Bisnis",
        description: "Kondisi bisnis Anda hari ini — masalah, peluang, dan langkah berikutnya.",
      },
    ],
  },
  {
    groupLabel: "Penjualan",
    items: [
      {
        key: "overview",
        label: "Ringkasan Penjualan",
        description: "Total penjualan, keuntungan, dan pelanggan pada periode yang dipilih.",
      },
      {
        key: "trends",
        label: "Tren Penjualan",
        description: "Grafik naik-turun penjualan dari waktu ke waktu.",
      },
    ],
  },
  {
    groupLabel: "Produk & Stok",
    items: [
      {
        key: "products",
        label: "Produk",
        description: "Produk paling laris, paling untung, dan pergerakan stoknya.",
      },
      {
        key: "inventory",
        label: "Persediaan",
        description: "Kesehatan stok gudang — mana yang aman, menipis, atau tidak bergerak.",
      },
    ],
  },
  {
    groupLabel: "Pasar & Pelanggan",
    items: [
      {
        key: "markets",
        label: "Pasar",
        description: "Perbandingan performa tiap cabang/lokasi penjualan.",
      },
      {
        key: "customers",
        label: "Pelanggan",
        description: "Pelanggan paling berkontribusi dan pola belanja mereka.",
      },
    ],
  },
  {
    groupLabel: "Prediksi & Analisis",
    items: [
      {
        key: "forecast",
        label: "Prediksi Penjualan",
        description: "Perkiraan penjualan ke depan berdasarkan histori transaksi.",
      },
      {
        key: "advanced",
        label: "Analisis Lanjutan",
        description: "Analisis mendalam untuk yang ingin menggali lebih jauh.",
      },
    ],
  },
  {
    // Pindahan dari /produksi/laporan (2026-07) — keputusan eksplisit
    // Denny: halaman itu lebih sesuai di Analytics daripada di modul
    // Produksi. Group tersendiri (bukan digabung "Produk & Stok") karena
    // domainnya beda: Produksi = biaya/proses PEMBUATAN barang (batch,
    // bahan, HPP), sedangkan Produk & Stok = performa PENJUALAN produk
    // yang sudah jadi — menggabungkan keduanya akan membuat 1 grup jadi
    // terlalu padat (4 halaman) dan konsepnya jadi kabur.
    groupLabel: "Produksi",
    items: [
      {
        key: "production",
        label: "Ringkasan Produksi",
        description: "Biaya produksi per batch, pemakaian bahan, dan seberapa laku hasil produksi.",
      },
    ],
  },
];

// Bentuk flat {key,label} — diturunkan (derived) dari ANALYTICS_SECTION_GROUPS
// di atas supaya TIDAK ADA dua sumber kebenaran nama halaman. Dipertahankan
// karena beberapa tempat (mis. AnalyticsPage.jsx render switch, test lama)
// lebih mudah bekerja dengan array flat daripada struktur berkelompok.
export const ANALYTICS_TABS = ANALYTICS_SECTION_GROUPS.flatMap((g) => g.items);

// Halaman default saat Analytics pertama dibuka — "Ringkasan Bisnis"
// (BUKAN lagi "overview"/tab pertama array), sesuai instruksi eksplisit:
// Executive/Ringkasan Bisnis adalah halaman yang paling sering dibuka
// owner, jadi dijadikan beranda.
export const DEFAULT_ANALYTICS_SECTION = "executive";

// Berapa produk teratas yang ditampilkan di grafik "Top Product Trend" —
// SAMA dengan LIMIT 5 yang sudah di-hardcode di RPC analytics_trend
// (top5 CTE). Konstanta ini hanya dipakai untuk label UI ("Top 5 Produk"),
// BUKAN untuk membatasi data di frontend — pembatasan sesungguhnya terjadi
// di SQL.
export const TOP_PRODUCT_TREND_LIMIT = 5;

// Berapa baris yang ditampilkan per leaderboard di tab Products — SAMA
// dengan LIMIT 10 yang sudah di-hardcode di RPC analytics_products (setiap
// CTE leaderboard/harga/movement/inventory). Konstanta ini HANYA untuk
// label UI ("Top 10"), BUKAN pembatas data — pembatasan sesungguhnya ada
// di SQL, sama seperti pola TOP_PRODUCT_TREND_LIMIT di atas.
export const PRODUCTS_LEADERBOARD_LIMIT = 10;

// Ambang "Stok Hampir Habis" dalam HARI COVER (total_stok ÷ qty terjual per
// hari) — keputusan final Denny, ANALYTICS_ARCHITECTURE_PLAN.md §12 poin 5.
// Dikirim sebagai PARAMETER ke RPC analytics_products (p_low_stock_cover_days),
// BUKAN di-hardcode di SQL — supaya bisa disesuaikan tanpa migration baru
// kalau ternyata 7 hari kurang/kelebihan pas dipakai nyata.
export const LOW_STOCK_COVER_DAYS = 7;

// Berapa produk teratas yang ditampilkan di panel "Produk Terlaris" saat
// detail 1 market di-expand (tab Markets) — SAMA dengan LIMIT 5 yang sudah
// di-hardcode di RPC analytics_market_detail (produk_terlaris CTE).
// Konstanta ini HANYA untuk label UI, BUKAN pembatas data — pembatasan
// sesungguhnya ada di SQL, pola sama seperti TOP_PRODUCT_TREND_LIMIT dan
// PRODUCTS_LEADERBOARD_LIMIT di atas.
export const MARKET_DETAIL_PRODUCT_LIMIT = 5;

// Preset rentang tanggal di Global Filter Bar — mempercepat UX supaya user
// tidak perlu memilih tanggal manual setiap kali buka Analytics (requirement
// change 2026-07). "custom" TIDAK punya `days` (baru menampilkan date
// picker manual saat dipilih, lihat GlobalFilterBar.jsx). Preset lain
// otomatis mengisi fromDate/toDate lewat dateRangeForDays() (utils.js) —
// TIDAK ADA business logic baru, murni menghitung ulang rentang tanggal
// yang sama seperti defaultDateRange() sebelumnya, hanya dengan jumlah hari
// yang bisa dipilih.
export const DATE_PRESETS = [
  { key: "7d", label: "7 Hari", days: 7 },
  { key: "30d", label: "30 Hari", days: 30 },
  { key: "1y", label: "1 Tahun", days: 365 },
  { key: "custom", label: "Custom", days: null },
];

// Preset default saat halaman Analytics pertama dibuka — SAMA dengan
// DEFAULT_RANGE_DAYS (30 hari) supaya perilaku default TIDAK berubah dari
// sebelum preset ditambahkan.
export const DEFAULT_DATE_PRESET = "30d";

// Berapa baris yang ditampilkan per leaderboard di tab Customers — SAMA
// dengan LIMIT 10 yang sudah di-hardcode di RPC analytics_customers (setiap
// CTE revenue_tertinggi/profit_tertinggi/qty_terbanyak). HANYA untuk label
// UI ("Top 10"), BUKAN pembatas data — pola sama seperti
// PRODUCTS_LEADERBOARD_LIMIT di atas.
export const CUSTOMERS_LEADERBOARD_LIMIT = 10;

// Berapa baris maksimum tabel ranking customer (BEDA dari leaderboard di
// atas — ranking adalah tabel lengkap, bukan cuma top-N per metric) — SAMA
// dengan LIMIT 50 yang sudah di-hardcode di RPC analytics_customers (CTE
// ranking_base). HANYA untuk label UI, BUKAN pembatas data.
export const CUSTOMERS_RANKING_LIMIT = 50;

// ── Phase 6 (Advanced Analytics) ────────────────────────────────────────
// Berapa baris yang ditampilkan di leaderboard Growth/Declining Product &
// Contribution (Revenue/Profit) di tab Advanced — SAMA dengan LIMIT 5/10
// yang sudah di-hardcode di RPC analytics_advanced (CTE top_growth/
// top_declining = 5, revenue_contrib/profit_contrib = 10). HANYA untuk
// label UI, BUKAN pembatas data — pola sama seperti konstanta LIMIT
// lainnya di atas.
export const ADVANCED_GROWTH_LIMIT = 5;
export const ADVANCED_CONTRIBUTION_LIMIT = 10;

// Berapa baris maksimum daftar Pareto yang dikirim RPC (BEDA dari
// `productsFor80Pct`/`totalProducts` yang SELALU akurat dari ranking penuh
// walau daftar `items` terpotong) — SAMA dengan LIMIT 50 di CTE
// pareto_final. HANYA untuk label UI, BUKAN pembatas data — lihat catatan
// panjang soal ini di migration SQL Phase 6.
export const ADVANCED_PARETO_ITEMS_LIMIT = 50;

// ── Phase 7 (Inventory Intelligence) ────────────────────────────────────
// Threshold (dalam HARI) yang dikirim sebagai PARAMETER ke RPC
// analytics_inventory (BUKAN hardcode di SQL — pola sama LOW_STOCK_COVER_DAYS
// di atas) supaya bisa disesuaikan tanpa migration baru kalau angka
// default ternyata kurang/kelebihan pas dipakai nyata. Ini HEURISTIK
// bisnis (siklus jual pasar mingguan gamis/mukena), bukan definisi baku
// universal — lihat catatan lengkap di migration SQL Phase 7.
export const CRITICAL_COVER_DAYS = 3;
export const OVERSTOCK_COVER_DAYS = 60;
export const DEAD_STOCK_DAYS = 30;
export const RESTOCK_TARGET_DAYS = 30;

// Berapa baris yang ditampilkan di leaderboard Dead Stock/Aging Stock/
// Overstock/Understock/Restock di tab Inventory — SAMA dengan LIMIT
// 20 (deadStock) / 10 (lainnya) yang sudah di-hardcode di RPC
// analytics_inventory. HANYA untuk label UI, BUKAN pembatas data.
export const INVENTORY_DEAD_STOCK_LIMIT = 20;
export const INVENTORY_LIST_LIMIT = 10;
export const INVENTORY_RISK_LIMIT = 15;

// ── Phase 8 (Forecast) ───────────────────────────────────────────────────
// Parameter DEFAULT yang dikirim FE ke RPC analytics_forecast (BUKAN
// hardcode di SQL — pola sama seperti LOW_STOCK_COVER_DAYS/
// CRITICAL_COVER_DAYS di atas) supaya bisa disesuaikan tanpa migration
// baru. "week" dipilih sebagai granularity default karena siklus jual
// gamis/mukena mengikuti hari pasar mingguan (lihat marketDay.js) — bukan
// harian yang terlalu noisy untuk moving average dengan histori terbatas.
export const FORECAST_GRANULARITY_DEFAULT = "week";

// Alpha (smoothing factor) untuk Simple Exponential Smoothing — semakin
// besar alpha, semakin besar bobot titik data TERBARU (semakin reaktif
// terhadap perubahan terakhir, tapi semakin noisy). 0.3 adalah nilai
// tengah yang umum dipakai sebagai starting point ketika belum ada
// data historis panjang untuk tuning alpha optimal — SAMA dengan default
// p_alpha di RPC analytics_forecast.
export const FORECAST_ALPHA_DEFAULT = 0.3;

// Berapa periode terakhir yang dipakai sebagai window Moving Average/
// Weighted Moving Average — SAMA dengan default p_lookback_periods di RPC
// analytics_forecast (8 minggu ≈ 2 bulan histori, cukup untuk melihat pola
// tanpa terlalu jauh ke belakang kalau ada perubahan tren produk/musim).
export const FORECAST_LOOKBACK_PERIODS_DEFAULT = 8;

// Berapa periode ke depan yang dipakai sebagai horizon estimasi kebutuhan
// restock — SAMA dengan default p_restock_horizon_periods di RPC
// analytics_forecast (2 periode ke depan, bukan 1, supaya ada buffer waktu
// untuk proses produksi/transfer stok sebelum stok benar-benar habis).
export const FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT = 2;

// Berapa baris yang ditampilkan di leaderboard Product Demand Forecast &
// Restock Forecast di tab Forecast — SAMA dengan LIMIT yang sudah
// di-hardcode di RPC analytics_forecast (topProductTrend mengikuti limit
// analytics_trend = 5 produk, restockForecast dibatasi 10). HANYA untuk
// label UI, BUKAN pembatas data — pola sama seperti konstanta LIMIT
// lainnya di atas.
export const FORECAST_PRODUCT_DEMAND_LIMIT = 5;
export const FORECAST_RESTOCK_LIMIT = 10;

// ── Phase 9 (Executive Dashboard) ───────────────────────────────────────
// Executive Dashboard TIDAK punya RPC sendiri (analytics_executive() SENGAJA
// TIDAK dibuat, per instruksi eksplisit Denny — lihat hooks.js
// useAnalyticsExecutive()) — murni AGREGATOR dari RPC yang sudah ada
// (Overview/Advanced/Products/Markets/Customers/Inventory/Forecast).
// Konstanta di bawah adalah THRESHOLD HEURISTIK untuk status warna
// Business Health (bukan business rule baku universal, bisa disesuaikan
// tanpa migration karena murni dipakai di frontend, TIDAK dikirim ke RPC
// manapun) — dipakai utils.js (classifyMarginHealth/
// classifyReturnRateHealth) untuk mengklasifikasi angka yang SUDAH final
// dari RPC (advanced.kpi.overallMarginPct/returnRate) jadi hijau/kuning/
// merah, TIDAK menghitung ulang metric apa pun.
export const EXECUTIVE_MARGIN_HEALTHY_PCT = 0.2; // margin >= 20% -> hijau
export const EXECUTIVE_MARGIN_WARNING_PCT = 0.1; // margin >= 10% -> kuning, di bawahnya merah
export const EXECUTIVE_RETURN_RATE_WARNING = 0.03; // return rate >= 3% -> kuning
export const EXECUTIVE_RETURN_RATE_RISK = 0.05; // return rate >= 5% -> merah

// Berapa item yang ditampilkan di Section 4 (Biggest Opportunity) dan
// Section 5 (Biggest Risk) — HANYA label UI ("ringkas", sesuai instruksi
// dashboard eksekutif tidak boleh penuh angka), BUKAN pembatas data (data
// sumbernya sendiri sudah dibatasi di RPC masing-masing, lihat
// FORECAST_RESTOCK_LIMIT/INVENTORY_DEAD_STOCK_LIMIT dkk).
export const EXECUTIVE_OPPORTUNITY_LIMIT = 5;
export const EXECUTIVE_RISK_LIMIT = 5;

// Maksimum baris Executive Insight (Section 6) — roadmap Denny minta
// "sekitar 5-10 insight singkat". Fungsi buildExecutiveInsights() (utils.js)
// hanya menyertakan insight yang BENAR-BENAR bisa dinyatakan jujur dari data
// yang tersedia — kalau kurang dari 10 kondisi terpenuhi, daftar boleh
// lebih pendek (TIDAK dipaksakan sampai 10 dengan insight karangan).
export const EXECUTIVE_INSIGHT_MAX = 10;

// ── Phase 9 (Ringkasan Produksi) ────────────────────────────────────────
// Ambang persentase Sell-Through (unitsSoldSinceProduksi / totalKain × 100,
// dihitung penuh di RPC analytics_production) yang dianggap "lambat
// terjual" — HEURISTIK murni untuk WARNA di frontend (ProductionTab.jsx),
// BUKAN dikirim ke RPC/dipakai memfilter data apa pun. Batch produksi yang
// masih baru (sedikit hari sejak tanggal_produksi) WAJAR punya sell-through
// rendah — angka ini murni penanda visual, bukan penilaian "batch ini
// gagal".
export const PRODUCTION_LOW_SELL_THROUGH_PCT = 20;
