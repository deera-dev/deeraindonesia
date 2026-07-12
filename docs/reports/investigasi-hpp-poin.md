# Laporan Investigasi — Komponen Poin Hilang dari Total HPP

**Modul:** Produksi HPP (`apps/admin/src/features/produksi-hpp/`)
**Laporan awal:** Total HPP lebih kecil dari seharusnya karena Poin Denny + Poin Haikal (Rp10.000 masing-masing) tidak ikut terhitung.

---

## Ringkasan Temuan (baca ini dulu)

Setelah menelusuri seluruh jalur kalkulasi, temuan sebenarnya **lebih spesifik** dari yang dilaporkan:

Fungsi inti `calcTotal()` (satu-satunya tempat `total_hpp` benar-benar dihitung dan disimpan ke database) **sudah** menjumlahkan Poin Denny + Poin Haikal sejak awal. Artinya **angka Total HPP yang tersimpan di `hpp_template.total_hpp` sudah benar** — bukan itu yang salah.

Bug sesungguhnya ada di **tiga tempat lain** yang membuat Poin terasa "hilang" secara nyata bagi pengguna:

1. **Tampilan setelah tersimpan** (kartu detail Template HPP & gambar share WhatsApp) merekonstruksi ulang breakdown biaya secara manual dari field `upah_jahit`/`bordir`/`biaya_studio`/`kancing_qty` SAJA — Poin (dan 6 komponen Harga Dasar lain: Plastik, Hangtag, Tali Hangtag, Merk, Pin, Kain Keras) **tidak pernah muncul di layar**, walau nilainya sudah ikut di dalam Total HPP. Pengguna tidak bisa memverifikasi ke mana angka itu pergi, sehingga Total HPP tampak "kurang" saat dijumlah manual dari yang terlihat.
2. **Kalkulator HPP** (tab estimasi cepat) sama sekali tidak terhubung ke Harga Dasar — dia punya field generik "Operasional" (default Rp5.000) yang tidak mewakili Plastik/Hangtag/Poin/dll sama sekali. Estimasi dari tab ini akan SELALU jauh lebih kecil dari Template HPP untuk produk yang sama.
3. **Share Card WhatsApp** memakai pendekatan agregat (`biayaBahan = total_hpp − biaya_lain`) yang didokumentasikan di `CLAUDE.md` §13 sebagai pola yang wajib dipertahankan — tapi `biaya_lain`-nya tidak lengkap (poin 1), sehingga Poin ikut "tertelan" dan salah label sebagai biaya bahan.

Kesimpulan: **tidak ada angka akhir yang perlu di-hardcode +Rp10.000**. Perbaikan dilakukan di sumbernya — breakdown yang ditampilkan ulang di berbagai tempat sekarang memakai SATU fungsi yang sama dengan yang dipakai saat menyimpan.

---

## 1. Dari Mana Total HPP Dihitung

Satu-satunya sumber kebenaran: `calcTotal()` di `apps/admin/src/features/produksi-hpp/utils.js`, dipanggil oleh `HPPForm.jsx` di dua tempat:

- `calcProdukHPP()` — live preview angka HPP di header tiap produk saat form masih dibuka.
- `handleSubmit()` — nilai `total_hpp` yang benar-benar di-upsert ke tabel `hpp_template`.

Semua tempat lain (kartu Template HPP, Bottom Sheet detail, Share Card, Batch Produksi, Laporan Produksi, riwayat/History) **membaca `total_hpp` yang sudah tersimpan** — tidak ada satupun yang menghitung ulang total secara independen. Ini konfirmasi penting: begitu `calcTotal()` benar, seluruh angka Total HPP di aplikasi otomatis benar (karena semuanya menyalin, bukan menghitung ulang).

## 2. Komponen yang Membentuk Total HPP

```
Total HPP = biayaKain (dari bahan_items) + Σ biayaLainBreakdown(...)

biayaLainBreakdown terdiri dari:
  Upah Jahit          (per-template, input form)
  Bordir              (per-template, input form)
  Biaya Studio        (per-template, dihitung dari hpp_config.studio ÷ jumlah baju)
  Kancing             (kancing_qty × hpp_config.kancing_satuan)
  Kancing Lain        (kancing_extra[], per-template)
  Plastik             (hpp_config.plastik)
  Hangtag             (hpp_config.hangtag)
  Tali Hangtag        (hpp_config.tali_hangtag)
  Merk                (hpp_config.merk)
  Pin                 (hpp_config.pin)
  Kain Keras          (hpp_config.kain_keras)
  Poin Denny          (hpp_config.poin_denny)
  Poin Haikal         (hpp_config.poin_haikal)
```

## 3. Apakah Poin Tersimpan di `hpp_config` Tapi Tidak Ikut Dihitung?

**Tidak.** `hpp_config.poin_denny` dan `hpp_config.poin_haikal` (masing-masing Rp10.000, di-seed lewat `supabase/migrations/20260525_produksi.sql`) **sudah** dibaca dan dijumlahkan oleh `calcTotal()` sejak sebelum investigasi ini. Ini diverifikasi lewat pembacaan kode `calcTotal()` dan dikonfirmasi dengan test regresi baru (`utils.test.js`) yang membuktikan total bertambah tepat Rp20.000 ketika kedua nilai Poin diaktifkan dari 0.

## 4. Apakah Poin Hanya Tidak Ditampilkan, atau Memang Tidak Ikut ke Kalkulasi?

**Campuran, tergantung tempatnya:**

| Tempat | Poin ikut ke total? | Poin tampil di layar? |
|---|---|---|
| `calcTotal()` / `HPPForm` "Rincian HPP" (sebelum simpan) | ✅ Ya | ✅ Ya (sudah benar dari awal) |
| `hpp_template.total_hpp` (tersimpan di DB) | ✅ Ya | — (angka final, bukan breakdown) |
| Kartu Template HPP / Bottom Sheet detail (setelah simpan) | ✅ Ya (di dalam total) | ❌ **Tidak** — breakdown manual tidak menyertakannya |
| Share Card WhatsApp | ✅ Ya (di dalam total & di dalam "Total Biaya Bahan" yang salah label) | ❌ **Tidak** sebagai baris sendiri |
| Kalkulator HPP | ❌ **Tidak sama sekali** | ❌ Tidak (field "Operasional" tidak representatif) |
| Snapshot HPP di Batch Produksi | ✅ Ya (menyalin `total_hpp` dari template apa adanya) | — (tidak render breakdown sendiri) |

## 5. Konsistensi di Seluruh Aplikasi (Sebelum vs Sesudah Perbaikan)

- **Template HPP (create/edit):** sudah benar sejak awal, tidak berubah.
- **Kalkulator HPP:** sebelumnya rumus berbeda total (field "Operasional" generik) → sekarang memakai komponen Harga Dasar asli via fungsi yang sama.
- **Snapshot Batch Produksi:** hanya menyalin `total_hpp`/`config_snapshot` dari Template — sudah konsisten karena sumbernya (`calcTotal`) benar; tidak ada perubahan di `produksi-record/api.js`.
- **Share HPP ke WhatsApp:** breakdown "Biaya Lain" sebelumnya tidak lengkap → sekarang lengkap, dan "Total Biaya Bahan" tidak lagi ter-inflasi oleh biaya kemasan/Poin yang salah label.
- **Semua tempat lain yang menampilkan Total HPP** (History, Laporan Produksi, ProductEntryCard di Catatan Produksi) hanya membaca `total_hpp` mentah — otomatis konsisten tanpa perlu diubah.

---

## Akar Penyebab Bug

Ada **satu akar penyebab desain, bukan rumus salah**: breakdown biaya "bukan bahan" (upah, bordir, studio, kancing, plastik, hangtag, tali hangtag, merk, pin, kain keras, Poin Denny, Poin Haikal) awalnya hanya didefinisikan **sekali, di dalam** `calcTotal()`, sebagai array lokal yang tidak diekspor. Ketika komponen lain (kartu detail, share card) perlu menampilkan ulang breakdown itu dari data yang **sudah tersimpan** (bukan dari form yang sedang dibuka), penulis kode sebelumnya menulis ulang versi ringkas secara manual — hanya mengambil 4 field yang ada di tabel `hpp_template` sebagai kolom langsung (`upah_jahit`, `bordir`, `biaya_studio`, `kancing_qty`), dan lupa/tidak menyertakan 8 komponen lain yang sebenarnya juga tersimpan (baik via `hpp_config` langsung, maupun via `config_snapshot` yang dibekukan di setiap template). Kalkulator HPP dibangun terpisah lagi, sebagai alat estimasi cepat yang dari awal tidak pernah dihubungkan ke `hpp_config` sama sekali.

Pola akar masalahnya: **satu formula, ditulis ulang manual di beberapa tempat, dengan cakupan yang berbeda-beda** — persis pola yang sama dengan bug "Stok Bahan Keluar selalu 0" yang pernah diinvestigasi sebelumnya di modul ini.

## File yang Diubah

| File | Perubahan |
|---|---|
| `apps/admin/src/features/produksi-hpp/utils.js` | Ekstrak `biayaLainBreakdown()` sebagai fungsi terpisah & diekspor (murni reorganisasi — `calcTotal()` sekarang memanggilnya, angka hasil TIDAK berubah). |
| `apps/admin/src/features/produksi-hpp/components/HppTemplateDetailSheet.jsx` | Breakdown "Biaya Lain" diganti dari rekonstruksi manual (4 field) menjadi `biayaLainBreakdown(..., config: tpl.config_snapshot)` — kini menampilkan seluruh 8+ komponen termasuk Poin Denny & Poin Haikal. |
| `apps/admin/src/features/produksi-hpp/components/HPPShareCard.jsx` | `biayaLain` diganti ke `biayaLainBreakdown()` yang sama — "Total Biaya Bahan" (hasil agregat `total_hpp − biayaLain`) kini akurat, tidak lagi ter-inflasi oleh Poin/kemasan yang tidak tercatat. |
| `apps/admin/src/features/produksi-hpp/components/KalkulatorHPP.jsx` **(baru)** | Diekstrak dari fungsi inline di `ProduksiHPPPage.jsx`. Field "Operasional" (manual, tidak representatif) dihapus, diganti komponen Harga Dasar otomatis (`biayaLainBreakdown` dengan `upah_jahit=bordir=kancing_qty=biaya_studio=0` supaya tidak dobel dengan slider "Upah & Jasa" milik Kalkulator sendiri). |
| `apps/admin/src/features/produksi-hpp/components/ProduksiHPPPage.jsx` | Import `KalkulatorHPP` dari file baru, hapus definisi inline-nya, teruskan prop `config` ke Kalkulator (sebelumnya tidak diteruskan sama sekali). |
| `apps/admin/src/features/produksi-hpp/utils.test.js` | Tambah test `biayaLainBreakdown` (Poin selalu ikut, ambil dari config bukan hardcode, tidak menimpa nilai 0 eksplisit) dan `calcTotal` (regresi angka tidak berubah, no double counting). |
| `apps/admin/src/features/produksi-hpp/components/HppTemplateDetailSheet.test.jsx` | Tambah test regresi: Poin Denny/Haikal tampil, memakai `config_snapshot` bukan config terkini, baris Poin hilang saat nilainya memang 0. |
| `apps/admin/src/features/produksi-hpp/components/HPPShareCard.test.jsx` **(baru — sebelumnya tidak ada test)** | Test lengkap: Poin tampil, Total Biaya Bahan tidak ter-inflasi, Bahan + Biaya Lain = Total HPP. |
| `apps/admin/src/features/produksi-hpp/components/KalkulatorHPP.test.jsx` **(baru)** | Test: field Operasional sudah tidak ada, seluruh 8 komponen Harga Dasar tampil, total sesuai perhitungan. |
| `apps/admin/src/features/produksi-hpp/components/ProduksiHPPPage.test.jsx` | Update mock `KalkulatorHPP`, tambah test bahwa `config` diteruskan dengan benar. |

Tidak ada perubahan skema database, tidak ada perubahan alur bisnis (create/edit/delete Template HPP, alur Batch Produksi, dan cara Share tetap sama persis) — seluruhnya perbaikan di layer tampilan/kalkulasi turunan.

## Mengapa Bug Bisa Terjadi

Duplikasi logika tanpa satu sumber kebenaran (single source of truth). `calcTotal()` benar sejak awal untuk alur create/edit, tapi begitu data itu perlu ditampilkan ulang di konteks lain (setelah tersimpan, atau di alat estimasi terpisah), tidak ada mekanisme yang memaksa breakdown tersebut memakai definisi yang sama — sehingga penulisan ulang manual dengan cakupan tidak lengkap lolos tanpa terdeteksi (tidak ada test yang membandingkan breakdown yang ditampilkan dengan breakdown yang dipakai saat menyimpan).

## Solusi yang Diterapkan

1. **Satu fungsi, banyak pemakai** — `biayaLainBreakdown()` diekstrak dari `calcTotal()` dan diekspor. Semua tempat yang perlu menampilkan breakdown biaya non-bahan (baik saat form masih terbuka, saat template sudah tersimpan, saat mau di-share, maupun di Kalkulator) sekarang memanggil fungsi yang sama — tidak ada lagi rumus kedua yang bisa diam-diam berbeda cakupannya.
2. **Rekonstruksi dari `config_snapshot`** — untuk data yang sudah tersimpan (`HppTemplateDetailSheet`, `HPPShareCard`), breakdown dihitung ulang dari `tpl.config_snapshot` (nilai Harga Dasar yang dibekukan pas template itu disimpan), bukan config Harga Dasar terkini — supaya breakdown yang ditampilkan selalu cocok persis dengan `total_hpp` yang sudah ada di database, walau Harga Dasar sudah berubah sejak itu.
3. **Kalkulator HPP dihubungkan ke Harga Dasar** — bukan menambah angka tetap, tapi memanggil `biayaLainBreakdown()` dengan `config` asli dari `useHppConfig()`, supaya estimasinya otomatis ikut berubah kalau Harga Dasar diubah admin.
4. **Tidak ada hardcode angka** — di seluruh perubahan, tidak ada satupun `+ 10000` atau semacamnya ditambahkan ke hasil akhir. Semua angka Poin datang dari `hpp_config`/`config_snapshot`.

## Skenario yang Diuji

Total **41 test baru/diperbarui** di modul ini untuk investigasi ini (di luar test Screen 1/2 sebelumnya), semuanya lulus:

1. `biayaLainBreakdown()` selalu menyertakan Poin Denny + Poin Haikal, mengambil nilai dari `config` (bukan hardcode), fallback ke default 10.000 hanya saat key benar-benar `undefined` (bukan menimpa nilai 0 yang sengaja diset admin).
2. `calcTotal()` — total bertambah tepat Rp20.000 saat kedua Poin diaktifkan dari 0; breakdown yang dikembalikan menyertakan Poin; `total = biayaKain + Σbreakdown` tanpa double counting; regresi angka skenario tetap (Rp112.300) untuk memastikan ekstraksi fungsi tidak mengubah hasil.
3. `HppTemplateDetailSheet` — Poin tampil meski `tpl` tidak punya `config_snapshot` (fallback default); memakai nilai dari `config_snapshot` yang dibekukan (bukan config terkini) saat tersedia; baris Poin hilang kalau nilainya memang eksplisit 0 (tidak dipaksa muncul).
4. `HPPShareCard` — Poin & seluruh komponen kemasan tampil sebagai baris "Biaya Lain"; "Total Biaya Bahan" tidak lagi ter-inflasi; Bahan + Biaya Lain menjumlah tepat ke Total HPP; fallback config default saat `config_snapshot` null (template lama).
5. `KalkulatorHPP` — field "Operasional" sudah tidak ada; seluruh 8 komponen Harga Dasar (termasuk Poin) tampil di breakdown; total sesuai perhitungan manual; reset mengembalikan input pengguna tanpa menghapus baris Harga Dasar (karena itu bukan input manual).
6. `ProduksiHPPPage` — `config` diteruskan dengan benar ke `KalkulatorHPP` (sebelumnya sama sekali tidak diteruskan).
7. Regresi penuh: seluruh test lama di `produksi-hpp` (`HPPForm`, `HPPCard`, `api.js`, `queries.js`, `hooks.js`, `HargaDasarPanel`, dst.) tetap lulus tanpa modifikasi — memastikan alur create/edit/delete Template HPP dan Harga Dasar tidak terpengaruh.
8. Truncation-scan (`esbuild`) dan `npm run build:admin` — bersih, tanpa error.
