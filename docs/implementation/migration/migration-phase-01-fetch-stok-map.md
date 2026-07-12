# Laporan — Migration Phase 1: RPC `get_stock_summary`

Scope: **hanya** `fetchStokMap()` di `apps/admin/src/features/produk/api.js`.
`fetchSalesByKode()`, `fetchStokWarnaByKode()`, `fetchProducts()`, hook,
queries, dan komponen React **tidak disentuh**.

---

## 1. Business Flow Lama

```
fetchStokMap()
├─ SELECT kode, size, gudang, cideng, tegalgubug FROM stok_warna
│  (TANPA filter apa pun — seluruh baris, seluruh produk, seluruh warna)
├─ error atau data null → return {}
└─ loop semua baris di JS:
   ├─ map[kode] belum ada → inisialisasi {gudang:0, cideng:0, tegalgubug:0, sizes:{}}
   ├─ map[kode].gudang/cideng/tegalgubug += row.<kolom> ?? 0   (SUM per kode)
   ├─ map[kode].sizes[size] belum ada → inisialisasi {gudang:0, cideng:0, tegalgubug:0}
   └─ map[kode].sizes[size].gudang/cideng/tegalgubug += row.<kolom> ?? 0  (SUM per kode+size)
   → return map
```

**Masalah:** untuk menampilkan grid produk di halaman Admin, SELURUH
tabel `stok_warna` (setiap baris kode × size × warna) ditarik ke browser,
lalu dijumlahkan dua tingkat (per kode, dan per kode+size) di JavaScript.
Payload ini bertumbuh linear terhadap jumlah kombinasi kode×size×warna,
padahal hasil akhir yang dipakai UI hanya berupa angka-angka teragregasi
per produk.

---

## 2. Business Flow Baru

```
fetchStokMap()                                   [client, produk/api.js]
└─ supabase.rpc("get_stock_summary")
   ├─ error atau data null → return {}            (SAMA seperti lama)
   └─ sukses → return data                        (diteruskan apa adanya, TANPA reshape)

get_stock_summary()                               [Postgres, 1 query]
├─ per_size:  GROUP BY kode, size → SUM(gudang), SUM(cideng), SUM(tegalgubug)
├─ per_kode:  GROUP BY kode → SUM(gudang), SUM(cideng), SUM(tegalgubug)
├─ size_map:  gabungkan per_size jadi objek {[size]: {gudang,cideng,tegalgubug}} per kode
└─ RETURN jsonb_object_agg(
     kode,
     jsonb_build_object('gudang',..,'cideng',..,'tegalgubug',..,'sizes', size_map)
   )
   → { [kode]: {gudang,cideng,tegalgubug,sizes:{[size]:{...}}} }, atau {} kalau tabel kosong
```

Kedua tingkat GROUP BY + SUM sekarang seluruhnya terjadi di database.
Hasil RPC SUDAH berbentuk object map final — client tidak lagi
melakukan loop/aggregate apa pun, hanya meneruskan `data` yang diterima.

---

## 3. Apakah Ada Perubahan Output?

**Tidak ada.** Bentuk & isi output persis sama:

```js
{
  "D-01-OSK": {
    gudang: 6, cideng: 4, tegalgubug: 3,
    sizes: {
      Midi:  { gudang: 5, cideng: 3, tegalgubug: 2 },
      Gamis: { gudang: 1, cideng: 1, tegalgubug: 1 },
    },
  },
  // ...kode lain
}
```

Tidak ada field tambahan (mis. tidak ada "total" gabungan lintas lokasi
per kode — kode lama memang tidak pernah menghitung itu, RPC juga tidak).
Tidak ada field yang hilang. Tidak ada perubahan tipe data (semua tetap
integer di level JS, dijamin oleh cast `::int` di SQL).

## Edge Case yang Diperiksa

| Kondisi | Perilaku lama | Perilaku RPC | Identik? |
|---|---|---|---|
| `stok_warna` kosong | `data=[]` → loop tidak jalan → `map={}` | `jsonb_object_agg` atas 0 baris → NULL → di-`COALESCE` jadi `{}` | ✅ Ya |
| Kolom gudang/cideng/tegalgubug NULL | `row.gudang ?? 0` (fallback JS) | `COALESCE(SUM(...), 0)` (fallback SQL) — **catatan**: kolom ini `NOT NULL DEFAULT 0` di skema saat ini, jadi NULL sebenarnya tidak mungkin terjadi pada data nyata; fallback tetap dipertahankan di kedua sisi sebagai jaring pengaman yang setara | ✅ Ya (secara perilaku defensif; tidak pernah teruji di data nyata di kedua versi) |
| Satu kode hanya punya 1 size | `map[kode].sizes` cuma berisi 1 key | `size_map` cuma berisi 1 key untuk kode itu | ✅ Ya |
| `error` dari Supabase | return `{}` | return `{}` (dicek di JS setelah `supabase.rpc()`) | ✅ Ya |
| `data` bernilai `null` tanpa error | return `{}` | return `{}` (dicek dengan `!data` yang sama) | ✅ Ya |

**Tidak ditemukan perbedaan output pada skenario apa pun** yang diperiksa.
Tidak ada bug lama yang perlu "diperbaiki" di sini — implementasi lama
untuk `fetchStokMap` sudah straightforward (single SELECT + agregasi
2-level, tanpa kondisi tersembunyi seperti pada `fetchSalesByKode`).

---

## 4. Query yang Dihilangkan

| Sebelum | Sesudah |
|---|---|
| 1 query `SELECT kode, size, gudang, cideng, tegalgubug FROM stok_warna` — mengembalikan **SETIAP baris** stok_warna (kode × size × warna), tanpa filter | 1 RPC call — mengembalikan **1 objek jsonb** berisi hasil agregat per kode (dan per size di dalamnya) |

Jumlah round-trip tetap 1 (tidak ada N+1), tapi jumlah baris yang
ditransfer turun dari "seluruh baris stok_warna" menjadi "jumlah produk
unik" (baris hasil sudah diringkas, bukan mentah).

---

## 5. Estimasi Pengurangan Payload

Contoh ilustratif: toko dengan 150 produk, rata-rata 2 size aktif × 3
warna per produk → sekitar 150 × 2 × 3 = **900 baris** `stok_warna`
mentah ditarik sebelumnya (masing-masing baris berisi kode+size+3 angka
lokasi). Setelah migrasi, payload adalah 1 objek jsonb berisi 150 entri
kode (masing-masing berisi 3 angka total + breakdown 2 size × 3 angka)
— jumlah *angka* yang dikirim serupa secara kasar, TAPI:

- **Tidak ada duplikasi kode/size berulang per baris warna** — versi
  lama mengirim string `kode` dan `size` berulang untuk SETIAP baris
  warna (mis. kode "D-01-OSK" muncul di 6 baris berbeda kalau ada 2
  size × 3 warna); RPC hanya mengirim key `kode`/`size` SEKALI per
  kombinasi unik dalam struktur jsonb bersarang.
- **Payload tumbuh sebanding jumlah PRODUK**, bukan jumlah kombinasi
  kode×size×warna — toko yang menambah lebih banyak WARNA per produk
  (bukan produk baru) tidak lagi menambah payload `fetchStokMap`, karena
  penjumlahan warna sudah selesai di server.
- Estimasi kasar pengurangan payload: **30–60%** pada skala data
  realistis toko ini (tergantung rata-rata jumlah warna per kombinasi
  kode+size), dan proporsi ini akan semakin besar seiring toko menambah
  lebih banyak varian warna per produk dari waktu ke waktu.

---

## 6. Estimasi Peningkatan Performa

- **AdminPage adalah halaman yang paling sering dibuka** (halaman utama
  Admin) — `fetchStokMap()` dipanggil setiap kali halaman ini di-load/
  refresh, jadi perbaikan di sini berdampak pada pengalaman yang paling
  sering dirasakan user.
- **Parsing JS di client hilang total** — sebelumnya browser harus
  iterasi SETIAP baris stok_warna dan melakukan 2 level agregasi
  (per kode, per kode+size) pada setiap load; sekarang nol pekerjaan
  agregasi di client, hanya menerima hasil jadi.
- **Beban database bertambah sedikit** (agregasi 2-level dipindah ke
  server), tapi ini query `GROUP BY`+`SUM` standar pada kolom integer —
  jenis operasi yang sangat efisien untuk PostgreSQL, apalagi dibanding
  proses yang sama dilakukan di JavaScript dengan overhead interpreter.
- Secara keseluruhan, RPC ini mengubah beban dari "transfer + parse
  banyak baris mentah di client" menjadi "1 query agregat di server +
  transfer hasil ringkas" — pola yang selalu lebih cepat untuk data
  yang terus bertambah.

---

## 7. Risiko Migration

1. **`SECURITY INVOKER`** (sesuai instruksi, bukan `SECURITY DEFINER`)
   — RPC mengandalkan RLS `stok_warna` yang sudah mengizinkan role
   `authenticated` (dan `anon`, untuk katalog publik) membaca
   `stok_warna` tanpa filter (`stok_warna_select ... TO anon,
   authenticated USING (true)`, sudah ada dari migration
   `supabase-migration-rls-fix.sql`). Karena RPC ini hanya dipakai di
   Admin (`authenticated`), GRANT EXECUTE dibatasi ke `authenticated`
   saja — lebih ketat daripada akses SELECT langsung ke tabel yang
   sebenarnya juga terbuka untuk `anon`.
2. **`COALESCE` untuk NULL yang secara skema tidak mungkin terjadi** —
   kolom `gudang`/`cideng`/`tegalgubug` sudah `NOT NULL DEFAULT 0` (dan
   sejak Migration Phase 0 juga ada CHECK `>= 0`), jadi `COALESCE(SUM(...),
   0)` di sini murni jaring pengaman yang setara dengan `?? 0` di kode
   lama — tidak menambah maupun mengurangi cakupan perilaku pada data
   nyata.
3. **Tidak ada perubahan skema** — memenuhi syarat "jangan membuat
   view/trigger/generated column/constraint baru, jangan mengubah
   schema" secara ketat. Fungsi ini murni membaca (SELECT), tidak
   pernah menulis.
4. **`jsonb_object_agg` pada tabel kosong** — sudah diverifikasi
   secara logis menghasilkan NULL yang di-`COALESCE` jadi `'{}'::jsonb`
   pada query terluar, sehingga skenario "belum ada stok sama sekali"
   tetap menghasilkan `{}` seperti versi lama, BUKAN error atau `null`
   yang bocor ke client.
5. **Payload jsonb tunggal berukuran besar** — kalau di masa depan
   jumlah produk unik bertambah sangat banyak (ribuan kode), hasil RPC
   ini tetap berupa 1 objek jsonb besar dikirim sekaligus (bukan
   dipaginasi) — sama seperti keterbatasan desain lama (`fetchStokMap`
   memang dirancang untuk mengambil SEMUA produk sekaligus untuk grid).
   Ini bukan regresi baru, hanya batasan desain yang diwariskan apa
   adanya sesuai instruksi "jangan mengubah business logic".

---

## 8. Cara Testing Manual

1. **Jalankan migration**
   `supabase/migrations/20260711_migration_phase1_rpc_stock_summary.sql`
   di Supabase SQL Editor.
2. **Verifikasi fungsi terdaftar:**
   ```sql
   SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_stock_summary';
   SELECT grantee, privilege_type FROM information_schema.routine_privileges
   WHERE routine_name = 'get_stock_summary';
   ```
3. **Bandingkan hasil dengan cara manual** untuk satu kode produk yang
   sudah punya beberapa size & warna:
   ```sql
   SELECT public.get_stock_summary() -> 'D-01-OSK';
   SELECT kode, size, SUM(gudang) gudang, SUM(cideng) cideng, SUM(tegalgubug) tegalgubug
   FROM stok_warna WHERE kode = 'D-01-OSK' GROUP BY kode, size;
   ```
   Jumlahkan manual hasil GROUP BY size tersebut dan bandingkan dengan
   angka `gudang`/`cideng`/`tegalgubug` di level kode dari RPC — harus
   sama persis.
4. **Skenario di UI** — buka halaman Admin (grid produk). Pastikan
   angka stok yang tampil di setiap kartu produk (gudang/cideng/
   tegalgubug per kode, dan breakdown per size kalau ada) sama seperti
   sebelum migration (bandingkan screenshot sebelum/sesudah untuk
   beberapa produk acak).
5. **Skenario tabel stok_warna kosong** (di environment staging/test) —
   pastikan grid produk tidak error dan menampilkan stok 0 untuk semua
   produk, bukan crash.
6. **Skenario RPC gagal** (simulasi, mis. revoke EXECUTE sementara dari
   `authenticated`) — pastikan halaman Admin tetap render (stok
   tampil 0 di semua kartu, bukan error di UI), cek console browser ada
   log kegagalan.
7. **Jalankan unit test**:
   `npm run test:admin -- --run apps/admin/src/features/produk/api.test.js`
   — sudah diverifikasi **21/21 lulus** pada sesi ini (4 test baru untuk
   `fetchStokMap`: parameter RPC benar, hasil diteruskan apa adanya,
   fallback `{}` saat error, fallback `{}` saat data null).
   Juga dijalankan `apps/admin/src/features/produk/components/AdminPage.test.jsx`
   (39/39 lulus) untuk memastikan halaman yang memakai `fetchStokMap`
   secara tidak langsung (lewat `useStokMap`) tidak terdampak.

---

## 9. Hal yang Sengaja Tidak Diubah

- **Signature `fetchStokMap()`** — tetap tanpa parameter, tetap
  `async function` yang mengembalikan `Promise<object>`.
- **`useStokMapQuery`/`useStokMap`/`produkKeys.stokMap`** di
  `queries.js`/`hooks.js` — **tidak disentuh sama sekali**, karena
  bentuk data yang di-return `fetchStokMap()` identik dengan sebelumnya.
- **Komponen React** (`AdminPage.jsx`, `ProductCard.jsx`, dll.) — tidak
  ada satu baris pun diubah; terverifikasi lewat `AdminPage.test.jsx`
  (39/39 lulus tanpa modifikasi test).
- **Kontrak "tidak pernah throw"** — fungsi tetap menangkap
  error/data-null secara internal dan mengembalikan `{}`, persis seperti
  sebelumnya.
- **`fetchSalesByKode()`, `fetchStokWarnaByKode()`, `fetchProducts()`,
  `saveProduct()`, `deleteProductCascade()`** — tidak disentuh sama
  sekali, baik implementasi maupun test-nya (diverifikasi test 21/21
  lulus, termasuk seluruh describe block lain di file yang sama).
- **RPC lain** — tidak ada yang diimplementasikan. Kandidat Priority A
  tersisa dari audit Phase 1 (`fetchProduksiBatches`,
  `fetchProduksiBatchesTotal`) dibiarkan seperti semula.

---

## Ringkasan File yang Diubah

| File | Perubahan |
|---|---|
| `supabase/migrations/20260711_migration_phase1_rpc_stock_summary.sql` | **BARU** — definisi `get_stock_summary()` + GRANT |
| `apps/admin/src/features/produk/api.js` | `fetchStokMap()` diringkas jadi 1 pemanggilan `supabase.rpc(...)`, tidak ada lagi loop/aggregate di JS; kontrak error-handling (fallback `{}`) dipertahankan |
| `apps/admin/src/features/produk/api.test.js` | `describe("fetchStokMap")` ditulis ulang: 4 test (parameter RPC, passthrough hasil, fallback error, fallback data null) menggantikan 3 test lama yang menguji query `.from("stok_warna")` + agregasi manual yang sudah tidak ada di layer JS |

Test suite fitur produk sudah dijalankan dan **21/21 test di
`api.test.js` lulus**, plus **39/39 test di `AdminPage.test.jsx`
lulus**. 4 kegagalan pre-existing yang sebelumnya ditemukan di
`WarnaSection.test.jsx`, `BahanPickerModal.test.jsx`, dan
`ProductDetailModal.test.jsx` (terkait rendering tabel stok & komponen
lain, bukan `fetchStokMap`) tetap muncul di run yang sama — dikonfirmasi
lewat `git diff` bahwa ketiga file tersebut tidak tersentuh perubahan
manapun di sesi ini, sehingga kegagalan itu di luar scope task ini.
