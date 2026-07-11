# Migration Roadmap — Business Logic Frontend → Supabase

**Peran:** Principal Software Engineer + Supabase Database Architect
**Cakupan:** `apps/catalog`, `apps/admin`, `apps/pos`, `apps/finance`, `packages/shared`
**Sifat dokumen:** Roadmap analisis saja — **tidak ada kode yang diimplementasikan** di sesi ini.
**Tanggal:** 2026-07-11

---

## 1. Ringkasan Eksekutif

Saya menelusuri seluruh layer `api.js`, `utils.js`, dan `hooks.js` di keempat aplikasi plus `packages/shared` — total lebih dari 40 file — untuk mencari logika bisnis (kalkulasi, agregasi, filtering, workflow, validasi) yang saat ini berjalan di browser, padahal seharusnya (atau lebih aman) berjalan di database.

Temuan dikelompokkan jadi tiga tingkat urgensi:

- 🔴 **Kritis (celah integritas data)** — ada race condition nyata pada data uang/stok karena pola "baca nilai sekarang di client → hitung nilai baru → tulis balik", tanpa transaksi atomik di database. Ditemukan di **3 tempat independen**: approve transfer stok (admin), pengurangan stok saat transaksi kasir (POS), dan pelunasan kasbon/potongan gajian (finance). ini bukan bug teoretis — pola ini sudah persis penyebab bug transaksi duplikat POS yang saya perbaiki sebelumnya di sesi ini.
- 🟠 **Tinggi (kalkulasi finansial tidak diverifikasi server)** — nilai uang (HPP, upah gaji, total transaksi) dihitung sepenuhnya di client dan **dipercaya begitu saja** saat disimpan ke Supabase. Tidak ada yang mencegah nilai yang salah/tidak konsisten tersimpan.
- 🟡 **Sedang** — agregasi/laporan yang menarik ratusan–ribuan baris ke browser hanya untuk dijumlah/dikelompokkan, padahal SQL bisa melakukannya jauh lebih cepat dan dengan bandwidth jauh lebih kecil.
- 🟢 **Rendah / sebaiknya TETAP di frontend** — formatting tanggal/rupiah, state UI (cart, modal, draft), styling — ini murni presentation logic, memindahkannya ke Supabase justru menambah kompleksitas tanpa manfaat.

Catatan penting: codebase ini **sudah punya preseden** pemakaian Supabase di luar CRUD dasar — `v_stok_bahan` (VIEW agregasi bahan) dan `get_sold_out_kodes` (RPC dipakai di `apps/catalog`) sudah berjalan production. Jadi rekomendasi di dokumen ini bukan pola baru bagi tim, melainkan **perluasan pola yang sudah terbukti**.

---

## 2. Pola Lintas-Aplikasi (Cross-Cutting Patterns)

Tiga pola berikut muncul berulang di banyak fitur — dijelaskan sekali di sini, lalu direferensikan di temuan per-fitur supaya tidak diulang-ulang.

### Pola A — "Read-Modify-Write" tanpa transaksi (race condition)
```
1. SELECT nilai_sekarang FROM tabel WHERE id = X
2. nilai_baru = nilai_sekarang + delta   (dihitung di JavaScript)
3. UPDATE tabel SET kolom = nilai_baru WHERE id = X
```
Antara langkah 1 dan 3 ada jeda (network round-trip). Kalau dua pengguna melakukan ini bersamaan pada baris yang sama, salah satu update akan **menimpa** update yang lain tanpa error — perubahan yang satu hilang begitu saja. Ini persis pola akar masalah bug transaksi duplikat POS yang sudah diperbaiki sebelumnya di percakapan ini (`syncSalesForRange`), hanya saja di sini terjadi pada **nilai stok dan nilai uang**, bukan pada insert baris baru.

**Solusi standar:** ganti dengan satu statement atomik di Postgres, misalnya `UPDATE tabel SET kolom = kolom + $delta WHERE id = $id RETURNING *` — Postgres menjamin ini atomik di level baris tanpa perlu `SELECT` terpisah. Kalau perlu validasi (misalnya "tidak boleh minus"), tambahkan `WHERE kolom + $delta >= 0` dan cek jumlah baris yang ter-update.

### Pola B — Cascading write multi-tabel tanpa transaksi
Beberapa alur kerja (hapus produk, hapus periode gajian, approve transfer, gabung entri duplikat) melakukan 3–7 operasi Supabase **berurutan** dari client. Kalau operasi ke-3 dari 5 gagal (koneksi putus, RLS menolak, dsb), dua operasi pertama sudah ter-commit dan tidak bisa di-rollback — hasilnya data yatim (orphan) di beberapa tabel.

**Solusi standar:** RPC (Postgres function) yang membungkus semua langkah dalam satu `BEGIN...COMMIT` implisit (function Postgres otomatis transaksional), atau constraint `ON DELETE CASCADE` di foreign key untuk kasus hapus.

### Pola C — Agregasi dilakukan di JavaScript setelah fetch semua baris
Banyak laporan/dashboard melakukan `.reduce()`, `.filter()`, `.group by` manual di JavaScript setelah menarik **seluruh** baris relevan (kadang eksplisit `.limit(10000)` atau `.range(0, 9999)`) ke browser. Ini works untuk data kecil sekarang, tapi tidak scalable — dan setiap kali halaman dibuka, seluruh histori ditarik ulang lewat jaringan.

**Solusi standar:** SQL VIEW (untuk agregasi yang selalu sama) atau RPC dengan parameter (untuk agregasi yang butuh filter tanggal/kategori), memakai `SUM`/`COUNT`/`GROUP BY` di database — Postgres menghitung jauh lebih cepat dan hanya mengirim hasil akhir (beberapa baris), bukan data mentah (ribuan baris).

---

## 3. Temuan per Aplikasi

### 3.1 `apps/admin`

#### 3.1.1 🔴 Approve Transfer Stok — race condition + validasi bisa dilewati
**File:** `packages/shared/features/transfers/api.js` → `approveTransfer()`

**1. Implementasi saat ini:** Saat admin menyetujui transfer, kode melakukan: update status transfer → lalu **loop per item**, tiap item: `SELECT` baris `stok_warna` → hitung `newVal = current - qty` (atau `+qty` untuk lokasi tujuan) di JavaScript → `UPDATE` baris itu. Validasi bisnis ("tidak boleh approve transfer buatan sendiri", "transfer harus berstatus pending") juga hanya dicek di JavaScript sebelum request dikirim.

**2. Kenapa harus pindah ke Supabase:** Ini Pola A + Pola B sekaligus. Dua admin yang approve dua transfer berbeda yang kebetulan menyentuh item stok yang sama, di waktu yang berdekatan, bisa saling menimpa hasil kalkulasi masing-masing — stok akhir jadi salah tanpa ada error yang terlihat. Selain itu, validasi "tidak approve punya sendiri" hanya kosmetik di client — siapa pun yang punya akses `anon`/`authenticated` key bisa memanggil Supabase langsung dan melewatinya.

**3. Rekomendasi implementasi:** **RPC** `approve_transfer(transfer_id uuid, approver_email text)` — satu function Postgres yang: (a) `SELECT ... FOR UPDATE` baris transfer untuk lock, (b) validasi status & bukan pembuat sendiri di dalam function (raise exception kalau gagal — otomatis membatalkan seluruh transaksi), (c) loop item di dalam PL/pgSQL memakai `UPDATE stok_warna SET kolom_lokasi = GREATEST(0, kolom_lokasi + delta)`, (d) update status transfer + insert ke `product_history`, semua dalam satu transaksi.

**4. Peningkatan performa:** Dari ±(1 + 2×N item) round-trip jaringan menjadi 1 pemanggilan RPC — untuk transfer 10 item, dari ~21 request jadi 1.

**5. Peningkatan maintainability:** Business rule ("tidak approve transfer sendiri", dsb.) jadi satu sumber kebenaran di database, bukan tersebar dan bisa didobel-implementasi beda antara admin web dan kemungkinan aplikasi lain di masa depan.

**6. Kompleksitas:** Sedang — perlu PL/pgSQL dengan loop dan row locking, tapi polanya sudah baku.

**7. Prioritas migrasi:** **Tertinggi (P0)** — ini menyentuh integritas stok fisik, dan sudah terbukti codebase punya pola race condition serupa yang benar-benar terjadi di produksi (bug duplikat POS).

---

#### 3.1.2 🔴 Pengurangan Stok saat Transaksi Kasir — race condition (lihat §3.2.1, ditulis sekali di sana karena akar masalahnya sama persis dengan §3.1.1 tapi di `apps/pos`).

---

#### 3.1.3 🟠 Kalkulasi HPP (Harga Pokok Produksi) — mesin pricing di client
**File:** `apps/admin/src/features/produksi-hpp/utils.js` → `calcTotal()`, `calcQtyPerBaju()`, `convertUnit()`

**1. Implementasi saat ini:** `calcTotal()` menjumlahkan biaya kain (dengan konversi satuan yard/meter/cm), biaya kancing + kancing tambahan, dan 8+ komponen biaya tetap (plastik, hangtag, poin karyawan, dst dari tabel `hpp_config`) — seluruhnya di JavaScript. Hasilnya (`total_hpp`) disimpan ke `hpp_template.total_hpp` dan disalin ke `products.hpp`, yang kemudian jadi basis kalkulasi profit di semua laporan (POS, BEP, laporan produksi).

**2. Kenapa harus pindah ke Supabase:** `total_hpp` adalah **basis biaya (COGS)** yang dipakai lintas-aplikasi untuk menghitung profit — kalau logikanya berubah/berbeda antara satu tempat pemanggilan dengan tempat lain (misalnya kalkulator cepat `KalkulatorHPP` di halaman yang sama punya rumus terpisah yang bisa saja tidak sinkron), profit yang dilaporkan ke pemilik bisnis jadi tidak konsisten. Nilai ini juga tidak divalidasi server — HPP negatif atau HPP yang tidak sesuai `bahan_items` bisa tersimpan tanpa penolakan.

**3. Rekomendasi implementasi:** **SQL Function** murni (bukan RPC yang dipanggil langsung dari client, tapi function yang dipanggil dari dalam trigger) — `calc_hpp_total(bahan_items jsonb, upah_jahit numeric, ..., config jsonb) RETURNS numeric`, dipasang sebagai **Trigger** `BEFORE INSERT OR UPDATE ON hpp_template` yang menghitung ulang `total_hpp` dari kolom-kolom sumber, sehingga nilai yang tersimpan **selalu** hasil hitungan server, bukan kiriman client. Kalkulator cepat di UI (`KalkulatorHPP`) tetap boleh dihitung di client untuk *preview* real-time (UX), tapi nilai yang benar-benar tersimpan wajib lewat trigger ini.

**4. Peningkatan performa:** Minimal (kalkulasinya ringan) — manfaat utamanya bukan performa.

**5. Peningkatan maintainability:** **Besar** — satu rumus HPP untuk seluruh sistem, tidak mungkin drift antara UI kalkulator, form simpan template, dan proses batch produksi.

**6. Kompleksitas:** Sedang — perlu menerjemahkan logika `convertUnit` (tabel konversi yard/meter/cm) ke PL/pgSQL, cukup mekanis.

**7. Prioritas migrasi:** **Tinggi (P1)** — bukan celah keamanan langsung, tapi salah hitung HPP berarti salah hitung profit di seluruh sistem pelaporan.

---

#### 3.1.4 🟠 Agregasi Stok per Kode Produk (grid Admin)
**File:** `apps/admin/src/features/produk/api.js` → `fetchStokMap()`

**1. Implementasi saat ini:** Fetch **seluruh** baris `stok_warna` (`select kode, size, gudang, cideng, tegalgubug` tanpa filter), lalu `GROUP BY kode` dan `GROUP BY kode+size` dilakukan manual di JavaScript untuk menampilkan grid produk.

**2. Kenapa harus pindah ke Supabase:** Setiap kali halaman Admin (Produk) dibuka, seluruh tabel `stok_warna` ditarik ke browser walau yang ditampilkan cuma total per produk. Ini akan makin lambat seiring jumlah size×warna×lokasi bertambah.

**3. Rekomendasi implementasi:** **View** `v_stok_per_produk` (`SELECT kode, SUM(gudang) gudang, SUM(cideng) cideng, SUM(tegalgubug) tegalgubug FROM stok_warna GROUP BY kode`) — mengikuti persis pola `v_stok_bahan` yang sudah ada di codebase ini.

**4. Peningkatan performa:** Payload jaringan turun drastis (dari N baris size×warna jadi 1 baris per kode produk); komputasi SUM di Postgres jauh lebih cepat dari `.reduce()` di JS untuk data besar.

**5. Peningkatan maintainability:** Tinggi — logika agregasi didefinisikan sekali di schema, bukan diduplikasi di `fetchStokMap()` DAN `fetchBukuPotonganData()` DAN tempat lain yang butuh agregasi serupa (lihat §3.1.6).

**6. Kompleksitas:** Rendah — `CREATE VIEW` sederhana, tidak butuh parameter.

**7. Prioritas migrasi:** Sedang (P2) — bukan soal integritas data, murni efisiensi.

---

#### 3.1.5 🟠 Riwayat Penjualan per Produk — fetch seluruh tabel `sales` untuk 1 produk
**File:** `apps/admin/src/features/produk/api.js` → `fetchSalesByKode()`

**1. Implementasi saat ini:** Untuk menampilkan "sudah terjual berapa" di modal detail satu produk, kode menarik **sampai 10.000 baris** dari tabel `sales` (`select location, items` tanpa filter kode), lalu loop semua item di semua transaksi untuk mencari yang cocok dengan `kode` produk yang sedang dilihat.

**2. Kenapa harus pindah ke Supabase:** Ini pola paling boros di seluruh audit — membuka detail SATU produk menarik SELURUH histori penjualan toko. Karena `items` adalah kolom `jsonb`, filter di level SQL memang tidak trivial dengan struktur data saat ini, tapi itu justru alasan kuat untuk pindah logikanya ke database (lewat index GIN pada jsonb, atau tabel `sale_items` ternormalisasi).

**3. Rekomendasi implementasi:** **RPC** `get_sales_by_kode(p_kode text) RETURNS TABLE(location text, total_qty int)` yang memakai `jsonb_array_elements(items)` di dalam query dengan filter `WHERE item->>'kode' = p_kode`, dibantu index GIN di kolom `items` (`CREATE INDEX ON sales USING gin (items)`). Untuk jangka panjang, pertimbangkan tabel `sale_items` ternormalisasi (satu baris per item per transaksi) — akan menyelesaikan masalah ini sekaligus mempermudah semua laporan lain yang butuh query per-item (lihat §3.2.3 dan §3.4.1 BEP).

**4. Peningkatan performa:** Dari menarik ribuan baris (berpotensi megabytes) jadi menarik 3 angka (gudang/cideng/tegalgubug). Ini peningkatan performa terbesar di seluruh temuan.

**5. Peningkatan maintainability:** Tinggi — logika "hitung qty efektif dari item.qty vs item.warna[].qty" (duplikat di banyak file sebagai `effectiveQty`) jadi satu definisi di SQL.

**6. Kompleksitas:** Sedang-Tinggi kalau memakai jsonb query; Rendah kalau sekalian normalisasi ke tabel `sale_items`.

**7. Prioritas migrasi:** **Tinggi (P1)** — dampak performa nyata dan akan makin parah seiring histori penjualan bertambah.

---

#### 3.1.6 🟡 Buku Potongan (Expected vs Actual Stok) — join 2 tabel + kalkulasi selisih di client
**File:** `apps/admin/src/features/buku-potongan/api.js`, `utils.js`, komponen `BukuPotonganPage.jsx`

**1. Implementasi saat ini:** Fetch `stok_warna` dan `expected_stok` secara terpisah (`Promise.all`), lalu di komponen React: gabungkan jadi map per kode+size+warna, hitung `selisih = actual - expected` per baris, dan filter "hanya yang selisih" — semuanya di `useMemo` sisi client.

**2. Kenapa harus pindah ke Supabase:** Ini kandidat JOIN + computed column yang sangat rapi — dua tabel yang punya kunci sama (`kode, size, warna`) sebaiknya digabung di database, bukan di-merge manual pakai `Map()` di JavaScript.

**3. Rekomendasi implementasi:** **View** `v_buku_potongan` — `FULL OUTER JOIN` antara `stok_warna` (di-GROUP BY dulu across lokasi) dan `expected_stok`, dengan kolom computed `selisih = actual_qty - expected_qty`.

**4. Peningkatan performa:** Sedang — mengurangi 2 request jadi 1, dan menghapus kebutuhan `useMemo` gabungan yang cukup berat (3 map dibangun ulang tiap render data berubah).

**5. Peningkatan maintainability:** Sedang — `selisihCls`/`selisihLabel` (styling berdasar tanda selisih) tetap di frontend (benar, itu presentation logic), tapi angka `selisih` sendiri sebaiknya bukan hasil hitungan JS.

**6. Kompleksitas:** Rendah-Sedang.

**7. Prioritas migrasi:** Sedang (P2).

---

#### 3.1.7 🟡 Laporan Produksi Bulanan — agregasi + enrichment N+1
**File:** `apps/admin/src/features/produksi-laporan/api.js` (`fetchProduksiBatches`, `fetchProduksiBatchesTotal`), `utils.js` (`calcRingkasan`, `calcBahanUsage`)

**1. Implementasi saat ini:** `fetchProduksiBatches()` fetch batch dalam rentang tanggal, lalu **kondisional** fetch `hpp_template` untuk batch yang belum punya snapshot HPP, **lalu** fetch semua `products` terkait untuk menghitung rata-rata harga jual per produk (dari array `variants`) — tiga tahap fetch berantai. `fetchProduksiBatchesTotal()` menarik **sampai 9999 baris** `produksi_batch` (all-time) hanya untuk dijumlah jadi 3 angka (total batch/baju/modal) di `useProduksiBatchesTotal()`. `calcRingkasan`/`calcBahanUsage` lalu meng-agregasi (SUM, AVG, GROUP BY nama+satuan) hasil fetch itu di JavaScript.

**2. Kenapa harus pindah ke Supabase:** Pola C klasik. `fetchProduksiBatchesTotal` terutama akan makin lambat linear seiring bertambahnya batch produksi dari waktu ke waktu — padahal yang ditampilkan cuma 3 angka ringkasan di StatCard.

**3. Rekomendasi implementasi:** Kombinasi:
   - **Materialized View** `mv_produksi_total_alltime` (refresh via trigger tiap `produksi_batch` berubah, atau cron ringan) untuk angka all-time di §StatCard, menggantikan `fetchProduksiBatchesTotal`.
   - **RPC** `get_laporan_produksi(from_date date, to_date date)` yang mengembalikan hasil `calcRingkasan` + `calcBahanUsage` langsung dari SQL (`SUM`, `AVG`, `GROUP BY nama_bahan, satuan`), menggantikan fetch-lalu-agregasi-di-JS.
   - Enrichment harga_jual rata-rata sebaiknya jadi kolom ter-generate di **View** `v_produk_harga_jual_avg` (`SELECT kode, AVG(harga) FROM products, jsonb_array_elements(variants) ... WHERE harga > 0 GROUP BY kode`), di-JOIN dari RPC di atas — menghapus tahap fetch produk terpisah.

**4. Peningkatan performa:** Signifikan untuk `fetchProduksiBatchesTotal` (dari menarik ribuan baris jadi 1 baris hasil agregat); sedang untuk laporan bulanan (dari 3 round-trip berantai jadi 1 RPC).

**5. Peningkatan maintainability:** Tinggi — `calcRingkasan`/`calcBahanUsage` saat ini murni fungsi pure JS yang gampang diuji tapi juga gampang dilupakan kalau ada laporan baru yang butuh agregasi serupa; SQL VIEW jadi satu sumber kebenaran yang bisa dipakai laporan lain juga.

**6. Kompleksitas:** Sedang untuk RPC bulanan; Sedang-Tinggi untuk materialized view (perlu strategi refresh).

**7. Prioritas migrasi:** Sedang (P2), naik ke Tinggi (P1) begitu volume data produksi mulai terasa lambat di UI.

---

#### 3.1.8 🟡 Deteksi & Gabung Entri Bahan Duplikat
**File:** `apps/admin/src/features/produksi-bahan/api.js` → `detectDupes()`, `mergeDupeGroups()`

**1. Implementasi saat ini:** `detectDupes()` menarik **seluruh baris** `bahan_pembelian`/`bahan_pinjam`, membentuk key komposit (`nama+kode+satuan+tanggal`) di JavaScript, lalu mengelompokkan untuk mencari yang punya >1 anggota. `mergeDupeGroups()` menjumlahkan `jumlah`/`total_harga` grup lalu menghapus baris selain "master" — dieksekusi sebagai loop `await` berurutan per baris, tidak atomik (Pola B).

**2. Kenapa harus pindah ke Supabase:** Deteksi duplikat adalah pekerjaan `GROUP BY ... HAVING COUNT(*) > 1` yang sangat murah di SQL dibanding fetch-semua-lalu-loop di JS. Lebih penting lagi: akar masalahnya adalah **tidak ada constraint yang mencegah duplikat terbentuk sejak awal** — fitur "gabung duplikat" ini pada dasarnya alat pembersih untuk masalah yang seharusnya dicegah di level schema.

**3. Rekomendasi implementasi:**
   - **Constraint** — evaluasi `UNIQUE (nama_bahan, kode_bahan, satuan, tanggal, created_by)` (atau kombinasi yang sesuai konteks bisnis — didiskusikan dulu dengan Denny karena bisa saja dua pembelian di hari sama memang valid) untuk **mencegah** duplikat baru, bukan cuma mendeteksi setelah terjadi.
   - **RPC** `find_duplicate_bahan(table_name text) RETURNS TABLE(...)` untuk mengganti `detectDupes()` — query `GROUP BY` + `HAVING`.
   - **RPC** `merge_duplicate_bahan(group_ids uuid[])` untuk mengganti `mergeDupeGroups()` — SUM + delete dalam satu transaksi.

**4. Peningkatan performa:** Tinggi untuk deteksi (GROUP BY di SQL vs loop JS atas seluruh tabel).

**5. Peningkatan maintainability:** Tinggi — constraint mencegah masalah dari akarnya, mengurangi kebutuhan fitur "gabung duplikat" itu sendiri di masa depan.

**6. Kompleksitas:** Rendah untuk RPC deteksi; perlu diskusi bisnis dulu untuk constraint (apa definisi "duplikat yang valid secara bisnis" vs "duplikat akibat human error").

**7. Prioritas migrasi:** Rendah-Sedang (P3) — fitur ini dipakai sesekali (maintenance), bukan alur kerja harian.

---

#### 3.1.9 🟠 Workflow Status Sampel (draft → approved/rejected)
**File:** `apps/admin/src/features/produksi-sampel/api.js` → `saveBatchDecisions()`

**1. Implementasi saat ini:** Transisi status `draft → approved` atau `draft → rejected` dieksekusi sebagai `Promise.all()` dari banyak `UPDATE` paralel (satu per sampel dalam batch), masing-masing independen — tidak ada transaksi yang membungkus semuanya. Business rule "approved butuh tidak ada rejection_note kosong, rejected wajib ada alasan" divalidasi di komponen React (`BatchApprovalModal`), bukan di database. Tidak ada `CHECK constraint` pada kolom `status` yang membatasi nilai valid.

**2. Kenapa harus pindah ke Supabase:** Kalau `Promise.all()` sebagian gagal (3 dari 5 sampel berhasil di-approve, 2 gagal karena network blip), batch itu berakhir dalam status campur-aduk tanpa mekanisme retry/rollback yang jelas — user hanya melihat pesan error generik. Status sampel juga tidak dijaga oleh constraint apa pun; secara teori sebuah row bisa punya `status` di luar 3 nilai yang valid kalau ada bug di masa depan.

**3. Rekomendasi implementasi:**
   - **Constraint** `CHECK (status IN ('draft','approved','rejected'))` pada tabel `sampel` (kalau belum ada) — pertahanan pertama yang murah.
   - **RPC** `save_sampel_batch_decisions(decisions jsonb, approver_email text)` — loop di dalam PL/pgSQL dalam SATU transaksi, sehingga either seluruh batch ter-approve/reject, atau tidak sama sekali (all-or-nothing, bukan partial).

**4. Peningkatan performa:** Minor (jumlah sampel per batch biasanya kecil).

**5. Peningkatan maintainability:** Tinggi — menghindari state "setengah ter-approve" yang membingungkan secara operasional.

**6. Kompleksitas:** Rendah-Sedang.

**7. Prioritas migrasi:** Sedang (P2).

---

#### 3.1.10 🟢 Audit Log (`product_history` / `logHistory`) — TETAP di frontend, dengan catatan
**File:** `apps/admin/src/features/history/api.js`

**Kenapa TIDAK perlu pindah:** `logHistory()` adalah insert sederhana (bukan kalkulasi/agregasi) dan sengaja didesain **best-effort** (`catch` lalu `console.warn`, tidak pernah `throw`) supaya kegagalan mencatat log tidak membatalkan aksi utama. Ini justru pola yang tepat untuk audit log non-kritis. Satu catatan: karena dipanggil terpisah dari operasi utamanya (bukan dalam transaksi yang sama), ada kemungkinan kecil operasi utama sukses tapi log gagal tercatat (silent gap di audit trail). Kalau ke depan kepatuhan audit trail jadi prioritas, pertimbangkan memindahkan `logHistory` ke dalam **Trigger** `AFTER INSERT/UPDATE/DELETE` di tabel-tabel terkait — supaya log terjamin tercatat tanpa bergantung pada client memanggil fungsi terpisah. Untuk saat ini, prioritas migrasi **Rendah (P4)** — bukan risiko mendesak.

---

### 3.2 `apps/pos`

#### 3.2.1 🔴 Pengurangan Stok saat Transaksi Kasir — race condition + tidak ada validasi "cukup stok"
**File:** `apps/pos/src/lib/sync.js` → `applyStokToSupabase()`

**1. Implementasi saat ini:** Persis Pola A — untuk tiap item di keranjang: `SELECT` nilai stok lokasi sekarang → `newVal = Math.max(0, current + delta)` dihitung di JavaScript → `UPDATE`. Nilai negatif "diselamatkan" jadi 0 secara diam-diam (`Math.max(0, ...)`) alih-alih ditolak sebagai error.

**2. Kenapa harus pindah ke Supabase:** Ini yang paling kritis dari semua temuan, karena POS bersifat **offline-first** — dua kasir di dua lokasi berbeda bisa sama-sama melihat "stok tersisa 1" dari cache lokal masing-masing yang belum ter-sync, lalu sama-sama menjual unit terakhir itu. Saat online kembali, kedua transaksi sama-sama mengurangi stok dari nilai yang sudah stale — salah satu pengurangan akan "hilang" tertimpa yang lain (Pola A), ATAU keduanya berhasil dan stok jadi minus yang lalu di-clamp jadi 0, **menyembunyikan** fakta bahwa toko baru saja oversold tanpa ada catatan/alert. Pemilik bisnis tidak akan pernah tahu ini terjadi kecuali stok opname manual menemukan selisih.

**3. Rekomendasi implementasi:** **RPC** `apply_stok_adjustments(adjustments jsonb) RETURNS jsonb` — satu pemanggilan per transaksi (bukan loop per item dari client), di dalam PL/pgSQL memakai `UPDATE stok_warna SET kolom = kolom + delta WHERE kode=... AND size=... AND warna=... RETURNING kolom` untuk tiap item (atomik per baris karena `UPDATE` Postgres row-level locking otomatis). **Jangan** clamp ke 0 secara diam-diam — kalau ingin izinkan stok minus sementara (oversell lalu dikoreksi manual), biarkan nilainya minus dan tampilkan sebagai peringatan di UI Stok Opname; kalau ingin cegah oversell, tambahkan `WHERE kolom + delta >= 0` dan kembalikan daftar item yang gagal (`insufficient_stock`) supaya kasir tahu real-time.

**4. Peningkatan performa:** Dari N request sekuensial (2 per item: select+update) jadi 1 RPC per transaksi.

**5. Peningkatan maintainability:** Kritis — ini satu-satunya cara membuat angka stok bisa dipercaya sepenuhnya. Saat ini stok yang ditampilkan berpotensi salah tanpa ada indikasi apa pun ke pengguna.

**6. Kompleksitas:** Sedang. Perlu hati-hati karena POS offline-first — RPC ini dipanggil dari `applyStokToSupabase()` yang SUDAH berjalan best-effort (retry saat online lagi), jadi kontrak "apa yang terjadi kalau RPC gagal sebagian" perlu didesain matang (idealnya idempotent, karena `flushPendingSales()` bisa retry).

**7. Prioritas migrasi:** **Tertinggi (P0)** — bersama §3.1.1, ini dua temuan dengan risiko finansial langsung tertinggi di seluruh audit.

---

#### 3.2.2 🟠 Total Transaksi (subtotal − diskon) — dihitung & dipercaya dari client
**File:** `apps/pos/src/features/kasir/hooks.js` (`useCart`), `apps/pos/src/features/penjualan/hooks.js` (`useUpdateSale`)

**1. Implementasi saat ini:** `subtotal = Σ(harga × qty)`, `diskon` (rupiah atau persen, dengan cap di `subtotal`), `total = subtotal - diskon` — semua dihitung di `useCart()` untuk transaksi baru, dan dihitung ULANG dengan rumus terpisah di `useUpdateSale()` untuk transaksi yang diedit. Nilai `total` inilah yang tersimpan sebagai kolom `sales.total` — kolom yang jadi basis SEMUA laporan omset/profit di POS, dashboard BEP, dan laporan.

**2. Kenapa harus pindah ke Supabase:** Tidak ada apa pun di database yang memverifikasi `total` konsisten dengan `items` dan `discount`. Karena rumusnya diduplikasi (sekali di `useCart`, sekali di `useUpdateSale`), ada risiko drift kalau salah satu diubah tanpa mengubah yang lain — dan karena `harga` di tiap item bisa di-override manual oleh kasir (`setItemHarga`), potensi salah ketik/nilai aneh langsung masuk ke `total` tanpa sanity check.

**3. Rekomendasi implementasi:** **Trigger** `BEFORE INSERT OR UPDATE ON sales` yang menghitung ulang `total` dari `items` + `discount` dan **menimpa** nilai kiriman client kalau tidak cocok (atau raise exception kalau ingin lebih ketat) — mengikuti definisi qty efektif yang sama seperti `effectiveQty()` (item.qty vs SUM(item.warna[].qty)) diterjemahkan ke jsonb function SQL.

**4. Peningkatan performa:** Negligible.

**5. Peningkatan maintainability:** Tinggi — satu definisi "cara menghitung total transaksi" untuk seluruh sistem, dijamin oleh database, bukan didup di dua tempat React.

**6. Kompleksitas:** Sedang — perlu fungsi jsonb parsing di PL/pgSQL, tapi pola inputnya (`items` jsonb array) sudah konsisten di seluruh sistem.

**7. Prioritas migrasi:** Tinggi (P1).

---

#### 3.2.3 🟡 Perhitungan Profit per Laporan (`itemProfit`, `effectiveQty`)
**File:** `apps/pos/src/shared/lib/salesUtils.js`, dipakai di `TabTransaksi.jsx` dan diduplikasi ulang di `packages/shared/lib/bepUtils.js` (dengan komentar eksplisit "Diduplikasi sengaja")

**1. Implementasi saat ini:** `itemProfit = (harga - hpp) × effectiveQty`, dijumlahkan per laporan dengan `.reduce()` di client setelah `useSalesReport` menarik seluruh baris `sales` dalam rentang tanggal dari IndexedDB/Supabase.

**2. Kenapa harus pindah ke Supabase (untuk laporan besar):** Untuk rentang tanggal pendek (hari ini/minggu ini) volume datanya kecil dan JS-side masih wajar. Tapi fungsi yang sama **diduplikasi manual** di `bepUtils.js` (dikomentari eksplisit "packages/shared tidak boleh tergantung pada apps/pos") — ini sinyal kuat bahwa logika ini sudah dianggap cukup penting untuk dipakai lintas-boundary, yang justru argumen untuk menaruhnya satu kali di database daripada disalin manual di dua tempat dan berisiko drift kalau salah satu diubah.

**3. Rekomendasi implementasi:** **SQL Function** `item_profit(item jsonb) RETURNS numeric` dan `effective_qty(item jsonb) RETURNS int`, dipakai di dalam **View**/RPC laporan (§3.1.5, §3.4.1) sehingga definisi "profit per item" cuma ada SATU tempat untuk seluruh sistem (POS, BEP, laporan produksi), bukan diduplikasi di 2+ file JS.

**4. Peningkatan performa:** Sedang untuk laporan rentang panjang (bulan/tahun) — signifikan kalau dipakai bersama §3.4.1 (BEP).

**5. Peningkatan maintainability:** Tinggi — menghapus duplikasi kode yang sudah diakui sendiri oleh komentar di codebase.

**6. Kompleksitas:** Rendah (fungsi murni, mudah diterjemahkan ke SQL).

**7. Prioritas migrasi:** Sedang (P2), tapi jadi **prasyarat** untuk migrasi BEP di §3.4.1 yang prioritasnya lebih tinggi.

---

### 3.3 `apps/catalog`

**1. Implementasi saat ini:** `apps/catalog` adalah aplikasi publik read-only — nyaris tidak ada business logic tersembunyi di frontend. `fetchProducts()` cuma `SELECT ... ORDER BY`. Satu-satunya logika non-trivial, `fetchSoldOutKodes()`, **sudah** memanggil RPC Supabase (`get_sold_out_kodes`) — bukan dihitung di client.

**2. Kenapa TIDAK perlu migrasi tambahan:** Tidak ditemukan kalkulasi harga, agregasi, atau business rule tersembunyi di sisi client `apps/catalog`. Filter "hanya tampilkan produk dengan foto" (disebut di CLAUDE.md §8) adalah filter tampilan sederhana, bukan business rule finansial — cocok tetap di client karena murni preferensi UX katalog, bukan aturan bisnis yang butuh konsistensi lintas-sistem.

**3–7.** Tidak ada rekomendasi baru. **Catatan positif:** `get_sold_out_kodes` adalah bukti bahwa tim sudah familiar dan nyaman memakai RPC — precedent ini yang saya jadikan rujukan di rekomendasi §4 (konvensi penamaan, dsb).

---

### 3.4 `apps/finance`

#### 3.4.1 🟠 Mesin Forecasting BEP (Break-Even Point) Pasar
**File:** `packages/shared/lib/bepUtils.js` — `computeSaldoHarian()`, `computeMarginPerPcs()`, `computeProyeksiUtangVsSaldo()`, `computeTargetProduksi()`, dkk.

**1. Implementasi saat ini:** ~440 baris logika finansial murni JavaScript: replay ledger saldo **harian** dari hari transaksi pasar paling awal sampai hari ini (loop `while (cur <= end)` — kalau toko sudah jalan 2 tahun, ini iterasi ratusan-ribu kali di browser tiap kali dashboard BEP dibuka), kalkulasi margin blended dari seluruh baris `sales` dalam window waktu, proyeksi saldo vs jadwal jatuh tempo utang bahan bulanan. Semua input (`salesRows`, `utangRows`) di-fetch penuh ke client lebih dulu.

**2. Kenapa harus pindah ke Supabase:** Ini kombinasi Pola C paling ekstrem di seluruh audit — bukan cuma agregasi, tapi **simulasi hari-demi-hari** atas seluruh histori transaksi, dieksekusi ulang dari nol di browser setiap dashboard dibuka. Waktu eksekusi tumbuh linear terhadap usia bisnis; someday ini akan terasa sangat lambat atau bahkan membekukan tab browser di perangkat low-end (ingat: pengguna utama produk ini mobile web, prioritas dari sesi sebelumnya). Ini juga logika finansial paling kompleks di seluruh sistem — layak diberi jaminan konsistensi tertinggi.

**3. Rekomendasi implementasi:** Bertingkat sesuai kompleksitas:
   - **View** `v_margin_harian` — agregasi margin+pcs per hari dari `sales` (menggantikan loop `byDate` di awal `computeSaldoHarian`).
   - **Materialized View** `mv_saldo_bep_harian`, di-refresh via **Trigger** tiap ada `sales` baru/berubah (atau cron harian kalau refresh real-time dianggap tidak perlu) — menyimpan hasil *running balance* per hari, sehingga replay day-by-day hanya perlu dihitung SEKALI dan disimpan, bukan dihitung ulang tiap page-load. Postgres window function `SUM(...) OVER (ORDER BY tanggal)` sangat cocok untuk ini dan jauh lebih cepat dari loop manual.
   - **RPC** `get_proyeksi_utang_vs_saldo(...)` untuk `computeProyeksiUtangVsSaldo` — parameterized, dipanggil sesuai kebutuhan (tidak perlu materialized, karena bergantung tanggal "hari ini").

**4. Peningkatan performa:** **Sangat tinggi**, dan yang terpenting: performa akan **tetap stabil seiring waktu** (tidak makin lambat seiring histori bertambah), karena materialized view menyimpan hasil kumulatif alih-alih menghitung ulang dari titik nol setiap kali.

**5. Peningkatan maintainability:** Tinggi — modul ini sudah punya dokumentasi internal sangat detail (komentar panjang menjelaskan revisi logika "rollover", "dobel hitung utang", dst — tanda modul ini sudah beberapa kali direvisi karena bug logika). Memindahkan ke SQL dengan test yang jelas (`EXPLAIN ANALYZE`, unit test SQL) akan mengurangi risiko regresi berulang seperti yang sudah terjadi di riwayat kode ini.

**6. Kompleksitas:** **Tinggi** — ini migrasi paling kompleks di seluruh roadmap. Perlu breakdown bertahap (view dulu, materialized view kedua, RPC proyeksi terakhir), dan butuh validasi ketat (bandingkan output SQL vs output JS lama pada data historis nyata sebelum cutover) karena kesalahan kecil akan langsung salah-arah keputusan bisnis (kapan harus produksi lebih, dsb).

**7. Prioritas migrasi:** **Tinggi (P1)**, tapi eksekusinya paling belakangan dari kelompok P1 lain karena kompleksitas dan risiko regresinya — sisihkan waktu testing paling banyak untuk modul ini dibanding temuan lain manapun di dokumen ini.

---

#### 3.4.2 🔴 Ledger Kasbon (Pinjaman Karyawan) — race condition pada saldo pinjaman
**File:** `apps/finance/src/features/kasbon/api.js` → `createOrAccumulateKasbon()`, `updateKasbonJumlah()`, `payCicilan()`, `applyKasbonDeductionFromGajian()`

**1. Implementasi saat ini:** Semua empat fungsi memakai Pola A: baca `kasbon.sisa` dari objek yang dipegang client → hitung `newSisa = sisa - jumlah` → `UPDATE`. `payCicilan()` dipanggil dari UI Kasbon (cicilan manual); `applyKasbonDeductionFromGajian()` dipanggil dari alur finalisasi gajian (§3.4.3) — **dua jalur berbeda yang bisa memodifikasi baris `kasbon` yang sama nyaris bersamaan** (misalnya karyawan bayar cicilan manual di hari yang sama gajian mingguannya difinalisasi dengan potongan kasbon otomatis).

**2. Kenapa harus pindah ke Supabase:** Ini ledger uang pinjaman — kesalahan di sini berarti karyawan bisa tercatat kurang/lebih bayar tanpa disadari, dan karena melibatkan potongan gaji, bisa berdampak langsung ke jumlah uang yang ditransfer ke rekening karyawan (`generateWAText` di `gajian/utils.js` memakai `data.total - potongan` sebagai angka transfer aktual).

**3. Rekomendasi implementasi:** **RPC** `apply_kasbon_payment(kasbon_id uuid, jumlah numeric, sumber text, tanggal date, keterangan text)` — satu function dipakai oleh KEDUA jalur (cicilan manual dan potongan dari finalisasi gajian), memakai `UPDATE kasbon SET sisa = GREATEST(0, sisa - $jumlah), status = CASE WHEN sisa - $jumlah <= 0 THEN 'lunas' ELSE 'belum' END, cicilan = cicilan || jsonb_build_object(...) WHERE id = $kasbon_id RETURNING sisa, status`. Konsolidasi dua implementasi terpisah (`payCicilan` dan `applyKasbonDeductionFromGajian` saat ini punya logika yang nyaris identik tapi ditulis dua kali) jadi satu RPC mengurangi risiko drift juga.

**4. Peningkatan performa:** Minor — manfaat utamanya bukan performa.

**5. Peningkatan maintainability:** Tinggi — dua implementasi mirip jadi satu; parameter `sumber` (manual vs gajian) bisa dicatat untuk audit trail yang lebih baik dari sekadar array `cicilan` jsonb yang tumbuh tanpa batas di satu kolom.

**6. Kompleksitas:** Rendah-Sedang.

**7. Prioritas migrasi:** **Tinggi (P0/P1 — treat sebagai kritis)** — ini data finansial per-karyawan yang langsung memengaruhi jumlah gaji yang ditransfer.

---

#### 3.4.3 🟠 Kalkulasi Upah per Tim (Potong/Jahit/Finishing/QC/Kreatif) — dipercaya dari client
**File:** `apps/finance/src/features/gajian/utils.js` → `calcUpahPotong()`, `calcUpahFinishing()`, `calcFinishingPerPcs()`, `calcUpahKreatif()`

**1. Implementasi saat ini:** Lima rumus upah berbeda (satu per tim), masing-masing mengalikan input (jumlah pola/pcs/video/dst) dengan tarif dari `finance_config` (bisa di-override manual via range slider di form). Hasil `total_upah` dikirim sebagai bagian payload `savePotong`/`saveJahit`/dst dan **disimpan apa adanya** — tidak ada perhitungan ulang di server untuk memverifikasi `total_upah` benar-benar `= jumlah × tarif`.

**2. Kenapa harus pindah ke Supabase:** Ini **payroll** — kolom yang secara eksplisit diminta user untuk diperiksa. `total_upah` yang tersimpan salah (baik karena bug UI, karena input di-manipulasi lewat devtools, atau karena race condition saat form disubmit dua kali) langsung berarti karyawan dibayar salah, dan tidak ada mekanisme apa pun di database yang akan mendeteksinya. Kode bahkan punya `rincianPotong()` dkk yang secara eksplisit menghitung selisih "tambahan manual" (`total_upah` tersimpan dikurangi hasil hitungan formula) — ini implisit mengakui bahwa `total_upah` bisa saja TIDAK sama dengan hasil formula, dan sistem sudah punya kebutuhan nyata untuk melacak kapan itu terjadi.

**3. Rekomendasi implementasi:** **Trigger** `BEFORE INSERT OR UPDATE` pada tiap tabel `gaji_potong`/`gaji_jahit`/`gaji_finishing`/`gaji_qc`/`gaji_kreatif` yang menghitung `expected_upah` dari kolom input + `finance_config`, dibandingkan dengan `total_upah` yang dikirim. **Bukan** menolak otomatis (karena "tambahan manual" adalah kasus valid yang disengaja — supervisor sengaja menaikkan/menurunkan dari formula standar), tapi menyimpan kolom baru `selisih_manual` (generated column) supaya penyimpangan dari formula standar **selalu tercatat eksplisit di database**, bukan cuma inferred belakangan di `rincianPotong()`. Ini mengubah "tambahan manual" dari sesuatu yang cuma bisa dideteksi lewat pengurangan di JS jadi field database yang bisa di-query, di-laporkan, dan di-audit langsung.

**4. Peningkatan performa:** Negligible.

**5. Peningkatan maintainability:** Tinggi — histori "kenapa upah karyawan X beda dari formula standar minggu ini" jadi queryable, bukan cuma bisa dilihat kalau seseorang buka detail dan menghitung manual.

**6. Kompleksitas:** Sedang — lima trigger mirip (satu per tabel tim), tapi rumusnya sudah terdefinisi jelas di `utils.js` sebagai referensi terjemahan.

**7. Prioritas migrasi:** Tinggi (P1) — payroll adalah kategori yang secara eksplisit paling sensitif secara bisnis.

---

#### 3.4.4 🟠 Agregasi Total Gajian per Periode — 6 fetch terpisah dijumlah di client
**File:** `apps/finance/src/features/gajian/api.js` → `fetchGajianTotals()`

**1. Implementasi saat ini:** Untuk menampilkan total upah per tim di tab Ringkasan, kode melakukan **6 query terpisah** (`Promise.all` ke `gaji_potong`, `gaji_jahit`, `gaji_finishing`, `gaji_qc`, `gaji_kreatif`, `gaji_cmt`, masing-masing `select total_upah`), lalu `.reduce()` tiap hasil di JavaScript untuk dapat `t.gaji = SUM(semua tim)`.

**2. Kenapa harus pindah ke Supabase:** 6 round-trip jaringan untuk 6 angka SUM yang bisa didapat SQL dalam 1 query `UNION ALL` + `GROUP BY`. Nilai `t.gaji` (total gaji mingguan) ini jugalah yang dikirim ke `finalizeGajian()` dan dikunci permanen sebagai `gajian_minggu.total_gaji` — kalau salah satu dari 6 fetch gagal diam-diam (network blip pada satu dari 6 request paralel), totalnya akan under-counted tanpa ada indikasi eror yang jelas ke user.

**3. Rekomendasi implementasi:** **View** `v_gajian_totals` — `SELECT gajian_id, SUM(...) FILTER (WHERE tim='potong') AS potong, ... FROM (semua tabel gaji_* di-UNION ALL) GROUP BY gajian_id`, atau lebih simpel: **RPC** `get_gajian_totals(p_gajian_id uuid)` yang menjalankan 6 SUM sub-query dalam SATU statement SQL (`SELECT (SELECT SUM(total_upah) FROM gaji_potong WHERE gajian_id=$1) AS potong, ...`).

**4. Peningkatan performa:** Dari 6 round-trip jadi 1.

**5. Peningkatan maintainability:** Tinggi — mengurangi risiko partial-failure yang sulit dilacak (satu dari 6 fetch gagal diam-diam = total gaji salah dan tidak ada log yang jelas kenapa).

**6. Kompleksitas:** Rendah.

**7. Prioritas migrasi:** Tinggi (P1) — angka ini jadi basis `finalizeGajian()`, satu langkah dari terkunci permanen sebagai catatan resmi.

---

#### 3.4.5 🟠 Finalisasi Gajian (Workflow draft → final) — tidak ada verifikasi ulang di server
**File:** `apps/finance/src/features/gajian/api.js` → `finalizeGajian()`

**1. Implementasi saat ini:** Mengunci `gajian_minggu.status = 'final'` beserta seluruh kolom `total_*` — **nilai yang dikunci berasal 100% dari parameter yang dikirim client** (hasil §3.4.4 + §3.4.3 yang sudah dihitung di JS). Setelah final, kolom ini jadi acuan permanen (dipakai `generateWAText` untuk kirim rincian transfer ke karyawan) — tapi tidak ada apa pun di database yang memverifikasi totalnya benar-benar konsisten dengan baris `gaji_*` yang mendasarinya PADA SAAT finalisasi terjadi.

**2. Kenapa harus pindah ke Supabase:** Ini transisi status paling sensitif di seluruh sistem finance — begitu final, angka itu jadi dasar transfer uang sungguhan ke rekening karyawan. Kalau ada race condition (entri tim diedit oleh orang lain tepat saat supervisor menekan "Finalisasi") atau bug di kalkulasi §3.4.3/§3.4.4, kesalahannya akan terkunci permanen tanpa terdeteksi.

**3. Rekomendasi implementasi:** **RPC** `finalize_gajian(p_gajian_id uuid)` — TIDAK menerima `totals` sebagai parameter dari client sama sekali; sebaliknya, function ini **menghitung ulang** totals dari `gaji_*` tables sendiri (menggunakan logika §3.4.4) di dalam transaksi yang sama dengan `UPDATE status='final'`, sehingga apa pun yang tersimpan di kolom final dijamin konsisten dengan data sumbernya per definisi (tidak mungkin drift, karena dihitung dari sumber yang sama, di waktu yang sama, dalam satu transaksi atomik). Terapkan potongan kasbon (§3.4.2) di RPC yang sama supaya seluruh alur finalisasi jadi satu unit atomik.

**4. Peningkatan performa:** Minor.

**5. Peningkatan maintainability:** **Sangat tinggi** — ini mengubah "percaya angka yang dikirim client" jadi "database menghitung sendiri angka yang dikunci", closing satu-satunya celah paling berisiko di seluruh modul payroll.

**6. Kompleksitas:** Sedang — menggabungkan logika §3.4.2, §3.4.3, §3.4.4 jadi satu RPC transaksional.

**7. Prioritas migrasi:** **Tertinggi (P0)** — sejajar dengan §3.1.1 dan §3.2.1. Ini titik kunci-permanen data payroll, kombinasi risiko finansial + tidak bisa dibatalkan begitu final.

---

#### 3.4.6 🟡 Dashboard Finance — agregasi lintas-fitur dengan fetch tak terbatas
**File:** `apps/finance/src/features/dashboard/hooks.js`, `apps/finance/src/features/pettycash/api.js` (`fetchPettycashAll` — komentar eksplisit "SEMUA baris... all-time")

**1. Implementasi saat ini:** `useDashboardStats()` menggabungkan hasil dari `useGajianList`, `useKasbonList`, `usePettycashAll` — yang terakhir secara eksplisit menarik **SELURUH baris `pettycash` sejak awal berdirinya fitur ini** (tidak pernah difilter tanggal di level query), lalu difilter/dijumlah per bulan di JavaScript untuk saldo & ringkasan bulan berjalan.

**2. Kenapa harus pindah ke Supabase:** Sama seperti §3.4.1 (BEP) tapi skalanya lebih kecil — `saldo` all-time HARUS dihitung dari semua baris (itu definisinya, tidak salah), tapi menariknya sebagai baris mentah ke client alih-alih meminta database menjumlahkannya adalah pemborosan yang tumbuh terus seiring waktu.

**3. Rekomendasi implementasi:** **View** `v_pettycash_saldo` (`SELECT SUM(CASE WHEN jenis='isi' THEN jumlah ELSE -jumlah END) AS saldo FROM pettycash`) untuk angka saldo; **RPC** `get_dashboard_stats()` yang menggabungkan saldo pettycash + total kasbon belum lunas + pettycash bulan berjalan dalam satu pemanggilan, menggantikan komposisi 3 hook terpisah yang masing-masing fetch penuh.

**4. Peningkatan performa:** Sedang, tumbuh signifikan seiring waktu (linear terhadap jumlah transaksi pettycash all-time).

**5. Peningkatan maintainability:** Sedang.

**6. Kompleksitas:** Rendah.

**7. Prioritas migrasi:** Sedang (P2).

---

#### 3.4.7 🟢 Formula WhatsApp Text (`generateWAText`) — TETAP di frontend
**File:** `apps/finance/src/features/gajian/utils.js` → `generateWAText()`

**Kenapa TIDAK perlu pindah:** Ini murni formatting teks (padding, separator visual, emoji) untuk dikirim ke WhatsApp — bukan business logic yang butuh konsistensi lintas-sistem atau proteksi integritas data. Angka yang ditampilkannya SEHARUSNYA berasal dari hasil RPC di §3.4.3–3.4.5 setelah migrasi (bukan dihitung ulang di sini), tapi proses merangkainya jadi teks tetap tepat berada di presentation layer. Prioritas migrasi: **tidak perlu**.

---

### 3.5 `packages/shared` (ringkasan tambahan di luar yang sudah dibahas)

| File | Temuan | Rekomendasi |
|---|---|---|
| `lib/bepUtils.js` | Sudah dibahas detail di §3.4.1 | RPC/View/Materialized View bertahap |
| `features/transfers/api.js` | Sudah dibahas detail di §3.1.1 | RPC `approve_transfer` |
| `features/stok/api.js` (`fetchStokByLocation`) | Query sederhana (`gt(location,0)`), tidak ada kalkulasi | 🟢 Tetap di client — ini sudah query database yang tepat, bukan agregasi client-side |
| `features/products/api.js` (`fetchProducts`) | Query sederhana `ORDER BY` | 🟢 Tetap di client |
| `lib/constants.js` (`SIZE_PRESETS`, `buildKode`, `formatHarga`) | Konstanta & formatter murni | 🟢 Tetap di client — ini domain vocabulary (nama ukuran, format Rupiah), bukan business rule yang perlu dijaga database |
| `lib/marketDay.js` (`getMarketLocation`) | Aturan "Senin/Kamis→Cideng, Jumat→Tegalgubug, lainnya→Gudang" | 🟡 **Pertimbangkan** SQL Function `get_market_location(tanggal date)` — dipakai bepUtils.js SECARA BERULANG di dalam loop harian (§3.4.1); kalau BEP dipindah ke SQL, aturan ini WAJIB ikut pindah supaya kedua sisi (JS untuk UI lokasi hari ini, SQL untuk replay historis) tidak bisa drift. Prioritas mengikuti §3.4.1. |
| `lib/waFormat.js` | Formatting teks share WA produk | 🟢 Tetap di client |
| `lib/cloudinary.js` | URL builder gambar, upload | 🟢 Tetap di client (infrastruktur presentation, bukan business logic) |

---

## 4. Tabel Prioritas Migrasi (Konsolidasi)

| # | Temuan | App | Jenis | Prioritas | Kompleksitas |
|---|---|---|---|---|---|
| 1 | Approve Transfer — race condition stok | admin/shared | RPC | **P0** | Sedang |
| 2 | Pengurangan stok saat sale — race condition | pos | RPC | **P0** | Sedang |
| 3 | Finalisasi Gajian — hitung ulang server-side | finance | RPC | **P0** | Sedang |
| 4 | Ledger Kasbon — race condition saldo pinjaman | finance | RPC | P0/P1 | Rendah-Sedang |
| 5 | Riwayat penjualan per produk — fetch 10.000 baris | admin | RPC + index GIN | P1 | Sedang-Tinggi |
| 6 | Kalkulasi HPP — trigger validasi server-side | admin | Trigger + SQL Function | P1 | Sedang |
| 7 | Total transaksi POS — trigger validasi server-side | pos | Trigger | P1 | Sedang |
| 8 | Kalkulasi upah per tim — selisih_manual generated column | finance | Trigger | P1 | Sedang |
| 9 | Agregasi total gajian per periode — 6 fetch → 1 | finance | View/RPC | P1 | Rendah |
| 10 | Mesin forecasting BEP — replay harian | shared/finance | View + Materialized View + RPC | P1 | **Tinggi** |
| 11 | Agregasi stok per kode (grid Admin) | admin | View | P2 | Rendah |
| 12 | Buku Potongan — join expected vs actual | admin | View | P2 | Rendah-Sedang |
| 13 | Laporan produksi bulanan + total all-time | admin | View + Materialized View + RPC | P2 | Sedang |
| 14 | Profit per item (`itemProfit`) — hapus duplikasi | pos/shared | SQL Function | P2 | Rendah |
| 15 | Dashboard finance — saldo pettycash all-time | finance | View + RPC | P2 | Rendah |
| 16 | Workflow status sampel — transaksi all-or-nothing | admin | RPC + Constraint | P2 | Rendah-Sedang |
| 17 | Deteksi & gabung bahan duplikat | admin | RPC + Constraint | P3 | Rendah |
| 18 | Audit log (`logHistory`) → trigger-based (opsional) | admin | Trigger | P4 | Sedang |
| 19 | `getMarketLocation` sebagai SQL Function (prasyarat #10) | shared | SQL Function | Mengikuti #10 | Rendah |

---

## 5. Rekomendasi Urutan Eksekusi (Fase, Bukan Tanggal)

Karena ini roadmap, bukan implementasi, urutan berikut disusun berdasarkan **ketergantungan teknis** dan **rasio risiko:usaha**, bukan estimasi waktu kalender:

**Fase 1 — Tutup celah integritas data (P0).** Keempat RPC di §4 baris 1–4. Ini yang paling mendesak karena berdampak langsung ke uang dan stok fisik, dan sudah terbukti codebase ini rentan terhadap kelas bug ini (bug duplikat POS yang baru saja diperbaiki adalah sepupu dekat dari race condition-race condition ini).

**Fase 2 — Kunci kalkulasi finansial di server (P1, bagian non-BEP).** Baris 5–9: trigger validasi HPP/total transaksi/upah, plus agregasi gajian. Semua ini independen satu sama lain, bisa dikerjakan paralel oleh lebih dari satu orang/PR.

**Fase 3 — Migrasi BEP (P1, terpisah karena kompleksitasnya).** Baris 10 (dan prasyaratnya, baris 19). Sisihkan sesi tersendiri dengan waktu testing/validasi paling banyak — bandingkan hasil SQL vs hasil JS lama di atas data historis nyata sebelum cutover, karena modul ini punya riwayat revisi logika berkali-kali (terlihat dari komentar di kode) dan langsung memengaruhi keputusan produksi.

**Fase 4 — Efisiensi laporan & dashboard (P2).** Baris 11–16. Tidak mendesak secara integritas data, tapi nilainya akan terasa makin besar seiring data bertambah — baik dikerjakan sebelum volume data jadi masalah nyata daripada sesudah.

**Fase 5 — Pembersihan & pencegahan (P3–P4).** Baris 17–18. Maintenance/quality-of-life, bisa dikerjakan kapan saja ada kapasitas luang.

---

## 6. Catatan Implementasi untuk Nanti (Bukan Bagian dari Scope Sesi Ini)

Beberapa hal yang perlu diperhatikan tim SAAT implementasi (di luar scope roadmap ini, dicatat supaya tidak lupa):

- **Migration governance:** DEPLOYMENT.md sudah menyebutkan "tidak ada automated migration runner — semua dijalankan manual." Sudah terbukti di sesi audit sebelumnya ini menyebabkan drift antara migration file yang di-commit vs yang benar-benar dijalankan di production (kasus RLS `sales`). RPC/trigger/view baru WAJIB langsung diverifikasi jalan di production, bukan cuma di-commit sebagai file `.sql`.
- **RLS (Row Level Security):** Semua RPC baru perlu direview terhadap kebijakan RLS yang berlaku — RPC dengan `SECURITY DEFINER` bisa saja "melompati" RLS caller secara sengaja (perlu untuk kasus seperti approve transfer lintas-user), tapi ini keputusan keamanan yang harus eksplisit, bukan default.
- **POS tetap offline-first:** RPC apa pun yang dipanggil dari `apps/pos` (§3.2.1, §3.2.2) harus tetap kompatibel dengan pola "coba online, kalau gagal simpan pending, retry nanti" yang sudah ada — jangan sampai migrasi ke RPC diam-diam menghilangkan kemampuan kerja offline yang jadi syarat utama aplikasi ini.
- **Precedent yang sudah ada:** `v_stok_bahan` (view) dan `get_sold_out_kodes` (RPC) adalah contoh nyata di codebase ini yang bisa dijadikan referensi konvensi penamaan dan struktur file migrasi untuk seluruh temuan di atas.
