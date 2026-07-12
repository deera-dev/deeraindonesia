# Laporan — Migration Phase 1: RPC `get_produksi_batches_total`

Scope: **hanya** `fetchProduksiBatchesTotal()` di
`apps/admin/src/features/produksi-laporan/api.js`. `fetchProduksiBatches()`
**tidak dikerjakan** (sesuai instruksi eksplisit "JANGAN mengerjakan
fetchProduksiBatches() dulu"). Hook, queries, dan komponen React tidak
disentuh.

---

## 1. Business Flow Lama

```
fetchProduksiBatchesTotal()
├─ SELECT total_kain, hpp_per_item, kode_produk FROM produksi_batch
│  .range(0, 9999)   (maks 10.000 baris, TANPA filter tanggal — all-time)
│  (TIDAK ADA pengecekan `error` — kegagalan diam-diam jadi rawBatches=[])
├─ needTpl = batch yang hpp_per_item-nya FALSY (null ATAU 0)
├─ kodes = kode_produk unik dari needTpl (yang truthy saja, via .filter(Boolean))
├─ kalau kodes.length > 0:
│  └─ SELECT kode_produk, total_hpp FROM hpp_template WHERE kode_produk IN (kodes)
│     (TIDAK ADA pengecekan `error` di sini juga — kegagalan diam-diam jadi templateMap={})
└─ return rawBatches.map(b => ({
     ...b,
     hpp_total: b.hpp_per_item ? b.hpp_per_item : (templateMap[b.kode_produk]?.total_hpp ?? 0)
   }))
   → ARRAY per-batch, BUKAN angka teragregasi!
```

**Fakta penting**: fungsi ini TIDAK menghitung "total batch/baju/modal"
sama sekali — ia hanya mengambil semua batch (all-time) dan menambahkan
field `hpp_total` (fallback ke template kalau `hpp_per_item` kosong).
Agregasi sebenarnya (SUM, COUNT) terjadi di
`useProduksiBatchesTotal()` (`hooks.js`, TIDAK diubah di migration ini):

```js
// apps/admin/src/features/produksi-laporan/hooks.js (TIDAK DIUBAH)
export function useProduksiBatchesTotal() {
  const { data, isLoading } = useProduksiBatchesTotalQuery();
  const batches = data ?? [];
  const totalBaju = batches.reduce((s, b) => s + (b.total_kain ?? 0), 0);
  const totalModal = batches.reduce((s, b) => s + (b.hpp_per_item || 0) * (b.total_kain || 0), 0);
  return { totalBaju, totalModal, totalBatch: batches.length, loading: isLoading };
}
```

**Masalah:** untuk menghitung 3 angka statistik all-time (StatCard di
halaman Laporan Produksi), SELURUH batch produksi (hingga 10.000 baris)
ditarik ke browser lewat 2 query berurutan, hanya untuk dijumlahkan
tiga baris kode di JS.

---

## 2. Business Flow Baru

```
fetchProduksiBatchesTotal()                      [client, produksi-laporan/api.js]
└─ supabase.rpc("get_produksi_batches_total")
   └─ return data ?? []     (TIDAK ada pengecekan `error` — SAMA seperti versi lama)

get_produksi_batches_total()                      [Postgres, 1 query]
├─ SELECT total_kain, hpp_per_item, kode_produk FROM produksi_batch LIMIT 10000
├─ LEFT JOIN hpp_template ON kode_produk
└─ RETURN jsonb_agg(jsonb_build_object(
     'total_kain', ..., 'hpp_per_item', ..., 'kode_produk', ...,
     'hpp_total', CASE WHEN hpp_per_item truthy THEN hpp_per_item
                        ELSE COALESCE(template.total_hpp, 0) END
   ))  → ARRAY per-batch, PERSIS sama bentuknya seperti hasil lama
```

RPC ini TETAP mengembalikan array baris per-batch (bukan angka
teragregasi) — bukan karena keterbatasan teknis, tapi karena
`useProduksiBatchesTotal()` (hook, di luar scope migration ini) masih
melakukan `.reduce()` sendiri atas array tersebut. Memindahkan agregasi
ke RPC akan mengharuskan perubahan hook, yang dilarang eksplisit oleh
instruksi task ini.

---

## 3. Query yang Dihilangkan

| Sebelum | Sesudah |
|---|---|
| 1 query `SELECT ... FROM produksi_batch .range(0,9999)` (hingga 10.000 baris) | 1 RPC call |
| 1 query kondisional `SELECT ... FROM hpp_template WHERE kode_produk IN (...)` (hanya jalan kalau ada batch yang butuh) | *(digabung ke dalam RPC yang sama)* |

Dari **hingga 2 query berurutan** (produksi_batch → hpp_template) menjadi
**1 RPC call**. Join yang sebelumnya dilakukan manual via `templateMap`
di JavaScript sekarang dilakukan via `LEFT JOIN` di SQL.

---

## 4. Estimasi Pengurangan Payload

- **Jumlah baris yang dikirim ke client**: TIDAK BERUBAH secara jumlah
  (tetap 1 baris per batch, sampai 10.000) — fungsi ini memang didesain
  mengembalikan seluruh baris (dipakai untuk `.reduce()` di hook), bukan
  hasil agregat. Jadi *pengurangan payload* di sini BUKAN dari
  "lebih sedikit baris", melainkan dari **menghilangkan 1 query
  bolak-balik jaringan** (query `hpp_template` terpisah + waktu tunggu
  round-trip-nya) dan **field per baris tetap sama** (4 kolom: total_kain,
  hpp_per_item, kode_produk, hpp_total) — tidak ada kolom tambahan yang
  ikut terbawa dari `hpp_template` (mis. `bahan_items` yang berat) karena
  join hanya mengambil `total_hpp` yang dibutuhkan.
- **Perkiraan pengurangan realistis**: 1 round-trip network penuh
  dihilangkan (query `hpp_template` kedua), plus latency asosiasi
  koneksi HTTP untuk query tersebut. Untuk toko dengan ratusan/ribuan
  batch produksi, penghematan utamanya ada di **waktu**, bukan volume
  byte payload akhir (karena payload akhir hampir identik ukurannya).

---

## 5. Estimasi Peningkatan Performa

- **Menghilangkan 1 round-trip jaringan penuh** — sebelumnya, kalau ada
  batch yang butuh enrichment, browser harus menunggu query 1 selesai,
  baru mengirim query 2, baru memproses join di JS. Sekarang semuanya
  1 kali pergi-pulang.
- **Join dieksekusi di database** — `LEFT JOIN` pada kolom `kode_produk`
  jauh lebih cepat dilakukan oleh query planner Postgres dibanding
  membangun `Map` di JavaScript lalu iterasi manual per baris.
- **`staleTime: 1000 * 60 * 5`** (5 menit) sudah diterapkan di
  `useProduksiBatchesTotalQuery` (TIDAK diubah) — artinya query ini
  sudah di-cache TanStack Query, jadi manfaat performa RPC ini paling
  terasa pada **cache miss pertama** (pertama kali StatCard all-time
  dibuka / setelah 5 menit) — bukan pada setiap render.
- Karena jumlah baris yang dipindai & dikirim tidak berkurang (lihat
  §4), peningkatan performa di sini **lebih moderat** dibanding migrasi
  `fetchSalesByKode`/`fetchStokMap` sebelumnya — keuntungan utamanya
  adalah pengurangan 1 round-trip + join di server, bukan pengurangan
  volume data besar-besaran.

---

## 6. Risiko Migration

1. **`SECURITY INVOKER`** — RPC mengandalkan RLS `produksi_batch`/
   `hpp_template` yang sudah mengizinkan `authenticated` untuk SELECT
   (dipakai berhasil oleh fitur lain seperti `produksi-record/api.js`
   dan `produksi-hpp/api.js` di app yang sama).
2. **Kegagalan query "diam-diam" secara struktural berbeda sekarang**
   — lihat detail lengkap di §11 (Perbedaan Perilaku).
3. **Tidak ada perubahan skema** — memenuhi syarat "jangan membuat
   view/trigger/generated column/index baru, jangan mengubah
   constraint" secara ketat.
4. **`jsonb_agg` pada 0 baris menghasilkan NULL** — sudah ditangani
   dengan `COALESCE(..., '[]'::jsonb)` di query terluar, sehingga tabel
   `produksi_batch` kosong tetap menghasilkan `[]`, sama seperti
   `rawBatches=[]` di versi lama.
5. **`hpp_total` tetap dihitung meski tidak terpakai** (lihat §12/§13)
   — bukan risiko baru, tapi tetap membebani query dengan `LEFT JOIN`
   yang hasilnya (secara downstream saat ini) tidak berpengaruh ke
   angka yang ditampilkan user. Dipertahankan karena scope task ini
   adalah "identik", bukan "optimal".

---

## 7. Cara Testing Manual

1. **Jalankan migration**
   `supabase/migrations/20260711_migration_phase1_rpc_produksi_batches_total.sql`
   di Supabase SQL Editor.
2. **Verifikasi fungsi terdaftar:**
   ```sql
   SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_produksi_batches_total';
   SELECT grantee, privilege_type FROM information_schema.routine_privileges
   WHERE routine_name = 'get_produksi_batches_total';
   ```
3. **Bandingkan jumlah baris & isi**:
   ```sql
   SELECT jsonb_array_length(public.get_produksi_batches_total());
   SELECT count(*) FROM produksi_batch;  -- bandingkan (RPC dibatasi 10.000)
   ```
4. **Bandingkan satu batch dengan hpp_per_item kosong**:
   ```sql
   SELECT b -> 'kode_produk', b -> 'hpp_per_item', b -> 'hpp_total'
   FROM jsonb_array_elements(public.get_produksi_batches_total()) b
   WHERE (b ->> 'hpp_per_item')::int = 0 OR b -> 'hpp_per_item' = 'null'
   LIMIT 5;
   ```
   Untuk tiap baris, cek manual `hpp_total` harus sama dengan
   `SELECT total_hpp FROM hpp_template WHERE kode_produk = '<kode_produk baris tsb>'`
   (atau 0 kalau tidak ada template).
5. **Skenario di UI** — buka halaman Admin → Produksi → Laporan → tab
   yang menampilkan StatCard all-time (total batch, total baju, total
   modal). Pastikan ketiga angka SAMA dengan sebelum migration (catat
   angkanya dulu sebelum apply migration untuk perbandingan).
6. **Skenario tidak ada batch sama sekali** (staging/test env) —
   pastikan StatCard menampilkan 0/0/0, bukan error.
7. **Skenario RPC gagal** (simulasi, revoke EXECUTE sementara) —
   pastikan StatCard tetap tampil 0/0/0 (graceful, tidak crash), sesuai
   perilaku lama yang juga tidak pernah melempar error.
8. **Jalankan unit test**:
   `npm run test:admin -- --run apps/admin/src/features/produksi-laporan`
   — sudah diverifikasi **76/76 test lulus** (rincian di §9).

---

## 8. Hal yang Sengaja Tidak Diubah

- **Signature `fetchProduksiBatchesTotal()`** — tetap tanpa parameter,
  tetap `Promise<Array>`.
- **`useProduksiBatchesTotalQuery`/`useProduksiBatchesTotal`** (queries.js
  & hooks.js) — **tidak disentuh sama sekali**. Agregasi SUM/COUNT tetap
  di hook, bukan dipindah ke RPC — walau secara arsitektur idealnya bisa
  dipindah juga, itu di luar scope task ini ("Jangan mengubah hook").
- **Komponen React** (`ProduksiLaporanPage.jsx`, `StatCard.jsx`, dll.) —
  tidak ada satu baris pun diubah, dikonfirmasi lewat 15 test
  `ProduksiLaporanPage.test.jsx` dan 5 test `StatCard.test.jsx` yang
  lulus tanpa modifikasi.
- **`fetchProduksiBatches()` dan `fetchTagihanJatuhTempo()`** — sama
  sekali tidak disentuh (baik implementasi maupun test), sesuai instruksi
  eksplisit "JANGAN mengerjakan fetchProduksiBatches() dulu".
- **Field `hpp_total` yang tidak terpakai** — tetap dihitung & dikirim
  apa adanya, TIDAK dihapus dari RPC meskipun secara downstream saat ini
  sia-sia (lihat §12/§13) — mengubah/menghapusnya akan mengubah bentuk
  output, yang dilarang.
- **`.range(0, 9999)` → `LIMIT 10000`** — batas jumlah baris
  dipertahankan (lihat §11 untuk nuansa `.range()` vs `.limit()`).
- **RPC lain** — tidak ada yang diimplementasikan. Kandidat Priority A
  tersisa dari audit Phase 1 (`fetchProduksiBatches`) sengaja dibiarkan
  untuk task terpisah, sesuai instruksi.

---

## 9. Unit Test — Hasil

| File | Jumlah test | Status |
|---|---|---|
| `api.test.js` | 11 (6 lama tidak diubah + **5 baru** untuk `fetchProduksiBatchesTotal`) | ✅ 11/11 lulus |
| `queries.test.js` | 5 | ✅ lulus (tidak disentuh) |
| `hooks.test.js` | 4 | ✅ lulus (tidak disentuh) |
| `utils.test.js` | 20 | ✅ lulus (tidak disentuh) |
| `components/ProduksiLaporanPage.test.jsx` | 15 | ✅ lulus (tidak disentuh) |
| `components/BatchDetail.test.jsx` | 8 | ✅ lulus (tidak disentuh) |
| `components/StatCard.test.jsx` | 5 | ✅ lulus (tidak disentuh) |
| `components/JtBadge.test.jsx` | 4 | ✅ lulus (tidak disentuh) |
| `components/MonthPicker.test.jsx` | 4 | ✅ lulus (tidak disentuh) |
| **Total fitur `produksi-laporan`** | **76** | **✅ 76/76 lulus** |

5 test baru yang ditambahkan ke `api.test.js` (sebelumnya **tidak ada
satu pun test** untuk `fetchProduksiBatchesTotal`, `useProduksiBatchesTotalQuery`,
maupun `useProduksiBatchesTotal` di codebase — celah cakupan yang sudah
ada sebelum migration ini, lihat §13): parameter RPC benar, hasil
diteruskan apa adanya, fallback `[]` saat data null, fallback `[]` saat
RPC error (tanpa throw), fallback `[]` saat RPC mengembalikan array
kosong.

Mock `supabase` di `api.test.js` (`{ from: vi.fn(), rpc: vi.fn() }`)
ditambah properti `rpc` — satu-satunya perubahan pada infrastruktur test
selain penambahan `describe` block baru.

---

## 10-11. Edge Case & Perbedaan Perilaku (sekecil apa pun)

| # | Edge case / perbedaan | Perilaku lama | Perilaku RPC | Identik pada jalur normal? |
|---|---|---|---|---|
| 1 | `produksi_batch` kosong | `rawBatches=[]` → `map()` → `[]` | `jsonb_agg` 0 baris → NULL → `COALESCE` → `[]` | ✅ Ya |
| 2 | `hpp_per_item` NULL | Falsy → fallback template | `IS NOT NULL AND != 0` → FALSE → fallback template | ✅ Ya |
| 3 | `hpp_per_item = 0` | Falsy → fallback template | `!= 0` → FALSE → fallback template | ✅ Ya |
| 4 | `kode_produk` NULL | `templateMap[undefined]` = undefined → `?? 0` = 0 | `LEFT JOIN ON tpl.kode_produk = pb.kode_produk` tidak match NULL → `COALESCE(NULL,0)` = 0 | ✅ Ya |
| 5 | Tidak ada `hpp_template` yang cocok | `templateMap[kode]` = undefined → 0 | `tpl.total_hpp` NULL (no match) → `COALESCE(...,0)` = 0 | ✅ Ya |
| 6 | Query `produksi_batch` gagal (mis. RLS ditolak, koneksi putus) | `batchData` undefined → `rawBatches=[]`, TAPI query kedua (`hpp_template`) **tetap berpotensi jalan** kalau logikanya somehow sampai situ — pada praktiknya tidak, karena `needTpl` dari `rawBatches=[]` juga kosong, jadi `kodes.length===0`, query 2 di-skip. **Efeknya SAMA: hasil akhir `[]`.** | RPC gagal total (1 query, 1 transaksi) → `data=null` → `return data ?? []` → `[]` | ✅ Ya (hasil akhir sama, mekanisme kegagalan berbeda struktur — lihat #7 di bawah) |
| 7 | **Kegagalan PARSIAL**: query `produksi_batch` SUKSES tapi query `hpp_template` GAGAL (skenario yang secara struktural HANYA mungkin terjadi di versi LAMA, karena 2 query terpisah) | `tplData` undefined → `templateMap={}` → SEMUA batch yang butuh template jatuh ke `hpp_total=0`, TAPI array `total_kain`/`hpp_per_item`/`kode_produk` dari query PERTAMA (yang sukses) **tetap dikembalikan lengkap** — jumlah baris & field lain tidak hilang, hanya `hpp_total` yang under-computed untuk sebagian baris. | **Secara struktural TIDAK MUNGKIN terjadi lagi** — RPC adalah SATU query/transaksi; kalau JOIN ke `hpp_template` gagal (mis. tabel terkunci, dsb.), SELURUH RPC gagal, bukan hanya bagian join-nya → hasil akhir jadi `[]` (bukan array lengkap dengan `hpp_total=0` parsial) | ⚠️ **TIDAK identik pada skenario kegagalan parsial spesifik ini** — lihat penjelasan di bawah |

**Penjelasan perbedaan #7 (satu-satunya perbedaan perilaku yang
ditemukan):** Ini adalah konsekuensi struktural yang tidak terhindarkan
dari menggabungkan 2 query independen menjadi 1 RPC atomik — bukan
sesuatu yang bisa "dipertahankan identik" tanpa membatalkan tujuan
migrasi itu sendiri (menyatukan query). Pada kondisi NORMAL (kedua query
sukses, atau query PERTAMA gagal), hasilnya identik. Perbedaan HANYA
muncul pada skenario sempit: query pertama sukses DAN query kedua gagal
SECARA SPESIFIK — yang berarti pada RPC baru, kegagalan itu membuat
seluruh batch (termasuk yang totalnya tidak butuh template sama sekali)
ikut hilang dari hasil, alih-alih hanya field `hpp_total` sebagian batch
yang salah. Mengingat query kedua (`hpp_template`) adalah SELECT
sederhana pada tabel kecil dengan RLS yang sama seperti tabel pertama,
skenario "satu sukses satu gagal" ini sangat tidak realistis di
operasional normal (biasanya keduanya sukses atau keduanya gagal
bersamaan, mis. karena koneksi database putus) — tapi tetap
diungkapkan di sini secara eksplisit sesuai instruksi "Jika ada
perbedaan sekecil apa pun, jelaskan secara eksplisit."

---

## 12. Apakah Ada Bug Lama yang Ikut Terbawa?

**Ya, ditemukan satu bug/inkonsistensi nyata (bukan hipotetis) — dan ia
IKUT TERBAWA secara sengaja (tidak diperbaiki), sesuai instruksi.**

`fetchProduksiBatchesTotal()` menghitung field `hpp_total` (fallback ke
`hpp_template.total_hpp` kalau `hpp_per_item` kosong) — tapi
**satu-satunya consumer**, `useProduksiBatchesTotal()` di `hooks.js`,
menghitung `totalModal` dari **`b.hpp_per_item` MENTAH**, BUKAN dari
`b.hpp_total`:

```js
// hooks.js — TIDAK DIUBAH, dikutip apa adanya
const totalModal = batches.reduce((s, b) => s + (b.hpp_per_item || 0) * (b.total_kain || 0), 0);
```

**Akibatnya**: batch produksi yang `hpp_per_item`-nya masih 0/null
(misalnya batch lama sebelum HPP-nya diisi, atau batch yang HPP-nya
baru dibuat via Template setelah batch itu dibuat — skenario yang
persis digambarkan di `produksi-record/api.js` sebagai alasan adanya
fungsi `resyncBahanDipakai`) **TIDAK ikut dihitung ke "Total Modal"**
di StatCard all-time, WALAUPUN produk tersebut sudah punya Template HPP
yang valid. Field `hpp_total` yang seharusnya menjadi "angka final yang
benar" (sudah fallback ke template) dihitung dengan susah payah lewat
query kedua + join, tapi hasilnya dibuang begitu saja oleh consumer.

**Ini BUKAN bug baru dari migration ini** — perilaku ini sudah ada di
kode JS sebelum migration ini disentuh sama sekali. RPC ini
mereplikasi persis (menghitung `hpp_total` yang tetap tidak terpakai)
supaya output `fetchProduksiBatchesTotal()` identik dengan sebelumnya.
**Tidak diperbaiki di sini** sesuai instruksi eksplisit "Jangan diam-diam
diperbaiki kecuali memang diperlukan agar identik" dan "Jangan mengubah
hook."

---

## 13. Technical Debt yang Ditemukan

1. **Field `hpp_total` yang dihitung tapi tidak dipakai** (detail di
   §12) — technical debt paling signifikan yang ditemukan. Perbaikan
   yang tepat (di luar scope task ini) kemungkinan adalah mengubah
   `useProduksiBatchesTotal()` untuk memakai `b.hpp_total` alih-alih
   `b.hpp_per_item`, ATAU menghapus enrichment `hpp_total` dari
   `fetchProduksiBatchesTotal()` kalau memang tidak pernah dipakai di
   mana pun (perlu audit tambahan apakah field ini dipakai di tempat
   lain sebelum dihapus).
2. **Fungsi bernama "...Total" tapi tidak menghitung total** — nama
   `fetchProduksiBatchesTotal()` menyiratkan fungsi ini menghasilkan
   angka total, padahal ia mengembalikan array mentah dan agregasi
   sebenarnya ada di hook terpisah dengan nama yang mirip
   (`useProduksiBatchesTotal`). Ini murni masalah penamaan/kejelasan
   kode, berpotensi membingungkan kontributor baru — tidak diubah di
   sini karena mengubah nama fungsi dilarang eksplisit ("Jangan
   mengubah nama function JS").
3. **Tidak ada penanganan `error` sama sekali di fungsi asli** (lihat
   §11 #6-7) — pola ini berbeda dari fungsi-fungsi lain yang sudah
   dimigrasikan sebelumnya di Phase 1 (`fetchSalesByKode`, `fetchStokMap`)
   yang SUDAH punya `if (error) { console.error(...); return ...; }`.
   Ketiadaan logging ini membuat kegagalan silent di StatCard all-time
   (tampil 0/0/0 tanpa jejak di console) — technical debt kecil, tapi
   konsisten dipertahankan di RPC baru karena scope task ini adalah
   "identik", bukan "perbaikan observability".
4. **Belum ada test sama sekali untuk `fetchProduksiBatchesTotal`,
   `useProduksiBatchesTotalQuery`, `useProduksiBatchesTotal`** sebelum
   migration ini (dikonfirmasi lewat pembacaan `api.test.js`,
   `queries.test.js`, `hooks.test.js` — ketiganya tidak menyinggung
   fungsi/hook ini sama sekali). 5 test baru ditambahkan untuk
   `fetchProduksiBatchesTotal()` di migration ini (§9), tapi
   `useProduksiBatchesTotalQuery`/`useProduksiBatchesTotal` **masih
   belum punya test** — di luar scope task ini karena keduanya berada
   di `queries.js`/`hooks.js` yang dilarang diubah.

---

## Ringkasan File yang Diubah

| File | Perubahan |
|---|---|
| `supabase/migrations/20260711_migration_phase1_rpc_produksi_batches_total.sql` | **BARU** — definisi `get_produksi_batches_total()` + GRANT |
| `apps/admin/src/features/produksi-laporan/api.js` | `fetchProduksiBatchesTotal()` diringkas jadi 1 pemanggilan `supabase.rpc(...)`; TIDAK ditambahkan error handling baru (replikasi silent-failure lama) |
| `apps/admin/src/features/produksi-laporan/api.test.js` | Mock `supabase` ditambah properti `rpc: vi.fn()`; import `fetchProduksiBatchesTotal` ditambahkan; **5 test baru** (describe block baru, sebelumnya nol test untuk fungsi ini) |

Test suite fitur `produksi-laporan` sudah dijalankan dan **76/76 test
lulus** (rincian per file di §9), tanpa satu pun file di luar
`api.js`/`api.test.js` yang disentuh.
