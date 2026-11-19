# Audit M4 — apps/admin (pre-porting)

> Dibuat 2026-11-19, sebelum porting `apps/admin` ke TS + Edge Functions
> dimulai, sesuai aturan "Audit & Optimasi DULU" di
> `docs/decisions/stack-rewrite-2026.md` §2. Cakupan: 24 feature folder di
> `apps/admin/src/features/` (naik dari 11 yang terdokumentasi di CLAUDE.md
> sebelum sync pass — 13 fitur baru masuk lewat `master` selama M0-M3
> berjalan) + cross-check RLS/policy di level database.

## Ringkasan

Secara arsitektur, admin **jauh lebih bersih dari dugaan** untuk app
seukuran ini (24 fitur, ±41k baris di `features/` saja): nyaris tidak ada
pelanggaran Dependency Inversion, nol komponen yang manggil `supabase`
langsung di luar pola yang sudah disahkan, dan dead code cuma 3 hook
export yang gak kepake. Temuan nyata ada di 3 kategori: file yang jauh
melebihi guideline 200 baris (beberapa 4-5x lipat), beberapa duplikasi
logic kecil yang gampang dibereskan pas porting, dan 2 isu arsitektur
nyata yang butuh keputusan sebelum nulis Edge Function-nya (bukan cuma
"port apa adanya").

## 1. Dependency Inversion

Hampir sempurna. Satu-satunya pelanggaran literal:

- `ngorder/components/PetaTab.jsx:9` — import `buildWaLink` dari
  `"../../blast/utils"` langsung, bukan dari barrel `"../../blast"`
  (yang re-export simbol yang sama lewat `hooks.js`). Mekanis, gak ada
  risiko logic, tinggal ganti 1 baris import pas porting `ngorder`.

Tidak ada pelanggaran `api.js`/`store.js`/`queries.js` diimpor langsung
dari komponen manapun di 24 fitur yang diaudit.

## 2. Panggilan `supabase` di luar `api.js`

Bersih di semua 24 fitur. Satu-satunya hit:
`produk/components/AdminPage.jsx:5,84` — `import { supabase }` langsung
buat Realtime subscription (`.channel()`/`.removeChannel()`) notifikasi
transfer. Ini pengecualian yang sudah disahkan (Realtime, bukan
fetch/write), bukan pelanggaran — dicatat aja biar gak dikira kelewat pas
porting.

## 3. Dead code (exported, nol pemakai di luar fitur sendiri)

**✅ SUDAH DIHAPUS (2026-11-19, konfirmasi user)**:

- `produksi-sampel/hooks.js` `useLanjutWorkOrder` — sekaligus
  `lanjutKeWorkOrder` di `api.js` (fully dead end-to-end, gak dipanggil
  dari mana pun lagi setelah hook-nya dihapus).
- `produksi-sampel/hooks.js` `useCreateSampels` — sekaligus
  `createSampels` di `api.js` (sama, fully dead end-to-end).
- `produksi-jahit/hooks.js` `useCreateJahitCardsForBatch` — HANYA hook +
  mutation wrapper-nya. `createJahitCardsForBatch` di `api.js` TETAP ADA
  karena dipanggil langsung dari `produksi-record/api.js` (komposisi
  lintas-fitur `api.js`-ke-`api.js`, bukan lewat hook yang dihapus).

## 4. Overlap / duplikasi

**Kecil, aman dibereskan pas porting (bukan keputusan besar):**

- `fmtRp(n)` ditulis ulang byte-identik di `produksi-bahan/utils.js:1`,
  `produksi-hpp/utils.js:1`, `produksi-record/utils.js:3` — ketiganya
  `"Rp " + (Number(n)||0).toLocaleString("id-ID")`. `formatHarga()` di
  `packages/shared/lib/constants.ts` **bukan pengganti 1:1** (balikin `""`
  utk 0/NaN, gak ada prefix "Rp ") — butuh helper shared baru, bukan
  reuse `formatHarga` apa adanya.
- `produksi-record/utils.js:21` `buildKode`/`parseKode` duplikat versi
  shared, beda null-handling (`String(x ?? "")` vs shared yang asumsi
  non-null).
- `history/utils.js:332,334` hand-roll `` `Rp ${n.toLocaleString("id-ID")}` ``
  padahal bisa pakai `formatHarga` yang sudah ada.

**Nyata, butuh keputusan sebelum desain Edge Function (lihat §7):**

- `cmt/api.js` (baris 31, 97, 149) baca/tulis tabel `jahit_cards`
  LANGSUNG, paralel sama `produksi-jahit/api.js` yang juga punya tabel
  yang sama — bukan lewat fungsi `produksi-jahit`. Dua fitur, query
  logic independen, 1 tabel. Risiko drift kalau salah satu berubah tanpa
  yang lain ikut.
- Dua tracker "sudah dikunjungi" yang gak sinkron: `ngorder_trip.toko[].dikunjungi`
  (checklist per-trip, `ngorder-jadwal`) vs tabel `toko_kunjungan` (shared,
  Realtime, `ngorder` tab Peta). Centang toko di satu tempat gak
  mempengaruhi yang lain.

**Dicek, TERNYATA BUKAN duplikasi** (good, gak perlu konsolidasi):

- `pelanggan` vs `calon-customer` — tabel beda, lifecycle beda (customer
  vs prospek), `calon-customer` memang sengaja bisa diakses 2 cara (route
  sendiri + tab di dalam `PelangganPage`).
- `analytics` vs `trafik-katalog` — nol overlap tabel. `analytics` =
  bisnis (revenue/produk/pasar/customer/stok/forecast/produksi, RPC
  `analytics_*`). `trafik-katalog` = traffic katalog publik (QR/referrer,
  RPC `get_visit_stats`).

## 5. File yang jauh melebihi guideline ~200 baris

Paling parah (kandidat refactor pas porting, bukan blocker):

| File | Baris | Catatan |
|---|---|---|
| `produksi-hpp/components/HPPForm.jsx` | 1022 | 5x guideline |
| `ngorder/components/PetaTab.jsx` | 907 | Seluruh integrasi Google Maps (marker/overlay/polyline/geocode/search) dalam 1 file |
| `produksi-sampel/components/ProduksiSampelPage.jsx` | 878 | |
| `produksi-sampel/components/WorkOrderModal.jsx` | 819 | |
| `produksi-record/components/BatchForm.jsx` | 741 | |
| `analytics/hooks.js` | 448 | Agregat logic 10 tab dashboard dalam 1 file (components/tabs/ sudah dipisah per-tab, hooks.js belum) |
| `produk/utils.js` | 407 | Campur formatting + badge logic + WA-share + filter/sort |
| `AdvancedTab.jsx` (analytics) | 429 | |
| `ProductionTab.jsx` (analytics) | 422 | |
| `produk/api.js` | 302 | Campur CRUD + cascade-delete + history logging + stok/HPP side-effect |
| `analytics/queries.js` | 262 | |

Ditambah ~22 file lain 200-430 baris, mayoritas di grup produksi-*
(grup paling banyak melanggar guideline ini).

## 6. Hal lain

- `buku-potongan/api.js` dan `stok-opname/api.js` sama-sama nyentuh
  `expected_stok`/`stok_warna` tanpa transaction wrapping yang kelihatan
  di layer JS (andalkan upsert single-row, bukan atomicity multi-row) —
  kemungkinan sudah tercakup desain RPC di `migration-plan.md`, perlu
  dicek ulang pas desain RPC-nya, bukan temuan baru.
- Tidak ada TODO/FIXME/XXX yang nunjukin kerja belum selesai di fitur
  manapun yang diaudit.

## 7. Temuan level database (dicek langsung lewat `pg_policies`/advisor, bukan baca migrasi lama)

**✅ SUDAH DIBERESKAN (2026-11-19)** — `products` dan `product_history`
masing-masing punya SEPASANG RLS policy yang persis sama fungsinya
(dibuat di 2 migrasi beda, gak ada yang nyadar sudah ada):

| Tabel | Command | Policy duplikat |
|---|---|---|
| `products` | SELECT | "Auth: read products" + "Authenticated users can read products" |
| `products` | INSERT | "Auth: insert products" + "Authenticated users can insert products" |
| `products` | UPDATE | "Auth: update products" + "Authenticated users can update products" |
| `products` | DELETE | "Auth: delete products" + "Authenticated users can delete products" |
| `product_history` | SELECT | "Auth: read history" + "Authenticated users can read history" |
| `product_history` | INSERT | "Auth: insert history" + "Authenticated users can insert history" |

Postgres meng-OR semua policy permissive, jadi duplikat ini TIDAK
mengubah behavior apapun — murni overhead evaluasi tiap query. Sudah
dihapus salah satu dari tiap pasangan (yang berpenamaan "Auth: ...",
karena pola itu cuma muncul di 6 policy ini, sementara "Authenticated
users can ..." konsisten dipakai di tabel lain juga). Diverifikasi
lewat `pg_policies` setelahnya — sisa 1 policy per aksi, kecuali SELECT
di `products` yang memang sengaja 2 (role `public` utk Catalog + role
`authenticated`, beda target, bukan duplikat).

**Butuh keputusan terpisah (bukan blocker M4), dicatat biar gak hilang:**

- `v_stok_bahan` adalah `SECURITY DEFINER` VIEW (flag ERROR dari linter
  Supabase sendiri) — kemungkinan sengaja (butuh baca lintas
  `bahan_pembelian`/`bahan_pinjam` lepas dari RLS caller), tapi belum
  pernah ada keputusan eksplisit soal ini.
- 63 RLS policy di seluruh database pakai `auth.uid()`/`auth.role()`
  TANPA dibungkus `(select auth.uid())` — anti-pattern performa yang
  diflag linter Supabase sendiri (`auth_rls_initplan`), re-evaluate
  per-row bukan per-query. Terlalu besar buat dibereskan sekarang
  (nyentuh hampir semua tabel) — masuk ke task existing "Full RLS audit
  across all ~70 tables", bukan scope M4.
- 2 overload RPC `track_visit` (satu dengan parameter geo, satu tanpa) —
  kemungkinan versi lama jadi dead code sejak `trackVisit()` di catalog
  pindah ke `/api/track` (selalu kirim geo). Belum dicek pemakaian
  nyata — domain catalog/trafik-katalog, bukan admin, dicatat aja.
- 7 tabel RLS enabled TANPA policy sama sekali (`app_notifications`,
  `notification_reads`, `notification_state`, `product_achievements`,
  `product_badge_log`, `visit_events`, `visit_internal_visitors`) —
  **dicek, ini BUKAN bug**: semua akses lewat RPC `SECURITY DEFINER`
  (`get_my_notifications`, `mark_notifications_seen`, dst), konfirmasi
  fork audit `notifikasi`/`analytics` tidak ada yang coba
  `supabase.from()` langsung ke tabel-tabel ini.

## 8. Tabel yang disentuh per fitur (referensi utk desain Edge Function M4)

| Fitur | Tabel/RPC |
|---|---|
| produk | `products`, `stok_warna`, `produksi_batch`, `expected_stok`, `hpp_template` |
| stok-opname | `stok_warna`, `v_jahit_dikerjakan` (read) |
| transfer | `transfers`, `product_history` (via `@deera/shared/features/transfers`) |
| buku-potongan | `stok_warna`, `expected_stok` |
| pindah-stok-lokasi | `stok_warna` (RPC `move_stok_lokasi`) |
| history | `product_history` |
| produksi-bahan | `bahan_pembelian`, `bahan_pinjam`, `v_stok_bahan` |
| produksi-hpp | `hpp_config`, `hpp_template` |
| produksi-record | `expected_stok`, `hpp_template`, `products`, `produksi_batch`, `stok_warna` |
| produksi-sampel | `sampel` |
| produksi-jahit | `jahit_cards` |
| cmt | `cmt_full_kirim`, `cmt_jahit_kirim`, `cmt_setoran_full`, `jahit_cards` (shared, lihat §4), `stok_masuk_log`, RPC `increment_stok_gudang` |
| ngorder | `sampel_kiriman`, `sampel_kiriman_item`, `toko`, `toko_kunjungan` |
| ngorder-jadwal | RPC `get_ngorder_trip_opens` |
| pasar-restock | RPC `get_pasar_restock` |
| pelanggan | `pelanggan`, `sales` |
| calon-customer | `calon_customer` |
| blast | `blast_campaign`, `blast_message_template`, `blast_target` |
| analytics | RPC `analytics_*` (10 fungsi) + `get_tagihan_jatuh_tempo` |
| trafik-katalog | RPC `get_visit_stats` |
| notifikasi | RPC `get_my_notifications`, `mark_notifications_seen`, `mark_notification_read` |
| cetak-label | tidak ada (pakai hooks `produk`, render/print client-side) |
| pengiriman | tabel `pengiriman` |
| auth | tidak ada langsung (delegasi ke `@deera/shared/features/auth`) |
