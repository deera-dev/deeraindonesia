# Laporan — Migration Phase 1: RPC `get_sales_summary_by_product`

Scope: **hanya** `fetchSalesByKode()` di `apps/admin/src/features/produk/api.js`.
Tidak ada RPC lain yang dibuat, tidak ada file di luar scope yang diubah
kecuali test yang wajib disesuaikan (CLAUDE.md §7 "Unit Test Mandate").

---

## 1. Business Flow Lama

```
fetchSalesByKode(kode)
├─ SELECT location, items FROM sales WHERE type='sale' LIMIT 10000
│  (menarik SEMUA baris sales — milik SEMUA produk, bukan hanya `kode`)
├─ error? → console.error, return {gudang:0, cideng:0, tegalgubug:0, total:0}
└─ loop setiap baris sales:
   └─ loop setiap item di sale.items:
      ├─ item.kode !== kode → skip
      ├─ hitung qty:
      │  ├─ item.warna adalah array → SUM item.warna[].qty
      │  └─ selain itu → Number(item.qty) || 0
      └─ qty > 0 DAN sale.location dikenal (in counts) →
         counts[location] += qty; counts.total += qty
   → return counts  { gudang, cideng, tegalgubug, total }
```

**Masalah:** untuk menghitung riwayat penjualan SATU produk, seluruh
tabel `sales` (hingga 10.000 baris, berisi item SEMUA produk) ditarik ke
browser admin, lalu difilter & dijumlah di JavaScript. Payload ini
terus membesar seiring transaksi bertambah, padahal hasil akhir yang
dibutuhkan hanya 4 angka.

---

## 2. Business Flow Baru

```
fetchSalesByKode(kode)                          [client, produk/api.js]
└─ supabase.rpc("get_sales_summary_by_product", { p_kode: kode })
   ├─ error? → console.error, return {gudang:0, cideng:0, tegalgubug:0, total:0}  (SAMA seperti lama)
   └─ sukses → return { gudang: data.gudang??0, cideng: data.cideng??0,
                          tegalgubug: data.tegalgubug??0, total: data.total??0 }

get_sales_summary_by_product(p_kode)             [Postgres, 1 query]
├─ FOR setiap baris sales WHERE type='sale' LIMIT 10000:
│  └─ FOR setiap item di items (jsonb_array_elements):
│     ├─ (item->>'kode') IS DISTINCT FROM p_kode → skip
│     ├─ hitung qty:
│     │  ├─ jsonb_typeof(item->'warna')='array' → SUM warna[].qty (safe-cast, gagal→0)
│     │  └─ selain itu → (item->>'qty')::numeric (safe-cast, gagal→0)
│     └─ qty > 0 DAN location ∈ {gudang,cideng,tegalgubug} →
│        akumulasi ke variabel lokasi + total
└─ RETURN jsonb {gudang, cideng, tegalgubug, total}  ← HANYA INI yang dikirim ke client
```

Filtering (`kode`), perhitungan qty (flat vs `warna[].qty`), dan SUM per
lokasi sekarang seluruhnya terjadi di database. Client hanya menerima 1
objek berisi 4 angka, bukan ribuan baris `items` jsonb.

---

## 3. Query yang Dihilangkan

| Sebelum | Sesudah |
|---|---|
| 1 query `SELECT location, items FROM sales ... LIMIT 10000` — mengembalikan **s.d. 10.000 baris**, masing-masing berisi array `items` (bisa banyak item per baris) milik SEMUA produk | 1 RPC call — mengembalikan **1 baris jsonb** berisi 4 angka |

Jumlah *query* tetap 1 (tidak ada N+1 di sini), tapi jenis dan ukuran
data yang dikembalikan berubah total: dari "seluruh riwayat transaksi
mentah" menjadi "hasil agregat siap pakai".

---

## 4. Estimasi Pengurangan Payload

Diasumsikan skenario realistis toko fashion kecil-menengah:

| Jumlah baris `sales` (type='sale') | Rata-rata item per baris | Payload lama (perkiraan) | Payload baru |
|---|---|---|---|
| 500 | 2 | ~500 objek × (location+items array) ≈ ratusan KB tergantung isi `items` | < 100 byte (1 objek jsonb `{gudang,cideng,tegalgubug,total}`) |
| 2.000 | 2–3 | beberapa MB | < 100 byte |
| 10.000 (batas `.limit`) | 2–3 | bisa puluhan MB, mendekati batas realistis payload HTTP/browser | < 100 byte |

Payload turun dari **berbanding lurus dengan jumlah total transaksi toko**
(bukan jumlah transaksi produk yang dilihat) menjadi **konstan** (~4
angka), berapa pun jumlah baris `sales` yang ada. Ini adalah pengurangan
paling signifikan dari seluruh kandidat Priority A di audit Phase 1,
karena `fetchSalesByKode` sebelumnya menarik data milik SEMUA produk
hanya untuk menghitung SATU produk.

---

## 5. Estimasi Peningkatan Performa

- **Waktu transfer jaringan**: turun drastis untuk toko dengan riwayat
  transaksi banyak — sebelumnya waktu buka `ProductDetailModal` ikut
  melambat seiring `sales` bertambah (walau produk yang dilihat sama),
  sekarang waktu respons RPC relatif stabil (dibatasi oleh index scan +
  agregasi server, bukan ukuran payload jaringan).
- **Beban parsing JS di browser**: sebelumnya browser admin harus
  mem-parsing & iterasi ribuan objek `items` jsonb per buka modal —
  sekarang nol, hanya menerima hasil jadi.
- **Beban database**: bertambah sedikit (agregasi dipindah dari client
  ke server), tapi ini pertukaran yang wajar — server database jauh
  lebih efisien untuk operasi scan+filter+sum dibanding mengirim data
  mentah lewat jaringan lalu diproses di JS.
- **Catatan**: karena RPC ini masih melakukan **full scan** tabel
  `sales` (memindai SEMUA baris `type='sale'`, bukan hanya yang memuat
  `kode` yang dicari — sebab `kode` ada di dalam array `items` jsonb,
  bukan kolom biasa yang bisa di-index langsung), keuntungan performa
  utamanya ada di **pengurangan payload jaringan & parsing client**,
  BUKAN di pengurangan I/O baca tabel di sisi database (yang secara
  jumlah baris dipindai kurang lebih sama seperti query lama). Kalau di
  fase berikutnya volume `sales` bertambah sangat besar dan latensi RPC
  ini mulai terasa, opsi lanjutan (di luar scope task ini) adalah indeks
  GIN pada `items` atau tabel ringkasan terpisah — tidak diimplementasikan
  di sini karena melanggar batasan "jangan membuat index/view baru" di
  luar scope yang diminta.

---

## 6. Risiko Migration

1. **`LIMIT 10000` sengaja dipertahankan.** Batas ini murni warisan dari
   workaround "default Supabase 1000 baris" di kode lama, BUKAN aturan
   bisnis. Secara arsitektur RPC baru ini sudah tidak butuh batas
   tersebut (tidak ada lagi masalah payload-ke-client). Tapi karena
   instruksi eksplisit meminta hasil identik dengan implementasi
   sekarang, batas ini dipertahankan apa adanya — kalau toko sudah
   punya lebih dari 10.000 transaksi `type='sale'`, riwayat penjualan
   yang ditampilkan tetap TIDAK mencakup semuanya, sama persis seperti
   sebelum migration ini (bukan regresi baru, tapi juga bukan perbaikan).
   Menghapus limit ini adalah langkah wajar untuk fase berikutnya, tapi
   sengaja tidak dilakukan di sini.
2. **Numeric cast dibungkus `EXCEPTION WHEN OTHERS`** pada parsing
   `qty` (baik flat maupun di dalam `warna[]`) — supaya nilai yang tidak
   bisa dibaca sebagai angka (string kosong, teks, dll.) di-treat sebagai
   0, PERSIS seperti `Number(x) || 0` di JavaScript yang tidak pernah
   error. Tanpa penanganan ini, `(item->>'qty')::numeric` di Postgres AKAN
   error kalau isinya bukan format angka valid — beda dari JS. Ini
   bukan perubahan behaviour, melainkan cara PL/pgSQL mereplikasi
   toleransi JS terhadap data kotor.
3. **Simplifikasi satu edge-case yang secara harfiah ada di kode JS
   lama**: `sale.location in counts` (JS) memakai operator `in` pada
   objek `{gudang,cideng,tegalgubug,total}` — secara harfiah, kalau
   `sale.location` kebetulan bernilai string `"total"`, kondisi itu JUGA
   lolos (karena `"total"` adalah salah satu key objek `counts`), dan
   akan menambah `counts.total` DUA KALI (sekali via `counts[location]
   += qty`, sekali lagi via baris `counts.total += qty` di bawahnya).
   Ini murni artefak struktur kode, bukan aturan bisnis yang disengaja —
   kolom `sales.location` di skema hanya pernah diisi `gudang`/`cideng`/
   `tegalgubug` (tidak pernah `"total"`). RPC ini memakai
   `location IN ('gudang','cideng','tegalgubug')` yang secara fungsional
   identik untuk 100% data nyata, dan diungkapkan secara transparan di
   sini sesuai instruksi validasi #5.
4. **`SECURITY INVOKER`** — RPC mengandalkan RLS `sales` yang sudah
   mengizinkan role `authenticated` untuk SELECT (terverifikasi ada di
   migration existing, `anon` tidak punya akses ke `sales` sama sekali,
   konsisten dengan behaviour lama).
5. **Tidak ada perubahan skema** — memenuhi syarat "jangan membuat
   index/view/constraint/trigger baru" secara ketat. Tabel `sales`,
   `items` jsonb, dan seluruh kolom lain tidak disentuh.
6. **Gap dokumentasi yang ditemukan (bukan disebabkan migration ini)**:
   audit menemukan `apps/pos/src/features/penjualan/hooks.js` membaca/
   menulis kolom `supabase_id`, `status`, `edit_history` pada tabel
   `sales` yang TIDAK terdaftar di migration manapun di repo (kemungkinan
   ditambahkan manual lewat Supabase Dashboard). RPC ini tidak
   menyentuh kolom-kolom tersebut sama sekali (hanya membaca `type`,
   `location`, `items`), jadi tidak terdampak — dicatat di sini murni
   sebagai informasi tambahan yang ditemukan saat audit skema.

---

## 7. Cara Testing Manual

1. **Jalankan migration**
   `supabase/migrations/20260711_migration_phase1_rpc_sales_summary_by_product.sql`
   di Supabase SQL Editor.
2. **Verifikasi fungsi terdaftar:**
   ```sql
   SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_sales_summary_by_product';
   SELECT grantee, privilege_type FROM information_schema.routine_privileges
   WHERE routine_name = 'get_sales_summary_by_product';
   ```
3. **Bandingkan hasil dengan cara manual** — pilih satu `kode` produk
   yang sudah punya riwayat penjualan campuran (ada yang berwarna, ada
   yang tidak, dari lebih dari satu lokasi), lalu jalankan:
   ```sql
   SELECT public.get_sales_summary_by_product('D-01-OSK');
   ```
   Bandingkan angkanya dengan hasil `fetchSalesByKode('D-01-OSK')` versi
   LAMA (bisa dites di branch sebelum migration, atau hitung manual dari
   tabel `sales` untuk kode tersebut) — harus identik.
4. **Skenario di UI** — buka halaman Admin → Produk → klik salah satu
   kartu produk untuk membuka `ProductDetailModal` → cek seksi
   "Riwayat Penjualan" menampilkan angka Gudang/Cideng/Tegalgubug/Total
   yang masuk akal (bandingkan dengan data yang sudah diketahui, mis.
   dari halaman Laporan POS untuk produk yang sama).
5. **Skenario produk tanpa riwayat** — buka produk yang belum pernah
   terjual, pastikan seksi Riwayat Penjualan menampilkan semua nol,
   tidak error.
6. **Skenario RPC gagal** (simulasi) — matikan sementara akses (mis.
   revoke EXECUTE dari `authenticated`), buka modal produk, pastikan
   TIDAK ada error yang terlihat user, seksi Riwayat Penjualan tetap
   menampilkan nol (graceful degradation, sama seperti versi lama),
   cek console browser ada log `[fetchSalesByKode] error: ...`.
7. **Jalankan unit test**: `npm run test:admin -- --run apps/admin/src/features/produk/api.test.js`
   — sudah diverifikasi 20/20 lulus pada sesi ini, termasuk 5 skenario
   baru untuk `fetchSalesByKode` (parameter RPC benar, hasil diteruskan
   apa adanya, data null → fallback nol, error RPC → fallback nol +
   log, field parsial dari RPC → fallback nol per-field).

---

## 8. Hal yang Sengaja Tidak Diubah

- **Signature `fetchSalesByKode(kode)`** — tetap sama persis, sehingga
  `apps/admin/src/features/produk/queries.js` (`useSalesByKodeQuery`)
  dan `hooks.js` (`useSalesByKode`) **tidak disentuh sama sekali**.
- **Komponen React** (`ProductDetailModal.jsx`, dll.) — tidak ada satu
  baris pun diubah.
- **Kontrak "tidak pernah throw"** — fungsi tetap menangkap error RPC
  secara internal dan mengembalikan objek nol, persis seperti sebelumnya,
  supaya `useSalesByKodeQuery`/`useSalesByKode` (yang tidak menangani
  error khusus) tetap berperilaku sama.
- **Filter `type = 'sale'`** — retur (`type='retur'`) tetap TIDAK
  dihitung, sama seperti kode lama.
- **`LIMIT 10000`** — dipertahankan apa adanya, lihat §6 poin 1.
- **Edge-case `sale.location in counts` yang literal termasuk string
  `"total"`** — disederhanakan jadi `location IN ('gudang','cideng',
  'tegalgubug')` karena secara fungsional identik pada semua data nyata;
  diungkapkan secara eksplisit di §6 poin 3, bukan "diperbaiki" secara
  diam-diam.
- **RPC lain** — tidak ada yang diimplementasikan. Kandidat Priority A
  lain dari audit Phase 1 (`fetchStokMap`, `fetchProduksiBatches`,
  `fetchProduksiBatchesTotal`) dibiarkan seperti semula.

---

## Ringkasan File yang Diubah

| File | Perubahan |
|---|---|
| `supabase/migrations/20260711_migration_phase1_rpc_sales_summary_by_product.sql` | **BARU** — definisi `get_sales_summary_by_product()` + GRANT |
| `apps/admin/src/features/produk/api.js` | `fetchSalesByKode()` diringkas jadi 1 pemanggilan `supabase.rpc(...)`, kontrak error-handling (tidak pernah throw, fallback nol) dipertahankan |
| `apps/admin/src/features/produk/api.test.js` | `describe("fetchSalesByKode")` ditulis ulang: 5 test baru (parameter RPC, passthrough hasil, data null, error RPC, field parsial) menggantikan 2 test lama yang menguji query `.from("sales")` langsung yang sudah tidak ada |

`apps/admin/src/features/produk/api.test.js` sudah dijalankan dan
**20/20 test lulus**. Saat menjalankan test suite `apps/admin` yang lebih
luas untuk memeriksa regresi, ditemukan 4 test GAGAL di file yang **sama
sekali tidak disentuh** perubahan ini (`WarnaSection.test.jsx`,
`BahanPickerModal.test.jsx`, dan 2 test di `ProductDetailModal.test.jsx`
yang terkait rendering tabel STOK, bukan seksi Riwayat Penjualan) —
dikonfirmasi lewat `git diff` menunjukkan nol perubahan pada
ketiga file tersebut, sehingga kegagalan itu adalah masalah pre-existing
di luar scope task ini, bukan regresi dari migration ini.
