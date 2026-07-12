# Laporan Audit — Migration Phase 1: Read Layer Audit

> Audit read-only. Tidak ada RPC, migration, perubahan frontend, hook, business
> logic, atau database yang dibuat pada fase ini — sesuai instruksi.

Scope: `apps/admin/src/features/**/api.js` (13 file) + `packages/shared/features/**/api.js`
(4 file), ditambah 2 file yang melanggar Dependency Inversion (memanggil `supabase`
langsung, bukan lewat `api.js`) yang ditemukan saat audit.

---

## 1. Ringkasan Temuan

Total **24 fungsi READ** diaudit dari 17 file `api.js`, plus 2 pola tambahan yang
ditemukan di luar `api.js` (N+1 di `approveTransfer`, dan 2 komponen `apps/pos`
yang query langsung ke Supabase). Dari seluruh query READ:

- **5 masuk Priority A** — kandidat kuat untuk RPC.
- **6 masuk Priority B** — layak RPC tapi tidak mendesak.
- **13 masuk Priority C** — tetap Supabase query biasa, tidak ada manfaat migrasi.

Dua temuan paling signifikan:

1. **`fetchSalesByKode`** (`apps/admin/src/features/produk/api.js`) — menarik
   sampai **10.000 baris** tabel `sales` (milik SEMUA produk, bukan hanya
   produk yang diminta) ke client, lalu memfilter & menjumlahkan qty per
   lokasi untuk SATU `kode` secara manual di JavaScript. Dipanggil setiap
   `ProductDetailModal` dibuka.
2. **`approveTransfer`** (`packages/shared/features/transfers/api.js`) —
   untuk transfer dengan K item, menjalankan **K query SELECT + K query
   UPDATE secara berurutan** (loop `for...of`) ke tabel `stok_warna`, plus
   pola read-then-write yang tidak atomik (celah race condition jika dua
   admin approve transfer berbeda yang menyentuh baris stok sama secara
   bersamaan).

---

## 2. Daftar Lengkap Query READ

### 2.1 `apps/admin/src/features/buku-potongan/api.js`

| Fungsi | Query dijalankan | Join? | Aggregate? | Duplicate logic? |
|---|---|---|---|---|
| `fetchBukuPotonganData()` | 2 (paralel via `Promise.all`: `stok_warna` + `expected_stok`) | Tidak (merge di client) | Tidak | Tidak |

### 2.2 `apps/admin/src/features/history/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchHistory({dateFrom,dateTo,category})` | 1, filtered `.order().limit(500)` | Tidak | Tidak | Tidak |

### 2.3 `apps/admin/src/features/produk/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchStokMap()` | 1, **tanpa filter** — seluruh tabel `stok_warna` ditarik, lalu `for` loop di client melakukan SUM per `kode` dan SUM bersarang per `kode+size` (3 lokasi) | Tidak | **Ya — di client** (harusnya `GROUP BY`+`SUM`) | Tidak |
| `fetchStokWarnaByKode(kode)` | 1, filtered `.eq("kode",...)`, direshape jadi map size→warna di client | Tidak | Tidak | Mirip pola `fetchStokMap` tapi untuk 1 produk |
| `fetchSalesByKode(kode)` | 1, TAPI `.limit(10000)` tanpa filter `kode` di level SQL — comment kode menyebut default limit Supabase 1000, sengaja dinaikkan ke 10000. Filter `kode` dan SUM qty per lokasi dilakukan manual di nested loop client, menangani 2 bentuk item (qty flat vs `warna[].qty`) | Tidak | **Ya — di client, dari data yang salah-sasaran** (semua produk ditarik, cuma 1 dipakai) | Tidak |
| `deleteProductCascade(kode)` *(WRITE-dominan)* | 7 round-trip: 4 DELETE → **1 SELECT** (`products` by kode, untuk snapshot audit log) → 1 DELETE lagi → 1 INSERT (`logHistory`) | Tidak | Tidak | — |

### 2.4 `apps/admin/src/features/produksi-bahan/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchBahanItems(table)` | 1, `select *` order `tanggal` | Tidak | Tidak | Tidak |
| `fetchStokBahan()` | 1, dari **VIEW** `v_stok_bahan` (agregasi sudah di DB) | — (sudah view) | Sudah di DB | Tidak |
| `detectDupes(table)` | 1, `select *` tanpa filter, lalu group-by composite key (`nama_bahan+kode_bahan+satuan+tanggal`) di client untuk cari duplikat | Tidak | **Ya — di client** | Tidak |

### 2.5 `apps/admin/src/features/produksi-hpp/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchHppTemplates()` | 1, `select *` order `kode_produk` | Tidak | Tidak | Tidak |
| `fetchHppConfig()` | 1, `select *` dari `hpp_config`, direshape jadi map `{key: nilai}` di client | Tidak | Tidak | Tidak |
| `fetchHppConfigRows()` | 1, `select *` order `key` | Tidak | Tidak | Overlap dgn `fetchHppConfig()` (2 fungsi, 1 tabel kecil) |
| `fetchBahanOptions()` | 2 (paralel: `bahan_pembelian` + `bahan_pinjam`), merge + label di client | Tidak | Tidak | Tidak |

### 2.6 `apps/admin/src/features/produksi-laporan/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchProduksiBatches({fromDate,toDate})` | **3 sequential**: (1) `produksi_batch` by tanggal range → (2) `hpp_template` `.in(kodes)` kondisional untuk batch yg belum ada snapshot → (3) `products` `.in(kodes)` kondisional untuk hitung rata-rata `harga_jual` per produk. Semua di-merge + di-enrich (termasuk **average manual**) di client | Ya (manual join via Map di client) | **Ya — rata-rata (AVG) di client** | Tidak |
| `fetchTagihanJatuhTempo({fromDate,toDate})` | 2 (paralel: `bahan_pembelian` + `bahan_pinjam`, masing2 filtered+ordered), merge+sort di client | Tidak | Tidak | Tidak |
| `fetchProduksiBatchesTotal()` | **2 sequential**: (1) `produksi_batch` `.range(0,9999)` (bisa sampai 10.000 baris, hanya utk hitung all-time stats) → (2) `hpp_template` `.in(kodes)` kondisional. Di-merge di client, dipakai `useProduksiBatchesTotal()` utk StatCard | Ya (manual) | **Ya — di client** | Tidak |

### 2.7 `apps/admin/src/features/produksi-record/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchBatches()` | 1, `select *` order `kode_produk` | Tidak | Tidak | Tidak |
| `fetchHppTemplate(kodeProduk)` | 1, filtered `.single()` | Tidak | Tidak | **Dipanggil dalam loop** — lihat §3.1 |
| `resyncBahanDipakai(batch)` *(WRITE, embed 1 READ)* | 1 READ (`fetchHppTemplate`) → 1 UPDATE → 1 INSERT (`logHistory`) | Tidak | Tidak | — |

### 2.8 `apps/admin/src/features/produksi-sampel/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchSampels()` | 1, `select *` order `created_at` | Tidak | Tidak | Tidak |

### 2.9 `apps/admin/src/features/stok-opname/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchAllStokWarna()` | 1, `select *` **tanpa filter** — seluruh tabel `stok_warna` (dibutuhkan penuh karena form opname harus bisa edit semua baris) | Tidak | Tidak | Tidak |

### 2.10 `packages/shared/features/products/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchProducts()` | 1, `select *` order `position, created_at` — dipakai **semua 4 app** | Tidak | Tidak | Tidak |

### 2.11 `packages/shared/features/stok/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchStokByLocation(location)` | 1, filtered `.gt(location,0)` | Tidak | Tidak | Tidak |

### 2.12 `packages/shared/features/transfers/api.js`

| Fungsi | Query | Join? | Aggregate? | Duplicate? |
|---|---|---|---|---|
| `fetchPendingTransferCount()` | 1, `count:"exact", head:true` (sudah efisien — tidak narik baris) | Tidak | Ya (COUNT, sudah di DB) | Tidak |
| `fetchTransfers(statusFilter,dateFrom,dateTo)` | 1, filtered `select *` | Tidak | Tidak | Tidak |
| `approveTransfer(transfer,user)` *(WRITE-dominan, embed N READ)* | 1 UPDATE (status) → **loop per item: 1 SELECT + 1 UPDATE** (`stok_warna`) → 1 INSERT (`logHistory`) | Tidak | Tidak | — lihat §3.2, N+1 paling signifikan di seluruh audit |

### 2.13 `packages/shared/features/auth/api.js`

Tidak ada query READ ke tabel database (hanya `supabase.auth.getUser()`/`signIn`/`signOut` — di luar scope tabel Postgres).

---

## 3. Pola N+1 / Sequential / Duplikat Tambahan (di luar `api.js`)

### 3.1 `fetchHppTemplate` dipanggil dalam loop — `apps/admin/src/features/produksi-record/components/BatchForm.jsx`

Saat membuat batch dengan beberapa produk sekaligus ("1 gelaran = 2-3 produk"),
`BatchForm.jsx` menjalankan `productEntries.forEach((entry) => { ...
fetchHppTemplate(kode).then(...) })` — satu query per entry produk. Dibatasi
`entry.templateFetched === kode` supaya tidak refetch ulang, tapi saat mount
awal dengan N entry tetap N query paralel/berurutan. N biasanya kecil (2-3),
tapi ini pola N+1 yang genuine dan bisa diganti 1 query `.in("kode_produk", kodes)`
(pola yang sudah dipakai di `fetchProduksiBatches`) — tidak wajib RPC, cukup
query tunggal.

### 3.2 `approveTransfer` — N+1 read-then-write per item transfer

`packages/shared/features/transfers/api.js` baris ~140-178: untuk **setiap
item** dalam `transfer.items`, dijalankan 1 SELECT (`stok_warna` by
kode+size+warna) diikuti 1 UPDATE terpisah. Transfer dengan 5 item = 10 round
trip hanya untuk pemindahan stok, ditambah 1 UPDATE status + 1 INSERT audit
log = **12 round trip total**. Selain jumlah query, pola read-lalu-write ini
tidak atomik — antara SELECT dan UPDATE ada celah waktu di mana baris
`stok_warna` yang sama bisa berubah dari proses lain (mis. Stok Opname atau
approve transfer lain yang menyentuh kode+size+warna sama), menyebabkan
race condition (lost update).

### 3.3 Query langsung dari komponen (di luar `apps/admin`/`packages/shared`, tapi relevan)

Ditemukan saat pengecekan silang Dependency Inversion — **di luar scope
`apps/admin`/`packages/shared` yang diminta**, tapi dicatat karena relevan:

- `apps/pos/src/features/laporan/components/LaporanBep.jsx` — 3 query
  `supabase.from(...)` langsung di komponen (`lokasi_pasar_biaya`,
  `hpp_template`, `bahan_pembelian`), melompati `api.js`/`hooks.js`.
- `apps/pos/src/features/laporan/components/LaporanRingkasan.jsx` — 4 query
  langsung di komponen (`lokasi_pasar_biaya`, `sales`, `hpp_template`,
  `bahan_pembelian`).

Kedua komponen ini menjalankan beberapa query setiap kali tab laporan dibuka,
tanpa lapisan cache TanStack Query (karena tidak lewat `queries.js`). Ini murni
temuan tambahan — tidak termasuk prioritas A/B/C di bawah karena di luar scope
yang diminta (`apps/admin` + `packages/shared`).

---

## 4. Pengelompokan Priority

### Priority A — Layak RPC (banyak query / aggregate / join / sering dipanggil / signifikan mengurangi beban frontend)

| # | Fungsi | Lokasi | Alasan |
|---|---|---|---|
| 1 | `fetchSalesByKode` | `produk/api.js` | Menarik hingga 10.000 baris `sales` milik SEMUA produk untuk memfilter+SUM 1 produk di client. Dipanggil tiap `ProductDetailModal` dibuka. RPC (`jsonb_array_elements` + `WHERE`/`SUM` di Postgres) mengubah payload dari ribuan baris jadi beberapa angka. |
| 2 | `fetchStokMap` | `produk/api.js` | Full-table `stok_warna` ditarik ke client lalu di-`SUM` manual per kode & per kode+size. Dipanggil tiap `AdminPage` load. Kandidat klasik `GROUP BY`+`SUM` di DB. |
| 3 | `fetchProduksiBatches` | `produksi-laporan/api.js` | 3 query sequential + join manual (Map) + AVG manual di client. Dipanggil tiap filter tanggal berubah di halaman Laporan Produksi. |
| 4 | `fetchProduksiBatchesTotal` | `produksi-laporan/api.js` | 2 query sequential, salah satunya `.range(0,9999)` (bisa tarik s.d. 10.000 baris) hanya untuk StatCard all-time. Bisa jadi RPC `SUM`/`COUNT` langsung. |
| 5 | `approveTransfer` | `transfers/api.js` | N+1 read-then-write per item transfer + race condition non-atomik. RPC/PL-pgSQL bisa memindah stok dalam 1 transaksi atomik server-side. |

### Priority B — Layak RPC tapi tidak mendesak

| # | Fungsi | Lokasi | Alasan |
|---|---|---|---|
| 6 | `fetchBukuPotonganData` | `buku-potongan/api.js` | 2 query paralel + merge client, tidak ada aggregate berat, tabelnya sedang. |
| 7 | `detectDupes` | `produksi-bahan/api.js` | Full-table pull + group-by-key di client, tapi ini layar utility admin yang jarang dibuka. |
| 8 | `fetchBahanOptions` | `produksi-hpp/api.js` | 2 query paralel + merge/label, tabel kecil. |
| 9 | `fetchTagihanJatuhTempo` | `produksi-laporan/api.js` | 2 query paralel + merge/sort, tabel kecil, tidak aggregate berat. |
| 10 | `fetchHppTemplate` (loop di `BatchForm.jsx`) | `produksi-record/api.js` (call-site) | N+1 tapi N kecil (2-3). Bisa diselesaikan dengan 1 query `.in()` — RPC opsional, tidak wajib. |
| 11 | `fetchStokWarnaByKode` | `produk/api.js` | Single-call per buka form, reshape sederhana — hanya masuk B karena mirip pola `fetchStokMap` yang sudah jadi RPC (bisa reuse), bukan karena mendesak sendiri. |

### Priority C — Tetap Supabase query biasa

`fetchHistory`, `fetchBahanItems`, `fetchStokBahan` (sudah view di DB),
`fetchHppTemplates`, `fetchHppConfig`, `fetchHppConfigRows`, `fetchBatches`,
`fetchSampels`, `fetchAllStokWarna`, `fetchProducts`, `fetchStokByLocation`,
`fetchPendingTransferCount`, `fetchTransfers` — seluruhnya single-query
filtered/ordered select tanpa aggregate/join berarti, atau (untuk
`fetchStokBahan`) aggregate-nya sudah dipindah ke database VIEW sejak awal.
Memindah ini ke RPC hanya menambah lapisan tanpa manfaat performa/kejelasan.

---

## 5. Estimasi Pengurangan Query

| Fungsi | Round-trip saat ini | Round-trip via RPC | Catatan payload |
|---|---|---|---|
| `fetchSalesByKode` | 1 (tapi s.d. 10.000 baris) | 1 | Round-trip sama, **payload turun drastis** (ribuan baris → segelintir angka) + komputasi pindah ke DB |
| `fetchStokMap` | 1 (full-table) | 1 | Round-trip sama, **payload turun** (semua baris stok_warna → 1 baris per kode) |
| `fetchProduksiBatches` | 3 sequential | 1 | **66% reduksi round-trip** |
| `fetchProduksiBatchesTotal` | 2 sequential (1 s.d. 10.000 baris) | 1 | **50% reduksi round-trip** + payload turun jauh |
| `approveTransfer` | 3 + 2×K (K = jumlah item transfer) | 1 | Untuk K=5: **13 → 1 (~92% reduksi)**, plus menghilangkan race condition |

Untuk `fetchSalesByKode` dan `fetchStokMap`, manfaat RPC bukan pada jumlah
round-trip (sudah 1) melainkan pada **ukuran payload** dan **pemindahan
komputasi dari JS ke Postgres** — keduanya tetap layak Priority A karena
volume data yang ditarik akan terus bertambah seiring transaksi/produk
bertambah, sementara pendekatan client-side saat ini tidak scalable.

---

## 6. Rekomendasi Urutan Implementasi Phase 1

1. **`approveTransfer` → RPC** — dampak tertinggi per unit effort: menghilangkan
   race condition + memangkas hingga 90%+ round-trip untuk transfer multi-item.
   Juga risiko keamanan data (stok bisa "hilang" akibat lost update), jadi
   prioritas paling tinggi bukan cuma soal performa.
2. **`fetchSalesByKode` → RPC** — payload paling boros di seluruh codebase
   (s.d. 10.000 baris demi 1 produk), langsung terasa di UX buka
   `ProductDetailModal`.
3. **`fetchStokMap` → RPC** — dipanggil di setiap load `AdminPage`
   (halaman yang paling sering dibuka), full-table pull yang akan makin berat
   seiring jumlah kode+size+warna bertambah.
4. **`fetchProduksiBatchesTotal` → RPC** — StatCard all-time, `.range(0,9999)`
   berpotensi jadi bottleneck saat data produksi menumpuk.
5. **`fetchProduksiBatches` → RPC** — laporan dengan filter tanggal, 3 query
   + join manual, dipakai reguler tapi tidak sesering AdminPage/ProductDetail.
6. **Priority B (opsional, batch terpisah)** — mulai dari perbaikan
   `fetchHppTemplate` loop di `BatchForm.jsx` (cukup ganti ke 1 query `.in()`,
   TIDAK perlu RPC) karena effort-nya paling kecil, baru pertimbangkan RPC
   untuk `fetchBukuPotonganData`/`detectDupes`/`fetchBahanOptions`/
   `fetchTagihanJatuhTempo` jika nanti terbukti jadi bottleneck nyata.

---

## Catatan Penutup

Audit ini murni analisis — **tidak ada RPC, migration, perubahan frontend,
hook, business logic, atau database yang dibuat**. Temuan di §3.3 (query
langsung dari komponen di `apps/pos`) berada di luar scope yang diminta
(`apps/admin` + `packages/shared`) sehingga tidak masuk Priority A/B/C, hanya
dicatat sebagai referensi jika audit serupa ingin dilakukan untuk `apps/pos`
di kemudian hari.
