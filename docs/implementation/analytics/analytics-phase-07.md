# Laporan Implementasi — Analytics Phase 7 (Inventory Intelligence)

Tanggal: 2026-07-12
Status: **SELESAI** — seluruh test PASS, build PASS, sqlfluff PASS, esbuild (truncation scan) PASS.

## Ringkasan

Phase 7 menambahkan tab baru **Inventory** berisi analisis kesehatan stok:
Stock Health, Dead Stock, Aging Stock, Overstock, Understock, Inventory
Value, Inventory Turnover, Days of Inventory, Suggested Restock, Restock
Priority, dan Stock Risk Indicator. Seluruh metric dihitung di 1 RPC baru
(`analytics_inventory`), dibangun di atas `sales_flat()` dan `stok_warna`
yang sudah ada — tidak ada business logic baru di frontend.

## File Baru

| File | Baris | Keterangan |
| --- | --- | --- |
| `supabase/migrations/20260712_analytics_phase7_inventory_rpc.sql` | 373 | RPC `analytics_inventory()` — seluruh metric Phase 7 |
| `apps/admin/src/features/analytics/components/tabs/InventoryTab.jsx` | 200 | Tab Inventory — 6 section |
| `apps/admin/src/features/analytics/components/tabs/InventoryTab.test.jsx` | 109 | 9 test |

## File yang Diubah

| File | Perubahan |
| --- | --- |
| `api.js` | Tambah `fetchAnalyticsInventory()` + `EMPTY_INVENTORY` |
| `queries.js` | Tambah `useAnalyticsInventoryQuery()` + `analyticsKeys.inventory` |
| `hooks.js` | Tambah `useAnalyticsInventory()` (pass-through murni, fallback struktur kosong, `refetch` konsisten pola Phase 5) |
| `constants.js` | Tambah `"inventory"` di `ANALYTICS_TABS`, `CRITICAL_COVER_DAYS`/`OVERSTOCK_COVER_DAYS`/`DEAD_STOCK_DAYS`/`RESTOCK_TARGET_DAYS` (threshold, dikirim sebagai parameter RPC — bukan hardcode SQL), `INVENTORY_*_LIMIT` (label UI) |
| `AnalyticsPage.jsx` | Import + render `<InventoryTab/>` saat `activeTab === "inventory"` |
| `api.test.js`, `queries.test.js`, `hooks.test.js`, `AnalyticsPage.test.jsx` | Tambah test untuk seluruh penambahan di atas (16 test baru) |

## RPC yang Dibuat

**`analytics_inventory(p_from, p_to, p_location, p_kode, p_low_stock_cover_days, p_critical_cover_days, p_overstock_cover_days, p_dead_stock_days, p_restock_target_days)`**
— dibangun di atas `sales_flat()` dan `stok_warna`, pola reuse sama dengan
`stok_agg`/`movement_base` di `analytics_products` (Phase 2) tapi
menghasilkan metric BARU (Inventory Value/Turnover, Dead/Aging Stock,
Overstock/Understock, Suggested Restock, Restock Priority, Stock Risk) —
bukan duplikasi Phase 2 (Slow/Fast Moving TETAP hanya ada di tab Products,
tidak dibuat ulang di sini).

## ⚠️ Keterbatasan Data (BAGIAN PALING PENTING dari laporan ini)

**1. `expected_stok` TIDAK dipakai untuk Suggested Restock/Overstock —
dan ini keputusan sadar, bukan kelalaian.** Sebelum menulis SQL, saya audit
langsung ke kode yang menulis/membaca tabel `expected_stok`
(`produksi-record/api.js`, `buku-potongan/`). Ternyata tabel itu adalah
baseline REKONSILIASI PRODUKSI ("Buku Potongan" — jumlah kain yang sudah
DIPOTONG produksi per kode×size×warna), dipakai untuk mendeteksi selisih
produksi↔stok. Nilainya TIDAK bereaksi terhadap penjualan/transfer, dan
bisa basi kalau layar Buku Potongan tidak pernah dibuka. Memakainya
sebagai "target restock" akan MENGARANG hubungan bisnis yang tidak ada.
**Solusi realistis yang dipakai**: seluruh metric restock (Suggested
Restock, Restock Priority, Overstock, Understock) dihitung MURNI dari
kecepatan jual aktual (`sales_flat`) dan stok saat ini (`stok_warna`) —
tanpa menyentuh `expected_stok` sama sekali.

**2. Inventory Turnover & Days of Inventory memakai metode simplified,
bukan average-inventory standar.** Skema ini TIDAK menyimpan snapshot stok
historis (hanya stok SAAT INI) — metode "average inventory" (rata-rata
stok awal+akhir periode) yang umum dipakai di akuntansi TIDAK BISA dihitung
presisi tanpa data itu. Solusi yang dipakai: `daysOfInventory` = stok saat
ini ÷ rata-rata COGS harian periode filter (valid & tidak butuh snapshot
historis), dan `inventoryTurnover` DITURUNKAN darinya (bukan dihitung
independen) supaya kedua angka konsisten. Field `summary.method` di
response RPC secara eksplisit berisi label metode yang dipakai, supaya
tidak ada ambiguitas kalau suatu saat dibandingkan dengan software
akuntansi lain yang pakai metode berbeda.

**3. Ambang "dead"/"critical"/"overstock" (hari) adalah HEURISTIK bisnis**
yang bisa disesuaikan (dikirim sebagai parameter RPC, default: kritis <3
hari cover, menipis <7 hari, overstock >60 hari, mati >30 hari tanpa
penjualan) — bukan definisi baku universal. Bisa diubah kapan saja tanpa
migration baru.

Tidak ada metric yang diminta roadmap yang gagal dihitung — "Stock
Coverage" dipenuhi lewat kombinasi `stockHealth` (distribusi SKU per
kategori) + `overstock`/`understock` (leaderboard), bukan section
terpisah, supaya tidak ada 2 representasi berbeda untuk konsep yang sama.

## UI yang Dibuat

Tab **Inventory** (mobile-first, reuse `KpiCard`/`Leaderboard`/
`LoadingState`/`ErrorState`/`classNames.js`) dengan 6 section: Ringkasan
Inventory (4 KpiCard: Nilai Inventory, SKU dengan Stok, Days of Inventory,
Inventory Turnover), Stock Health (grid 6 kategori: Mati/Kritis/Menipis/
Sehat/Overstock/Tanpa Gerak), Dead & Aging Stock (2 Leaderboard, format
"Belum pernah terjual" untuk yang belum pernah ada penjualan sama sekali —
BUKAN 0 hari), Overstock & Understock (2 Leaderboard, format hari cover),
Suggested Restock & Restock Priority (2 Leaderboard, dengan catatan
transparansi "dihitung dari kecepatan jual aktual, BUKAN dari Buku
Potongan"), dan Stock Risk Indicator (Leaderboard gabungan dead+critical
dengan label kategori digabung ke teks value, warna merah untuk mati,
kuning untuk kritis).

## Testing

| Suite | Test | Status |
| --- | --- | --- |
| `api.test.js` (+5 baru) | 40 | PASS |
| `queries.test.js` (+2 baru) | 13 | PASS |
| `hooks.test.js` (+4 baru) | 37 | PASS |
| `InventoryTab.test.jsx` (baru) | 9 | PASS |
| `AnalyticsPage.test.jsx` (updated) | 14 | PASS |
| 7 tab lama (Overview/Products/Markets/MarketDetail/Trends/Customers/Advanced) | 71 | PASS (0 regresi) |
| shared lain (Leaderboard/KpiCard/BarList/GlobalFilterBar/store/InsightCard/LoadingState/ErrorState/TrendChart/utils) | 105 | PASS (0 regresi) |

**Total: 289 test, seluruhnya PASS.** Dua bug ditemukan & diperbaiki
selama proses ini: test `InventoryTab.test.jsx` awalnya query
`getByText("Overstock")` yang ambigu (label "Overstock" muncul 2x — di
grid Stock Health DAN di judul section) — diperbaiki jadi `getAllByText`.

## Build

`npm run build:admin` — **PASS** (889 modules, build 7.7s). Warning bundle
size pre-existing, tidak terkait Phase 7.

## sqlfluff & esbuild (Truncation Scan)

`sqlfluff parse --dialect postgres` atas migration Phase 7 — **PASS**,
tidak ada bagian unparsable. Scan esbuild atas seluruh file
`.js`/`.jsx` di `features/analytics/**` — **bersih**.

## Improvement / Ide Phase Berikutnya

- Kalau Denny nanti mengaktifkan Buku Potongan secara rutin dan
  memvalidasi bahwa `expected_stok` selalu segar, itu bisa jadi SINYAL
  TAMBAHAN (bukan pengganti) untuk restock — misal "produk dengan selisih
  produksi↔stok besar DAN cover days rendah" sebagai indikator gabungan.
  Ini follow-up eksplisit, BUKAN dikerjakan otomatis di sini karena
  freshness `expected_stok` tidak terjamin.
- `restockPriority` saat ini pakai formula sederhana (revenue ÷ cover
  days) — kalau Denny mau bobot berbeda (mis. margin ikut dipertimbangkan),
  itu penyesuaian kecil di 1 CTE, bukan perubahan struktural.
- Snapshot stok historis (kalau suatu saat ditambahkan, mis. tabel harian)
  akan memungkinkan Inventory Turnover dihitung dengan metode
  average-inventory yang lebih presisi — dicatat sebagai catatan teknis
  untuk masa depan, bukan kebutuhan mendesak.

## Catatan Implementasi

- Seluruh penulisan file ke mount Linux dilakukan via bash heredoc/Python.
  Tidak ada insiden silent truncation pada Phase 7 (pelajaran dari Phase
  4-6 diterapkan konsisten: setiap penulisan langsung diverifikasi
  `wc -l`+esbuild).
- Audit `expected_stok` dilakukan via subagent riset terpisah sebelum
  menulis SQL apa pun, PERSIS mengikuti instruksi eksplisit "jangan
  mengarang, jelaskan keterbatasan, beri solusi realistis" — hasilnya
  langsung membentuk keputusan desain RPC (poin Keterbatasan Data #1 di
  atas), bukan ditemukan belakangan setelah terlanjur salah implementasi.

---

Phase 7 selesai. Lanjut ke **Phase 8 — Forecast** (Revenue/Profit/Sales/
Product Demand/Restock/Customer Forecast, metode explainable: Moving
Average/Weighted Moving Average/Exponential Smoothing, TANPA AI/ML) sesuai
roadmap.
