# Laporan — Sinkronisasi Pemakaian Bahan dengan Produksi Batch

## 1. Investigasi

### 1.1 Dari mana nilai Masuk dihitung

Kolom **Masuk** di Daftar Stok Bahan berasal dari VIEW SQL `v_stok_bahan` (`supabase/migrations/20260525_produksi.sql`, direvisi di `20260526_bahan_updates.sql`), dijumlahkan dari:

- Semua baris `bahan_pembelian` (pembelian bahan dari supplier), dan
- Baris `bahan_pinjam` dengan `arah_pinjam = 'masuk'` (bahan yang diterima Deera dari pihak lain).

Ini adalah VIEW, bukan tabel — nilainya dihitung ULANG setiap kali di-query, bukan disimpan sebagai angka statis. `apps/admin/src/features/produksi-bahan/api.js` (`fetchStokBahan()`) memanggil `select("*") dari "v_stok_bahan"`, dan `StokPanel.jsx` menampilkan `row.total_masuk` apa adanya. Jalur ini sudah benar dan tidak disentuh sama sekali dalam perbaikan ini.

### 1.2 Dari mana nilai Keluar saat ini dihitung

Kolom **Keluar** di VIEW yang sama dihitung dari dua sumber:

- `produksi_batch.bahan_dipakai` (kolom `jsonb`, di-flatten via `jsonb_array_elements` lalu di-`SUM`), dan
- Baris `bahan_pinjam` dengan `arah_pinjam = 'keluar'` (bahan yang Deera pinjamkan ke pihak lain).

Poin penting: **logika SQL untuk "Keluar" ini sudah benar dan sudah ada sejak awal.** Ini bukan angka yang di-increment/decrement secara manual di suatu tempat — ini VIEW yang menjumlahkan ulang `bahan_dipakai` dari SELURUH baris `produksi_batch` setiap kali di-query. Konsekuensinya, tiga syarat yang diminta di requirement ("update otomatis dalam transaksi yang sama", "edit menyesuaikan", "hapus mengembalikan", "tidak ada double counting") **sudah otomatis terpenuhi oleh desain VIEW ini**, asalkan kolom `bahan_dipakai` di baris `produksi_batch` berisi angka yang benar:

- Batch baru dibuat → baris baru masuk hitungan SUM saat query berikutnya. Tidak mungkin "batch berhasil dibuat tapi Keluar tidak ter-update", karena tidak ada langkah terpisah yang bisa gagal — Keluar dihitung dari data yang SAMA yang baru saja disimpan.
- Batch diedit → `bahan_dipakai` di baris itu di-*overwrite* (bukan ditambah), sehingga SUM otomatis mencerminkan angka baru pada query berikutnya. Tidak ada "kurangi lalu tambah" secara eksplisit karena memang tidak perlu — nilai lama sudah tergantikan.
- Batch dihapus → barisnya hilang dari tabel, otomatis tidak ikut ke-SUM lagi.
- Diedit berkali-kali → tetap aman, karena tiap edit meng-overwrite (bukan mengakumulasi).

### 1.3 Mengapa nilainya selalu 0

Meski logika VIEW-nya benar, masalahnya ada satu langkah SEBELUMNYA: **`produksi_batch.bahan_dipakai` sering tersimpan sebagai array kosong (`[]`) dan tidak pernah terisi.**

Ditelusuri ke `apps/admin/src/features/produksi-record/api.js`, fungsi `saveEntry()` (dipanggil saat membuat batch baru) menghitung `bahan_dipakai` dengan:

```
bahanDipakai = template?.bahan_items?.map(...) ?? []
```

`template` di sini adalah HPP Template produk (tabel `hpp_template`), yang di-fetch berdasarkan kode produk saat form diisi (`BatchForm.jsx` / `ProductEntryCard.jsx`, via `fetchHppTemplate(kode)`). **Kalau HPP Template belum pernah dibuat untuk kode produk tersebut pada saat batch disimpan, `template` bernilai `null`, dan `bahan_dipakai` tersimpan `[]` — permanen**, karena tidak ada proses lain yang pernah menyentuh kolom ini lagi setelahnya (kecuali user membuka lagi form Edit Batch, dan pada saat itu HPP Template-nya sudah ada).

Alur bisnis yang didokumentasikan di `CLAUDE.md` §9 memang mengasumsikan urutan "1. Buat HPP Template → 2. Buat batch produksi", tapi **urutan ini tidak pernah dipaksakan di UI** — form batch (`ProductEntryCard.jsx`) sudah punya indikator kecil "Belum ada template HPP" tapi teksnya abu-abu, tidak menjelaskan konsekuensinya, dan tetap mengizinkan submit. Dalam praktiknya sangat mudah membuat batch duluan (produk baru, belum sempat isi HPP) sebelum sempat membuat Template-nya.

### 1.4 Apakah ada logic yang hilang

Ya, dua hal:

1. **Tidak ada mekanisme untuk memperbaiki `bahan_dipakai` setelah HPP Template dibuat belakangan**, kecuali membuka ulang form Edit Batch secara manual (dan itu pun baru berhasil kalau user tahu harus melakukannya — tidak ada indikasi di UI bahwa batch tersebut "pemakaian bahannya belum tercatat").
2. **Cache TanStack Query lintas fitur tidak saling invalidasi.** `useStokBahanQuery()` (fitur `produksi-bahan`) punya query key sendiri (`["produksi-bahan","stok"]`) yang terpisah dari `useBatchesQuery()` (fitur `produksi-record`, key `["produksi-record","batches"]`). Membuat/mengedit/menghapus batch di halaman Catatan Produksi TIDAK meng-invalidate cache Stok Bahan — jadi meskipun `bahan_dipakai` sudah benar, tab Daftar Stok Bahan yang sudah pernah dibuka bisa menampilkan angka basi (default `staleTime` 30 detik) sampai di-refresh manual atau 30 detik berlalu.

Bukti bahwa ini pola yang sudah pernah terjadi sebelumnya (bukan cuma dugaan): ada dua migration SQL yang PERNAH memperbaiki gejala yang sama dengan cara backfill satu kali (`20260527_backfill_bahan_dipakai.sql`, `20260603_fix_v_stok_bahan_keluar.sql`) — keduanya menulis ulang `bahan_dipakai` untuk batch lama yang masih `[]`. Backfill satu kali ini menutup gejalanya untuk data yang SUDAH ADA saat itu, tapi tidak menutup akar masalahnya di kode aplikasi — sehingga batch BARU yang dibuat tanpa Template HPP akan mengalami masalah yang persis sama lagi.

### 1.5 Dampak perubahan terhadap data existing

Tidak ada migrasi data yang dijalankan pada perbaikan ini. Batch lama yang `bahan_dipakai`-nya masih `[]` (baik yang belum sempat di-backfill migration lama, atau batch baru yang dibuat setelah migration itu tapi sebelum HPP Template-nya ada) akan tetap `[]` sampai user menekan tombol "Sinkronkan" yang baru ditambahkan — tidak ada perubahan data otomatis/diam-diam. Ini pilihan yang disengaja (lihat §3).

## 2. Bug atau Desain Awal?

**Ini bug**, tapi lebih sempit dari dugaan awal "logic update stok keluar tidak pernah dijalankan". Yang benar:

- Logika SQL (VIEW `v_stok_bahan`) untuk menghitung Keluar dari `bahan_dipakai` **sudah berjalan dan sudah benar** sejak awal, dan sudah otomatis memenuhi semua syarat "atomicity", "edit menyesuaikan", "hapus mengembalikan", "no double counting" karena desainnya berbasis agregasi live, bukan counter tersimpan.
- Bug-nya ada di **langkah pengisian data**: `bahan_dipakai` bergantung pada HPP Template yang harus SUDAH ADA pada saat batch dibuat/diedit, tanpa ada jaring pengaman kalau urutan itu dilanggar (yang mana UI sendiri tidak mencegahnya), dan tanpa cara mudah untuk memperbaikinya belakangan selain membuka ulang form edit secara utuh.

## 3. Solusi yang Dipilih dan Alasannya

Sesuai batasan requirement (jangan ubah struktur database, jangan ubah business flow, hindari double counting, manfaatkan data yang sudah ada), solusi difokuskan murni di lapisan aplikasi:

1. **Tidak menyentuh skema database sama sekali.** VIEW `v_stok_bahan` sudah benar, tidak perlu tabel/kolom/trigger baru.
2. **Tidak memaksa urutan "Template dulu baru Batch".** Batch tetap bisa dibuat/disimpan tanpa Template HPP, persis seperti sekarang — ini menghormati "jangan ubah business flow yang sudah ada".
3. **Tambah jalur perbaikan eksplisit dan aman (idempotent):** fungsi `resyncBahanDipakai(batch)` yang menghitung ulang `bahan_dipakai` (dan sekalian `hpp_snapshot`/`hpp_per_item` kalau masih kosong, karena akar masalahnya sama persis) dari HPP Template TERKINI × `total_kain` batch, lalu meng-*overwrite* baris `produksi_batch` yang bersangkutan. Karena sifatnya overwrite (bukan tambah), dipanggil berkali-kali tetap aman — tidak ada risiko double counting di VIEW.
4. **Tambah peringatan yang jelas di UI**, di titik pembuatan batch (form) maupun di titik setelahnya (kartu batch), sehingga user tahu kalau ada batch yang pemakaian bahannya belum tercatat — dan tahu ada tombol untuk memperbaikinya kapan saja.
5. **Tambah invalidasi cache lintas fitur** supaya begitu batch dibuat/diedit/dihapus/disinkronkan, tab Daftar Stok Bahan langsung menampilkan angka terbaru tanpa perlu refresh manual.

Kenapa TIDAK memilih "otomatis resync semua batch begitu Template HPP disimpan": itu berarti menyentuh fitur Produksi HPP (perubahan business flow di fitur lain) dan berisiko menulis ulang data historis batch lama secara diam-diam kalau resep bahan berubah di kemudian hari — padahal `hpp_snapshot` memang sengaja dirancang sebagai snapshot BEKU dari HPP saat batch dibuat (bukan referensi hidup ke template). Menjaga sifat snapshot ini penting untuk keakuratan histori produksi. Tombol "Sinkronkan" yang eksplisit (opt-in per batch, dengan konfirmasi visual) lebih aman dan lebih sesuai dengan batasan "jangan ubah business flow".

## 4. Perubahan yang Dilakukan

Seluruhnya di `apps/admin`, tanpa perubahan database:

- **`features/produksi-record/api.js`** — fungsi baru `resyncBahanDipakai(batch)`: fetch HPP Template terkini, hitung `bahan_dipakai` dari `bahan_items × total_kain`, update baris `produksi_batch`. Melempar error jelas kalau Template masih belum ada/tidak punya bahan.
- **`features/produksi-record/queries.js` + `hooks.js`** — `useResyncBahanDipakaiMutation()` / `useResyncBahanDipakai()`, mengikuti pola TanStack Query yang sudah ada di fitur ini.
- **`features/produksi-bahan/queries.js` + `hooks.js`** — `useInvalidateStokBahan()`, mengikuti pola persis `useInvalidateProducts` yang sudah ada di `@deera/shared/features/products/hooks` — dipanggil dari fitur `produksi-record` setelah create/update/delete/sync batch.
- **`components/BatchCard.jsx`** — badge peringatan kuning + tombol "Sinkronkan" saat `bahan_dipakai` kosong, dengan status loading & pesan error inline.
- **`components/ProduksiRecordPage.jsx`** — wiring `useResyncBahanDipakai` + `useInvalidateStokBahan`, dipanggil setelah create/update/delete/sync.
- **`components/ProductEntryCard.jsx`** — indikator "Belum ada Template HPP" diperjelas (kuning, bukan abu-abu) + kotak penjelasan konsekuensinya terhadap Stok Bahan.
- **`components/BatchForm.jsx`** — indikator status Template yang sebelumnya TIDAK ADA di mode edit (hanya ada di mode tambah), sekarang ditambahkan agar konsisten.

Tidak ada perubahan pada `saveEntry()`/`updateBatch()` yang sudah ada — logika inti pembuatan/edit batch tetap sama persis seperti sebelumnya.

## 5. Dampak terhadap Data Lama

Nol perubahan data otomatis. Batch lama dengan `bahan_dipakai = []` akan langsung terlihat (badge kuning) begitu halaman Catatan Produksi dibuka, dan bisa diperbaiki satu per satu lewat tombol "Sinkronkan" — pengganti yang jauh lebih mudah ditemukan dan berulang-pakai dibanding migration SQL sekali-pakai yang dipakai sebelumnya. Kalau suatu batch masih tidak punya Template HPP sama sekali, tombol akan menampilkan pesan error yang mengarahkan user untuk membuat Template-nya dulu — tidak ada percobaan silent-fail atau angka tebakan.

## 6. Skenario yang Diuji

Total 6 file test diperbarui/ditambahkan, mencakup:

- **Buat batch** — `saveEntry()`/`createBatches()` tidak berubah, tetap diverifikasi test lama (`api.test.js`, `queries.test.js`).
- **Sinkronisasi (`resyncBahanDipakai`)** — 6 skenario: berhasil menghitung dari template × total_kain, template tidak ada → error, template ada tapi `bahan_items` kosong → error, tidak menimpa `hpp_snapshot` yang sudah ada, tidak menimpa `hpp_per_item` yang sudah > 0, gagal saat update Supabase error → melempar error.
- **Edit batch** — test lama (`updateBatch` overwrite `bahan_dipakai`) tetap hijau; ditambah test baru yang memverifikasi peringatan Template HPP muncul/hilang sesuai status template di mode edit.
- **Hapus batch** — test lama tetap hijau; ditambah verifikasi `useInvalidateStokBahan()` dipanggil setelah hapus berhasil, dan TIDAK dipanggil kalau hapus gagal.
- **Validasi total pemakaian bahan (UI)** — `BatchCard`: badge peringatan + tombol Sinkronkan muncul saat `bahan_dipakai` kosong/null, tidak muncul saat sudah terisi; klik Sinkronkan memanggil `onSync(batch)`, menampilkan pesan error yang jelas kalau gagal, dan tidak memicu expand/collapse detail card (event tidak bocor).
- **Invalidasi cache lintas fitur** — `ProduksiRecordPage`: `useInvalidateStokBahan()` terpanggil setelah create, edit, delete, dan sync batch.

Seluruh 152 test yang relevan (api/queries/hooks + komponen di `produksi-record` dan `produksi-bahan`) hijau, dan `npm run build:admin` sukses tanpa error.
