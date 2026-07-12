# Laporan — Revisi Arsitektur: RPC `get_produksi_batches_total` (Full Aggregate)

Ini adalah **revisi** atas implementasi RPC `get_produksi_batches_total`
yang sudah dibuat sebelumnya (bukan implementasi baru dari nol). Migration
SQL yang sama diedit langsung (belum pernah di-apply ke database live),
`api.js` dan `hooks.js` disesuaikan, seluruh test terdampak ditulis ulang.

---

## 1. Business Flow Lama (revisi pertama RPC — array batch)

```
fetchProduksiBatchesTotal()          [api.js]
└─ supabase.rpc("get_produksi_batches_total") → ARRAY [{total_kain, hpp_per_item, kode_produk, hpp_total}, ...]

useProduksiBatchesTotal()            [hooks.js]
├─ batches = data ?? []
├─ totalBaju = batches.reduce((s,b) => s + (b.total_kain ?? 0), 0)      ← business logic di JS
├─ totalModal = batches.reduce((s,b) => s + (b.hpp_per_item||0)*(b.total_kain||0), 0)  ← BUG: pakai hpp_per_item mentah, bukan hpp_total
└─ totalBatch = batches.length                                          ← business logic di JS
```

RPC sudah memindahkan JOIN ke database, tapi SUM/COUNT/perkalian masih
di JavaScript — dan `hpp_total` (hasil fallback ke Template HPP) yang
susah payah dihitung RPC tidak pernah dipakai karena hook membaca
`hpp_per_item` mentah.

## 2. Business Flow Baru (revisi ini — full aggregate)

```
get_produksi_batches_total()          [Postgres, SATU query]
├─ FROM produksi_batch LEFT JOIN hpp_template ON kode_produk
├─ effective_hpp = CASE WHEN hpp_per_item IS NOT NULL AND hpp_per_item > 0
│                       THEN hpp_per_item ELSE COALESCE(template.total_hpp, 0) END
└─ RETURN jsonb_build_object(
     'totalBatch', COUNT(*),
     'totalBaju', COALESCE(SUM(COALESCE(total_kain,0)), 0),
     'totalModal', COALESCE(SUM(effective_hpp * COALESCE(total_kain,0)), 0)
   )
   → { totalBatch: number, totalBaju: number, totalModal: number }

fetchProduksiBatchesTotal()          [api.js]
└─ supabase.rpc("get_produksi_batches_total")
   return data ?? { totalBatch: 0, totalBaju: 0, totalModal: 0 }
   → HANYA meneruskan, TIDAK ADA reduce/map/business logic

useProduksiBatchesTotal()            [hooks.js]
├─ const { data, isLoading } = useProduksiBatchesTotalQuery()
└─ return {
     totalBatch: data?.totalBatch ?? 0,
     totalBaju: data?.totalBaju ?? 0,
     totalModal: data?.totalModal ?? 0,
     loading: isLoading,
   }
   → PASS-THROUGH MURNI, tidak ada reduce/count/business logic
```

Seluruh business logic (JOIN, fallback HPP, SUM, COUNT, perkalian) kini
berada 100% di satu fungsi PostgreSQL. Frontend murni menerima &
meneruskan 3 angka jadi.

---

## 3. Query yang Dihilangkan

Sama seperti revisi pertama (2 query JS lama → 1 RPC), TIDAK ada
perubahan tambahan pada sisi ini — perubahan di revisi ini murni pada
**bentuk hasil** RPC (array → object) dan **lokasi komputasi** (JS → SQL),
bukan pada jumlah query.

---

## 4. Apa yang Berubah Dibanding Implementasi RPC Sebelumnya

| Aspek | Revisi pertama | Revisi ini |
|---|---|---|
| Return type RPC | `jsonb` **array** (1 objek per batch) | `jsonb` **object tunggal** `{totalBatch,totalBaju,totalModal}` |
| SUM/COUNT/perkalian | Di JS (`hooks.js`, via `.reduce()`) | Di SQL (`SUM`, `COUNT`, `CASE` dalam RPC) |
| Fallback HPP (effective_hpp) | Dihitung di RPC (`hpp_total`) TAPI **tidak dipakai** hook | Dihitung di RPC **DAN dipakai langsung** untuk `totalModal` |
| Bug totalModal pakai hpp_per_item mentah | Ikut terbawa (dilaporkan, tidak diperbaiki) | **Diperbaiki** — totalModal sekarang pakai effective_hpp |
| Syarat fallback | `hpp_per_item` truthy (0 dan negatif dianggap "tidak ada" — tapi truthy JS artinya SEMUA angka bukan-nol termasuk negatif dianggap valid) | `hpp_per_item IS NOT NULL AND hpp_per_item > 0` (eksplisit, negatif pun fallback ke template) |
| `LIMIT 10000` pada scan `produksi_batch` | Dipertahankan (replikasi `.range(0,9999)` lama) | **Dihapus** — lihat penjelasan di bawah |
| `fetchProduksiBatchesTotal()` (api.js) | `return data ?? []` | `return data ?? { totalBatch: 0, totalBaju: 0, totalModal: 0 }` |
| `useProduksiBatchesTotal()` (hooks.js) | 2 baris `.reduce()` + 1 `.length` | Pass-through murni, 0 baris business logic |
| Test `api.test.js` (describe fetchProduksiBatchesTotal) | 5 test berbasis array | 5 test berbasis object (ditulis ulang total) |
| Test `hooks.test.js` | 0 test untuk `useProduksiBatchesTotal` | **3 test baru** ditambahkan |

**Soal penghapusan `LIMIT 10000`** (perubahan yang tidak diminta secara
eksplisit oleh Anda, diambil sebagai keputusan desain — diungkapkan
secara transparan): batas ini pada revisi pertama murni warisan
`.range(0,9999)` versi JS lama, yang ADA supaya payload array yang
dikirim ke client tidak meledak. Sekarang RPC hanya mengirim 3 angka —
tidak ada lagi alasan teknis untuk membatasi jumlah baris yang dipindai
di server. Mempertahankan batas itu akan membuat "business rule yang
benar" (permintaan eksplisit Anda) jadi TIDAK BENAR untuk toko yang
suatu saat punya >10.000 batch produksi (statistik all-time diam-diam
tidak lengkap). Karena instruksi Anda menekankan "business rule yang
benar" dan "PostgreSQL = seluruh business logic", saya menganggap
menghapus batas artifisial ini sejalan dengan arah tersebut — tapi ini
tetap PERUBAHAN PERILAKU nyata (hanya berdampak kalau data
`produksi_batch` sudah melebihi 10.000 baris, yang saat ini kemungkinan
besar belum terjadi untuk skala bisnis ini) sehingga diungkap eksplisit
di sini, bukan dilakukan diam-diam.

---

## 5. Berapa Payload yang Berhasil Dihilangkan

- **Revisi pertama**: RPC mengirim 1 array berisi hingga 10.000 objek
  (masing-masing 4 field: total_kain, hpp_per_item, kode_produk,
  hpp_total).
- **Revisi ini**: RPC mengirim 1 object berisi TEPAT 3 angka
  (`totalBatch`, `totalBaju`, `totalModal`).
- **Estimasi pengurangan**: untuk toko dengan, katakanlah, 500 batch
  produksi tercatat, payload turun dari ~500 objek jsonb (masing-masing
  berisi angka + string kode_produk, kasar diperkirakan puluhan KB)
  menjadi **kurang dari 100 byte** (3 pasangan key-value angka) — turun
  **>99%** untuk endpoint ini secara spesifik. Ini adalah pengurangan
  payload paling drastis dari seluruh rangkaian migrasi Phase 1 sejauh
  ini, karena sebelumnya endpoint ini adalah satu-satunya yang MASIH
  mengirim array penuh ke client meski sudah pakai RPC.

---

## 6. Berapa Business Logic Frontend yang Berhasil Dihapus

Dihitung baris kode yang mengandung business logic (bukan sekadar
pass-through/fallback tampilan):

| Lokasi | Sebelum (revisi pertama) | Sesudah (revisi ini) |
|---|---|---|
| `hooks.js` — `useProduksiBatchesTotal` | 3 baris logic: 2× `.reduce()` (SUM totalBaju, SUM totalModal dengan perkalian) + 1× `.length` (COUNT) | **0 baris logic** — murni membaca 3 field dari `data` dengan fallback `?? 0` |
| `api.js` — `fetchProduksiBatchesTotal` | 0 (sudah pass-through sejak revisi pertama) | 0 (tetap pass-through, hanya bentuk fallback berubah dari `[]` ke object nol) |

**Total business logic frontend yang dihapus di fitur ini: 3 operasi
agregasi** (2 SUM + 1 COUNT, termasuk operasi perkalian di dalam salah
satu SUM) — seluruhnya kini murni tanggung jawab database.

---

## 7. Bagian Hook yang Menjadi Lebih Sederhana

`useProduksiBatchesTotal()` — dari:
```js
export function useProduksiBatchesTotal() {
  const { data, isLoading } = useProduksiBatchesTotalQuery();
  const batches = data ?? [];
  const totalBaju = batches.reduce((s, b) => s + (b.total_kain ?? 0), 0);
  const totalModal = batches.reduce((s, b) => s + (b.hpp_per_item || 0) * (b.total_kain || 0), 0);
  return { totalBaju, totalModal, totalBatch: batches.length, loading: isLoading };
}
```
menjadi:
```js
export function useProduksiBatchesTotal() {
  const { data, isLoading } = useProduksiBatchesTotalQuery();
  return {
    totalBatch: data?.totalBatch ?? 0,
    totalBaju: data?.totalBaju ?? 0,
    totalModal: data?.totalModal ?? 0,
    loading: isLoading,
  };
}
```
Interface publik hook (4 key yang di-return: `totalBaju`, `totalModal`,
`totalBatch`, `loading`) **TIDAK BERUBAH** — hanya isinya yang tidak lagi
dihitung dari array mentah, sehingga `ProduksiLaporanPage.jsx` (satu-satunya
consumer) **tidak perlu diubah sama sekali**, dikonfirmasi lewat 15 test
`ProduksiLaporanPage.test.jsx` yang lulus tanpa modifikasi (test tersebut
mock `useProduksiBatchesTotal` langsung di level hooks.js, sehingga
transparan terhadap perubahan internal ini).

---

## 8. Apakah Masih Ada Technical Debt yang Tersisa?

1. **Nama fungsi `fetchProduksiBatchesTotal()` "Total" tunggal vs
   `useProduksiBatchesTotal()` "Total" jamak dengan makna beda** — sudah
   tidak relevan lagi sebagai kebingungan (sekarang KEDUANYA benar-benar
   soal statistik total, konsisten), technical debt penamaan dari
   laporan sebelumnya **sudah otomatis hilang** sebagai efek samping
   revisi ini (bukan tujuan utama, tapi manfaat tambahan).
2. **Tidak ada pengecekan `error` eksplisit dari `supabase.rpc()`** di
   `fetchProduksiBatchesTotal()` — masih dipertahankan sama seperti versi
   sebelumnya (silent fallback ke object nol, tanpa `console.error`).
   Ini KONSISTEN dengan keputusan "identik dengan versi lama" dari
   migration sebelumnya, tapi sekarang terasa sedikit tidak konsisten
   dibanding `fetchSalesByKode`/`fetchStokMap` (dari migration Phase 1
   sebelumnya) yang SUDAH punya `console.error` eksplisit. Ini adalah
   technical debt kecil yang tersisa — bisa diseragamkan di fase
   berikutnya kalau observability jadi prioritas, tapi TIDAK diubah di
   sini karena di luar scope permintaan Anda saat ini (yang fokus pada
   pemindahan business logic, bukan error handling).
3. **`fetchProduksiBatches()` (fungsi laporan bulanan, BUKAN all-time)
   masih TIDAK dimigrasikan** — sesuai instruksi awal ("JANGAN
   mengerjakan fetchProduksiBatches() dulu"), fungsi ini masih melakukan
   3 query berurutan + join manual + perhitungan rata-rata (AVG) di JS.
   Ini kandidat migrasi berikutnya yang jelas, dengan pola serupa (RPC
   full-aggregate) yang sekarang sudah ada presedennya di fitur ini.
4. **`useProduksiBatchesTotalQuery`/`queries.js` belum ikut ditulis
   ulang test-nya untuk skenario object baru** — `queries.test.js` tidak
   menyentuh `useProduksiBatchesTotalQuery` sama sekali (baik sebelum
   maupun sesudah revisi ini), karena `queries.js` sendiri tidak berubah
   (murni wrapper `useQuery`, transparan terhadap bentuk data). Cakupan
   test untuk hook ini sekarang ada di level `hooks.test.js` (baru
   ditambahkan) yang sudah cukup memverifikasi kontraknya secara
   end-to-end lewat mock `useProduksiBatchesTotalQuery`.

---

## 9. Apakah Masih Ada Peluang Optimasi Lagi?

1. **`fetchProduksiBatches()` (laporan bulanan)** — kandidat migrasi
   paling jelas berikutnya, pola sama persis (gabungkan 3 query +
   pindahkan perhitungan AVG harga_jual ke SQL).
2. **Index pada `produksi_batch.kode_produk`** — RPC ini melakukan
   `LEFT JOIN hpp_template ON kode_produk` tanpa filter tanggal (full
   scan tabel `produksi_batch`). Kalau tabel ini nantinya sangat besar,
   index pada `kode_produk` (kalau belum ada) akan mempercepat JOIN —
   **di luar scope task ini** (dilarang eksplisit "Jangan membuat
   index").
3. **`STABLE` vs materialized/cached result** — RPC saat ini `STABLE`
   (aman di-cache dalam 1 transaksi, tapi tetap dieksekusi ulang setiap
   dipanggil). Kalau StatCard all-time ini di-refresh sangat sering oleh
   banyak user bersamaan, opsi lanjutan adalah materialized view dengan
   refresh berkala — TIDAK diimplementasikan di sini karena melanggar
   larangan eksplisit "Jangan membuat view."
4. **Menyeragamkan pola error-handling** RPC-calling functions di
   seluruh `produksi-laporan/api.js` (lihat §8 poin 2) — peluang
   perbaikan konsistensi kecil, bukan optimasi performa.

---

## Ringkasan File yang Diubah (revisi ini)

| File | Perubahan |
|---|---|
| `supabase/migrations/20260711_migration_phase1_rpc_produksi_batches_total.sql` | **DIEDIT** (bukan file baru) — `get_produksi_batches_total()` diubah total dari return array menjadi return object agregat; `LIMIT 10000` dihapus; komentar ditulis ulang menjelaskan revisi & perbaikan bug |
| `apps/admin/src/features/produksi-laporan/api.js` | `fetchProduksiBatchesTotal()` — fallback diubah dari `[]` ke `{totalBatch:0,totalBaju:0,totalModal:0}` |
| `apps/admin/src/features/produksi-laporan/hooks.js` | `useProduksiBatchesTotal()` — dihapus 2× `.reduce()` + `.length`, jadi pass-through murni |
| `apps/admin/src/features/produksi-laporan/api.test.js` | `describe("fetchProduksiBatchesTotal")` ditulis ulang total (5 test, kontrak object bukan array) |
| `apps/admin/src/features/produksi-laporan/hooks.test.js` | Mock `useProduksiBatchesTotalQuery` ditambahkan ke factory; **3 test baru** untuk `useProduksiBatchesTotal` (sebelumnya nol test) |

**Catatan proses**: saat mengedit `hooks.js`, sempat tidak sengaja
memakai tool edit langsung ke path Windows (`D:\dev\deeraindonesia\...`)
alih-alih protokol wajib repo ini (Python/bash heredoc ke path Linux) —
ini menyebabkan **silent truncation** persis seperti yang diperingatkan
di `CLAUDE.md` (file terpotong di tengah fungsi). Terdeteksi segera lewat
verifikasi `tail`/`wc -l` yang rutin dilakukan setelah setiap penulisan
file, dan diperbaiki langsung dengan menulis ulang file lengkap via bash
heredoc. Dicatat di sini untuk transparansi penuh — tidak ada dampak ke
hasil akhir karena terdeteksi & diperbaiki sebelum lanjut ke langkah
berikutnya.

Test suite fitur `produksi-laporan` dijalankan ulang setelah seluruh
perubahan: **79/79 test lulus** (76 sebelumnya + 3 test baru
`useProduksiBatchesTotal`; `api.test.js` tetap 11 test — 5 di antaranya
ditulis ulang total untuk kontrak object, bukan ditambah).
