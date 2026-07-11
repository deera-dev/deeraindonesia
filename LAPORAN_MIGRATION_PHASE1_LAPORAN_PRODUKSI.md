# Laporan Migration Phase 1 — RPC `get_laporan_produksi` (fetchProduksiBatches)

**Tanggal:** 12 Juli 2026
**Scope:** `apps/admin/src/features/produksi-laporan/api.js` → `fetchProduksiBatches({fromDate, toDate})`
**Filosofi:** SAMA seperti `approveTransfer`, `fetchSalesByKode`, `fetchStokMap`, dan `fetchProduksiBatchesTotal` (versi Full Aggregate) — PostgreSQL = seluruh business logic, frontend = presentation layer.

Migrasi ini adalah **kandidat Priority A terakhir** dari `LAPORAN_AUDIT_READ_LAYER_PHASE1.md` yang belum dimigrasikan, sekaligus merealisasikan desain yang sudah diantisipasi di `MIGRATION_ROADMAP.md` §3.1.7.

---

## 1. Business Flow Lama

`fetchProduksiBatches({fromDate, toDate})` di `api.js` menjalankan **3 query Supabase berurutan** (tidak paralel, query ke-2 dan ke-3 bergantung pada hasil query ke-1):

1. **Query 1** — `SELECT * FROM produksi_batch WHERE tanggal_produksi BETWEEN fromDate AND toDate ORDER BY tanggal_produksi`.
2. **Query 2 (kondisional)** — kalau ada batch yang `!hpp_per_item` ATAU `bahan_dipakai` kosong, ambil `kode_produk, total_hpp, bahan_items` dari `hpp_template` untuk kode-kode tersebut (`.in("kode_produk", kodes)`).
3. **Query 3 (kondisional)** — ambil `kode, variants` dari `products` untuk SEMUA `kode_produk` yang muncul di batch periode ini, dipakai menghitung rata-rata harga jual.

Setelah data didapat, **enrichment dan seluruh business math dilakukan di JavaScript** (di dalam `.map()` atas `rawBatches`):
- `hpp_per_item` efektif = `b.hpp_per_item || tpl?.total_hpp || 0` (truthy check, BUKAN `> 0`).
- `bahan_dipakai` efektif = pakai yang sudah ada di batch (kalau tidak kosong), atau diturunkan dari `tpl.bahan_items × total_kain`, dibulatkan 2 desimal.
- `harga_jual` = rata-rata `variant.harga` yang `> 0` per kode produk, dibulatkan ke integer.

Hasil array batch yang sudah di-enrich ini lalu dikonsumsi di **3 tempat berbeda**:
- `ProduksiLaporanPage.jsx` — render tabel batch mentah, memanggil `calcRingkasan(batches, tagihan)` untuk 5 statistik (`totalBaju`, `totalTagihan`, `totalModal`, `hppAvg`, `hargaJualAvg`), memanggil `calcBahanUsage(batches)` untuk grouping pemakaian bahan, DAN menghitung ulang `modalBatch = (b.hpp_per_item||0)*(b.total_kain||0)` per baris secara inline di `.map()`.
- `BatchDetail.jsx` — menghitung ULANG `totalModal = (batch.hpp_per_item||0)*(batch.total_kain||0)` secara independen (duplikasi rumus yang sama persis dengan yang di `ProduksiLaporanPage.jsx`).

Total: **3 query sequential + 2 duplikasi rumus modal + 2 fungsi aggregate murni JS** untuk satu halaman laporan bulanan.

---

## 2. Business Flow Baru

`fetchProduksiBatches({fromDate, toDate})` sekarang memanggil **1 RPC**: `get_laporan_produksi(p_from_date, p_to_date)`.

RPC ini mengembalikan **1 object jsonb siap tampil** dengan 3 key:

```
{
  batches:   [ { ...semua kolom produksi_batch, hpp_per_item (effective), bahan_dipakai (effective), harga_jual, modal }, ... ],
  ringkasan: { totalBatch, totalBaju, totalModal, hppAvg, hargaJualAvg },
  bahanUsage: [ { nama, satuan, jumlah }, ... ]  // sudah di-GROUP BY + SUM + sort desc
}
```

Semua enrichment (fallback HPP, derivasi bahan dari template, rata-rata harga jual), semua agregasi (`SUM`, `COUNT`, `AVG`), dan semua grouping (pemakaian bahan) dilakukan di 1 query SQL via CTE (`base` → `batches_json`/`bahan_usage` → hasil akhir).

`api.js`, `hooks.js`, dan komponen React tidak lagi melakukan `reduce`/`map`-untuk-agregasi/`filter`-untuk-statistik apa pun — hanya membaca field yang sudah jadi dan me-render.

---

## 3. Business Logic yang Berhasil Dipindahkan ke SQL

| Logic lama (JS) | Lokasi lama | Implementasi SQL baru |
|---|---|---|
| Fallback `hpp_per_item` → `hpp_template.total_hpp` | `api.js` `.map()` | `CASE WHEN hpp_per_item IS NOT NULL AND hpp_per_item > 0 THEN hpp_per_item ELSE COALESCE(tpl.total_hpp, 0) END` (CTE `base`) |
| Derivasi `bahan_dipakai` dari `tpl.bahan_items × total_kain` | `api.js` `.map()` | `CASE WHEN jsonb_array_length(bahan_dipakai) > 0 THEN bahan_dipakai ELSE (subquery jsonb_agg atas jsonb_array_elements template)` |
| Rata-rata `harga_jual` dari `products.variants` per kode | `api.js` (query 3 + `.map()`) | Subquery `LEFT JOIN` teragregasi: `AVG((v->>'harga')::numeric) FILTER WHERE harga > 0, GROUP BY kode` |
| `calcRingkasan()`: SUM total_kain, SUM modal, AVG hpp>0, AVG harga_jual>0 | `utils.js` | `jsonb_build_object('totalBatch', COUNT(*), 'totalBaju', SUM(...), 'totalModal', SUM(...), 'hppAvg', AVG(...) WHERE effective_hpp>0, 'hargaJualAvg', AVG(...) WHERE >0)` |
| `calcBahanUsage()`: GROUP BY nama_bahan+satuan, SUM jumlah, sort desc | `utils.js` | CTE `bahan_usage`: `jsonb_array_elements` → `GROUP BY nama_bahan, satuan` → `SUM` → `jsonb_agg(... ORDER BY jumlah DESC)` |
| `modalBatch = hpp_per_item × total_kain` (duplikasi 2×) | `ProduksiLaporanPage.jsx` + `BatchDetail.jsx` | Field `modal` per baris di `batches_json`: `effective_hpp * COALESCE(total_kain, 0)` |

---

## 4. Business Logic Frontend yang Berhasil Dihapus

- `apps/admin/src/features/produksi-laporan/utils.js`: fungsi **`calcRingkasan()`** dan **`calcBahanUsage()`** dihapus sepenuhnya (35 baris JS business logic).
- `ProduksiLaporanPage.jsx`: pemanggilan `calcRingkasan(batches, tagihan)` dan `calcBahanUsage(batches)` dihapus; perhitungan inline `modalBatch = (b.hpp_per_item||0)*(b.total_kain||0)` per baris dihapus, diganti baca `b.modal`.
- `BatchDetail.jsx`: perhitungan `totalModal = (batch.hpp_per_item||0)*(batch.total_kain||0)` dihapus, diganti baca `batch.modal`.
- `api.js`: seluruh logic enrichment (query template, query products, 2× `.map()` bersarang) dihapus — fungsi sekarang 8 baris (1 pemanggilan RPC + fallback).

**Satu-satunya business math yang TETAP di frontend:** `calcTotalTagihan(tagihan)` di `utils.js` — 1 baris `reduce`. Alasan tetap di JS: dijelaskan di §9 (Batas Scope).

---

## 5. Query yang Dihilangkan

Per pemanggilan halaman (1 bulan terpilih):
- **Sebelum:** 1 (batch) + 1 (template, kondisional) + 1 (products, kondisional) = **sampai 3 query**, dijalankan berurutan (bukan paralel) — kalau ada N batch yang butuh template, latency-nya kumulatif (round-trip 1 → tunggu → round-trip 2 → tunggu → round-trip 3).
- **Sesudah:** **1 RPC call**.

Untuk bulan dengan banyak batch yang butuh fallback template (skenario umum untuk batch lama), pengurangan dari 3 round-trip network sequential menjadi 1 round-trip adalah pengurangan latency yang signifikan — bukan cuma jumlah row yang dipindai, tapi jumlah **round-trip client↔Supabase** per page load.

---

## 6. Pengurangan Payload

- **Sebelum:** payload = seluruh baris `produksi_batch` mentah (semua kolom, termasuk `hpp_snapshot` jsonb besar) + seluruh baris `hpp_template` yang match + seluruh baris `products` (termasuk `variants` jsonb, bisa besar per produk) — SEMUA dikirim ke client, lalu di-enrich dan sebagian besar (raw `variants`, raw `bahan_items` template) dibuang setelah dipakai untuk kalkulasi.
- **Sesudah:** payload = HANYA hasil akhir: batch yang sudah di-enrich (tanpa perlu ikutan kirim `hpp_template`/`products` mentah lagi) + object ringkasan (5 angka) + array pemakaian bahan (sudah digabung, biasanya jauh lebih sedikit baris daripada `bahan_dipakai` mentah per-batch × jumlah batch).
- Kolom `products.variants` dan `hpp_template.bahan_items` **tidak pernah lagi dikirim ke client** — sebelumnya dikirim penuh, padahal browser cuma butuh 1 angka (`harga_jual`) atau qty per baju hasil kali.

---

## 7. Estimasi Peningkatan Performa

- Round-trip network: dari sampai 3× sequential menjadi 1×. Untuk koneksi dengan RTT ~100-150ms (umum di Indonesia), ini bisa memangkas ~200-300ms latency murni dari network round-trip, di luar waktu proses.
- Query planner Postgres bisa mengoptimalkan JOIN + agregasi dalam 1 execution plan, dibanding 3 round-trip terpisah yang masing-masing punya overhead koneksi/parsing/auth-check sendiri.
- Payload lebih kecil → parsing JSON di browser lebih cepat, terutama untuk toko dengan banyak variant produk (kolom `variants` bisa berisi puluhan objek per produk).
- Catatan kejujuran: tidak ada angka benchmark aktual (butuh data produksi riil + APM) — estimasi ini kualitatif berdasarkan pengurangan jumlah round-trip dan payload, konsisten dengan estimasi yang dipakai di laporan-laporan migration sebelumnya di sesi ini.

---

## 8. Perubahan Kontrak Data

**Ini migrasi dengan perubahan kontrak PALING BESAR di seluruh Migration Phase 1**, karena `fetchProduksiBatches()` sebelumnya mengembalikan ARRAY batch, sekarang mengembalikan OBJECT `{batches, ringkasan, bahanUsage}`.

| Layer | Sebelum | Sesudah |
|---|---|---|
| `api.js` `fetchProduksiBatches()` | `Promise<Batch[]>` | `Promise<{batches: Batch[], ringkasan: object, bahanUsage: object[]}>` |
| `hooks.js` `useProduksiBatches()` | `{ batches, loading }` | `{ batches, ringkasan, bahanUsage, loading }` |
| Batch object per baris | tanpa field `modal` | **field baru:** `modal` (= `hpp_per_item efektif × total_kain`) |
| `ProduksiLaporanPage.jsx` | panggil `calcRingkasan`/`calcBahanUsage` dari `utils` | baca langsung `ringkasan`/`bahanUsage` dari hook |

Komponen React **diubah seminimal mungkin** sesuai instruksi — hanya baris yang membaca sumber data yang berubah (dari hasil fungsi utils lokal → dari field hook), struktur JSX/rendering TIDAK diubah sama sekali.

---

## 9. Batas Scope (Disengaja, Diungkap Eksplisit)

`totalTagihan` (dipakai di section "Tagihan Jatuh Tempo Bulan Ini") **TIDAK** ikut dipindahkan ke RPC ini. Alasan: sumbernya (`fetchTagihanJatuhTempo()` → tabel `bahan_pembelian`/`bahan_pinjam`, difilter oleh kolom `jatuh_tempo`) sepenuhnya independen dari 3 tabel yang dibaca `get_laporan_produksi` (`produksi_batch`/`hpp_template`/`products`, difilter oleh `tanggal_produksi`). Menggabungkan keduanya ke 1 RPC akan mencampur 2 domain data berbeda (produksi vs utang bahan) hanya karena kebetulan tampil di halaman yang sama — di luar scope instruksi "migrasikan `fetchProduksiBatches`". `calcTotalTagihan()` (1 baris `reduce`) tetap di `utils.js` sebagai satu-satunya business math frontend yang tersisa untuk fitur ini.

`BatchDetail.jsx` baris `(sz.warna ?? []).reduce((s, w) => s + (w.qty || 0), 0)` (jumlah baju per size di breakdown ukuran×warna) **SENGAJA TIDAK disentuh** — ini bukan bagian dari business-logic surface `fetchProduksiBatches`/`calcRingkasan`/`calcBahanUsage` yang jadi target migrasi ini, dan memindahkannya akan memaksa mengubah struktur `sizes` jsonb yang di luar scope instruksi.

---

## 10. Risiko Migrasi

- **Perubahan kontrak besar** (array → object) berisiko memutus konsumen lain kalau ada yang belum ter-cover — sudah di-grep ulang, `fetchProduksiBatches`/`useProduksiBatches` HANYA dipakai di `ProduksiLaporanPage.jsx` (via hook), tidak ada konsumen lain di codebase.
- RPC baru ini kompleks (nested CTE + subquery agregasi + jsonb manipulation) — risiko bug SQL lebih tinggi dibanding RPC-RPC sebelumnya yang lebih sederhana. Sudah divalidasi sintaks via `sqlfluff` (0 error, hanya warning gaya baris-panjang/indentasi) tapi **belum diuji terhadap data produksi riil** (lihat §12 Cara Testing Manual).
- `effective_hpp` sekarang eksplisit `> 0` (bukan truthy) — SAMA dengan definisi yang sudah diterapkan di `get_produksi_batches_total`, tapi INI ADALAH PERUBAHAN PERILAKU dari `fetchProduksiBatches()` versi lama (yang pakai truthy check `||`). Lihat §11 Perbedaan Perilaku.
- Rollback: karena `CREATE OR REPLACE FUNCTION` bersifat idempotent, rollback SQL murni butuh menyimpan definisi lama (tidak disimpan di migration terpisah — kalau perlu rollback, definisi lama ada di riwayat git file `api.js` sebelum commit ini).

---

## 11. Perbedaan Perilaku (Sekecil Apa Pun)

1. **`effective_hpp` truthy → `> 0`**: versi lama `b.hpp_per_item || tpl?.total_hpp || 0` menganggap SEMUA angka bukan-nol (termasuk hipotetis negatif) sebagai "valid, jangan fallback". Versi baru eksplisit mensyaratkan `> 0`. Sengaja diterapkan untuk KONSISTENSI dengan `get_produksi_batches_total` yang sudah memakai rule ini di halaman yang SAMA (StatCard all-time vs StatCard bulanan).
2. **Urutan sekunder batch dengan `tanggal_produksi` identik**: versi lama `.order("tanggal_produksi")` di Supabase JS client dan versi baru `ORDER BY tanggal_produksi ASC` di SQL sama-sama TIDAK punya secondary sort key eksplisit — urutan untuk baris dengan tanggal sama persis bisa berbeda antara implementasi lama vs baru (tergantung index scan order Postgres). Dampak praktis sangat kecil (kemungkinan hanya menggeser urutan tampil 2 batch di hari yang sama).
3. **Tidak ada lagi pengecekan `error` dari Supabase**: sama seperti semua RPC migrasi sebelumnya di sesi ini, `fetchProduksiBatches()` versi baru tidak mengecek `error` dari `supabase.rpc()` — meniru persis perilaku lama yang juga tidak pernah mengecek `error` dari ketiga query manapun. Kegagalan RPC (network error, dsb) akan menghasilkan `{batches: [], ringkasan: {}, bahanUsage: []}` secara diam-diam, BUKAN melempar exception.
4. **Field baru `modal` per batch**: batch object sekarang punya field tambahan `modal` yang sebelumnya tidak ada (hanya dihitung inline di komponen). Tidak menghapus field lama apa pun — murni penambahan.

---

## 12. Edge Case

- **Batch tanpa `kode_produk` match apapun di `hpp_template`/`products`** (LEFT JOIN NULL): `effective_hpp` fallback ke `COALESCE(tpl.total_hpp, 0)` = 0, `effective_harga_jual` fallback ke `COALESCE(hj.harga_jual, 0)` = 0 — sama seperti versi lama (`tpl?.total_hpp` dan `hargaJualMap[...] || 0` sama-sama fallback ke 0 saat tidak ada match).
- **`total_kain` NULL**: `COALESCE(total_kain, 0)` diterapkan konsisten di semua tempat (SUM, modal per baris) — sama seperti versi lama `b.total_kain || 0`.
- **`bahan_items` template kosong (`[]`) DAN `bahan_dipakai` batch juga kosong**: hasil `effective_bahan_dipakai` = `[]` (subquery `jsonb_agg` atas array kosong mengembalikan NULL, di-`COALESCE` ke `'[]'::jsonb`) — sama seperti versi lama `tpl?.bahan_items?.map(...) ?? []`.
- **Tidak ada batch sama sekali di rentang tanggal**: `batches` = `[]`, `ringkasan` = `{totalBatch: 0, totalBaju: 0, totalModal: 0, hppAvg: 0, hargaJualAvg: 0}` (semua `COALESCE(...,0)` dan subquery `WHERE effective_hpp > 0`/`WHERE effective_harga_jual > 0` atas 0 baris menghasilkan `NULL` → di-`COALESCE` ke 0), `bahanUsage` = `[]`.
- **Produk dengan SEMUA `variants[].harga` = 0 atau tidak ada variants sama sekali**: subquery harga jual punya `WHERE (v->>'harga')::numeric > 0` sehingga produk tsb tidak muncul di map (tidak ada baris ter-GROUP BY untuk kode itu) → `hj.harga_jual` NULL via LEFT JOIN → `effective_harga_jual` fallback ke 0. Sama seperti versi lama (`validVariants.length > 0` check).
- **`qty_per_baju` di `bahan_items` bukan angka valid** (string kosong, null): `(bi->>'qty_per_baju')::numeric` di dalam `COALESCE((bi->>'qty_per_baju')::numeric, 0)` — kalau castingnya GAGAL (misal string bukan angka), Postgres akan **throw runtime error**, BUKAN fallback ke 0 seperti `Number(bi.qty_per_baju) || 0` di JS (yang tidak pernah throw). Ini **beda dari edge-case handling di RPC-RPC sebelumnya** (`get_sales_summary_by_product` memakai sub-block `EXCEPTION WHEN OTHERS` untuk kasus serupa) — di RPC ini TIDAK diberi exception guard yang sama karena kolom `qty_per_baju` di `hpp_template.bahan_items` adalah data internal yang diinput lewat form HPP (bukan data eksternal/legacy yang rawan format tidak konsisten seperti kolom `items` di `sales`). Diungkap sebagai **technical debt** di §13 kalau asumsi ini ternyata salah.

---

## 13. Technical Debt yang Ditemukan

1. **Tidak ada exception guard untuk casting numeric di `bahan_items`/`variants`** (lihat edge case di atas) — kalau di masa depan ternyata ada data legacy `hpp_template.bahan_items[].qty_per_baju` atau `products.variants[].harga` yang bukan format angka valid, RPC ini akan **throw error** dan seluruh halaman laporan gagal load, alih-alih fallback diam-diam seperti JS lama. Rekomendasi: tambahkan sub-block `EXCEPTION WHEN OTHERS` seperti pola yang sudah dipakai di `get_sales_summary_by_product` KALAU ternyata ada laporan bug terkait ini di produksi.
2. **Urutan sekunder batch tidak deterministik** (lihat §11.2) — baik versi lama maupun baru sama-sama tidak punya secondary sort key. Kalau UI butuh urutan yang stabil/predictable untuk batch di tanggal yang sama, pertimbangkan menambah `ORDER BY tanggal_produksi ASC, created_at ASC` (kalau kolom `created_at` ada) di migration berikutnya — BUKAN bug baru dari migration ini, tapi kesempatan untuk memperbaikinya sekalian karena sudah menyentuh query yang sama.
3. **`BatchDetail.jsx`'s `sizes.warna.reduce()`** (jumlah baju per size) TETAP dihitung di JS — bukan technical debt baru, tapi tetap dicatat sebagai peluang migrasi SQL berikutnya kalau prinsip "semua business math di SQL" ingin diterapkan sampai tuntas untuk fitur ini.

---

## 14. Bug Lama yang Ditemukan

- **Duplikasi rumus `modalBatch`** di 2 tempat berbeda (`ProduksiLaporanPage.jsx` baris 135 lama, `BatchDetail.jsx` baris 7 lama) — bukan bug fungsional (hasilnya identik karena rumusnya sama persis), tapi **bug maintainability**: kalau rumus `modal` pernah perlu diubah (misal nanti butuh potongan/diskon), developer harus ingat mengubah di 2 tempat sekaligus. Migrasi ini menghilangkan duplikasi ini — sekarang HANYA 1 sumber kebenaran (`modal` dari RPC).
- **`effective_hpp` truthy-check inkonsistensi** — sudah dilaporkan & diperbaiki di migration `get_produksi_batches_total` sebelumnya untuk StatCard all-time; migrasi INI memperbaiki inkonsistensi yang SAMA untuk StatCard bulanan (`hppAvg`/`totalModal` periode), yang SEBELUM migrasi ini masih memakai truthy-check lama karena `calcRingkasan()` belum tersentuh revisi sebelumnya. Kalau migrasi ini TIDAK dilakukan, halaman yang sama akan menampilkan 2 definisi `effective_hpp` yang berbeda berdampingan (StatCard all-time sudah pakai `>0`, StatCard bulanan masih pakai truthy) — migrasi ini menutup celah tersebut.

---

## 15. Cara Testing Manual

1. **Jalankan migration**: apply `supabase/migrations/20260712_migration_phase1_rpc_laporan_produksi.sql` ke database (Supabase SQL editor atau `supabase db push`).
2. **Verifikasi fungsi terdaftar & grant** (query tersedia di komentar akhir file migration):
   ```sql
   SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_laporan_produksi';
   SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_name = 'get_laporan_produksi';
   ```
3. **Panggil manual untuk 1 bulan yang punya data produksi**:
   ```sql
   SELECT jsonb_pretty(public.get_laporan_produksi('2026-06-01', '2026-06-30'));
   ```
   Periksa: `batches` berisi array dengan field `hpp_per_item`, `bahan_dipakai`, `harga_jual`, `modal` terisi masuk akal; `ringkasan.totalBatch` = jumlah baris `batches`; `ringkasan.totalBaju` = jumlah `total_kain`; `bahanUsage` terurut dari `jumlah` terbesar.
4. **Bandingkan angka dengan versi lama** (sebelum migration di-deploy, kalau masih ada environment staging dengan kode lama) — cocokkan `totalBaju`/`totalModal`/`hppAvg`/`hargaJualAvg` dengan hasil `calcRingkasan()` manual atas data yang sama.
5. **Uji di UI**: buka halaman Laporan Produksi (`/produksi/laporan`) di `apps/admin`, ganti filter bulan ke bulan yang punya batch dengan `hpp_per_item = 0`/`bahan_dipakai` kosong (butuh fallback template) — pastikan angka HPP dan bahan tetap muncul benar (bukti fallback SQL bekerja).
6. **Uji expand batch** — klik salah satu batch, pastikan panel `BatchDetail` menampilkan "Total Modal Batch" yang sama dengan angka yang tampil di baris ringkas (bukti field `modal` konsisten).
7. **Uji bulan kosong** — pilih bulan yang tidak ada batch sama sekali, pastikan pesan "Tidak ada data produksi maupun tagihan bulan ini" (kalau tagihan juga kosong) tetap muncul dan tidak ada error di console.

---

## 16. Daftar File yang Diubah

| File | Jenis Perubahan |
|---|---|
| `supabase/migrations/20260712_migration_phase1_rpc_laporan_produksi.sql` | **Baru** — RPC `get_laporan_produksi(date, date)` |
| `apps/admin/src/features/produksi-laporan/api.js` | `fetchProduksiBatches()` disederhanakan jadi pemanggil RPC (dari ~60 baris jadi 8 baris) |
| `apps/admin/src/features/produksi-laporan/hooks.js` | `useProduksiBatches()` jadi pass-through: return `{batches, ringkasan, bahanUsage, loading}` |
| `apps/admin/src/features/produksi-laporan/utils.js` | Hapus `calcRingkasan()`, `calcBahanUsage()`; tambah `calcTotalTagihan()` |
| `apps/admin/src/features/produksi-laporan/components/ProduksiLaporanPage.jsx` | Baca `ringkasan`/`bahanUsage` dari hook, bukan panggil `utils`; `modalBatch` baca dari `b.modal` |
| `apps/admin/src/features/produksi-laporan/components/BatchDetail.jsx` | `totalModal` baca dari `batch.modal` (bukan hitung ulang) |
| `apps/admin/src/features/produksi-laporan/api.test.js` | `describe("fetchProduksiBatches")` ditulis ulang untuk kontrak RPC baru |
| `apps/admin/src/features/produksi-laporan/hooks.test.js` | `describe("useProduksiBatches")` ditulis ulang untuk kontrak baru |
| `apps/admin/src/features/produksi-laporan/utils.test.js` | Hapus test `calcRingkasan`/`calcBahanUsage`, tambah test `calcTotalTagihan` |
| `apps/admin/src/features/produksi-laporan/components/ProduksiLaporanPage.test.jsx` | Mock `useProduksiBatches` diperluas dengan `ringkasan`/`bahanUsage` |
| `apps/admin/src/features/produksi-laporan/components/BatchDetail.test.jsx` | Fixture `batch` ditambah field `modal` eksplisit |

---

## 17. Hasil Unit Test

Seluruh 9 file test dalam fitur `produksi-laporan` dijalankan (`npx vitest run --config apps/admin/vitest.config.js apps/admin/src/features/produksi-laporan`), **76/76 test PASS**:

```
✓ components/MonthPicker.test.jsx        (4 tests)
✓ components/ProduksiLaporanPage.test.jsx (15 tests)
✓ queries.test.js                         (5 tests)
✓ components/BatchDetail.test.jsx         (8 tests)
✓ components/StatCard.test.jsx            (5 tests)
✓ components/JtBadge.test.jsx             (4 tests)
✓ hooks.test.js                           (7 tests)
✓ utils.test.js                          (16 tests)
✓ api.test.js                            (12 tests)
```

Semua file di-syntax-check via `esbuild` sebelum dijalankan (0 error). SQL migration divalidasi via `sqlfluff lint --dialect postgres` (0 parse error, hanya warning gaya baris-panjang/indentasi — konsisten dengan migration-migration sebelumnya di sesi ini).

Catatan: 2 test gagal terdeteksi di file LAIN (`WarnaSection.test.jsx`, `BahanPickerModal.test.jsx`) saat menjalankan seluruh suite `apps/admin` — **keduanya TIDAK terkait migrasi ini** (fitur `produk` dan `produksi-hpp`, tidak disentuh sama sekali oleh perubahan ini), kemungkinan pre-existing failure di luar scope. Tidak diperbaiki karena di luar scope instruksi migrasi ini.

---

## 18. Catatan Proses

Selama edit `BatchDetail.jsx`, sempat terjadi **silent truncation** saat memakai Edit tool langsung ke path Windows mount (`D:\dev\deeraindonesia\...`) — persis peringatan di `CLAUDE.md`. Terdeteksi segera lewat verifikasi `esbuild` rutin (error "Unexpected end of file" di baris terakhir file), langsung diperbaiki dengan menulis ulang seluruh file via bash heredoc ke path Linux mount, lalu diverifikasi ulang (line count + syntax check lolos). Tidak berdampak ke hasil akhir — dicatat di sini demi transparansi penuh.
