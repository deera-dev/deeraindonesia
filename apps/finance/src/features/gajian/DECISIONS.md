# Keputusan Desain — Fitur Gajian (Finance)

Dokumen ini menampung alasan desain & aturan bisnis yang sebelumnya numpuk
sebagai komentar panjang di `api.js`/`utils.js`/`hooks.js`. Kode di sana
sekarang cuma menyisakan pointer pendek ke sini (`// lihat DECISIONS.md §N`).
Kalau sebuah keputusan berubah, update di SINI, bukan menulis ulang narasi
panjang di kode.

**Catatan pola berulang:** beberapa fungsi di `api.js` baca/tulis tabel
Supabase milik app lain secara langsung (`jahit_cards`, `produksi_batch`,
`hpp_template` — semua milik Admin). Ini BUKAN pelanggaran Dependency
Inversion — yang dilarang adalah komponen/modul React app lain diimpor
langsung; baca-tulis tabel Supabase yang sama-sama dipakai lintas app itu
sah (lihat CLAUDE.md §4 & §7). Catatan ini tidak diulang lagi per fungsi di
bawah.

## 1. Rekonsiliasi Stok Masuk dari Finishing

**File:** `api.js` (`loadFinishingReconciliation`, `applyFinishingStockIntake`,
`fetchStokMasukLogByKode`) · `utils.js` (`buildReconciliationRow`,
`buildKodeReconciliation`, `buildManualRowsFromLog`,
`newManualReconciliationRow`) · `FinishingStockModal.jsx`

- Form Finishing cuma catat kode + total pcs, tanpa breakdown size/warna —
  padahal `stok_warna` butuh size+warna. Breakdown diambil dari kartu Kanban
  Jahit (`jahit_cards`) berstatus `ready_finishing` untuk kode yang sama.
- **Mismatch:** kalau total qty kartu ≠ jumlah yang dicatat Finance (atau
  belum ada kartu sama sekali), kode ditandai mismatch — modal menampilkan
  peringatan dan baris kosong untuk dikoreksi/diisi manual.
- **Qty ditambahkan** = `max(0, qtyKartu − stokSaatIni − terjualSaatIni)` —
  kalau hasilnya minus berarti barang sudah kebawa ke pasar/terjual duluan
  sebelum Finishing resmi selesai, jadi tidak usah nambah stok lagi.
- **Baris manual WAJIB mulai kosong** (`""`, bukan `0`) — placeholder saja,
  bukan pre-fill ("saya gamau default 0, maunya placeholder aja").
- **Rekonsiliasi ULANG** (semua kartu kode itu sudah "done"): baris manual
  di-seed dari riwayat `stok_masuk_log` terakhir per size+warna, qty lama
  jadi PLACEHOLDER (bukan value) — supaya admin tidak mulai dari nol tapi
  juga tidak ke-submit ulang otomatis.
- `applyFinishingStockIntake` jalan **berurutan** (bukan `Promise.all`) per
  baris: increment stok (RPC atomik `increment_stok_gudang`) → tandai kartu
  `done` (kalau dari kartu asli) → catat `stok_masuk_log`. Kalau satu baris
  gagal di tengah, baris sebelumnya yang sudah sukses TETAP tersimpan (tidak
  di-rollback) — aman karena RPC-nya idempotent.

## 2. Sinkronisasi Otomatis Kartu Jahit Kanban dari Finalisasi Gajian

**File:** `api.js` (`syncJahitCardsFromGajian`) · `utils.js`
(`buildJahitContributionsByKode`, `buildJahitCardSync`) · `hooks.js`
(`useFinalizeGajian`)

**Latar:** admin sering kekurangan tangan untuk jalanin papan Jahit manual
(assign penjahit → geser On Progress → Ready Finishing → tandai Selesai),
kartu suka kelewat/menumpuk. Begitu Finance sudah mencatat gaji Jahit
(siapa kerjain kode apa, berapa pcs) DAN Finishing kode yang sama di
periode yang sama, itu sudah cukup bukti kartu selesai — papan Jahit
disinkron otomatis saat Finalisasi Gajian.

- **Trigger & urutan:** dipanggil dari `useFinalizeGajian`, PALING TERAKHIR
  (setelah totals, kasbon, reimburse pettycash) — supaya transaksi finansial
  yang penting tetap sukses duluan kalau langkah sync ini gagal.
- **Error handling:** SENGAJA gagal-keras (error dilempar, tidak ditelan) —
  kebalikan dari sync Kancing HPP (§4) — supaya admin tahu kalau papan Jahit
  perlu dicek manual.
- **Idempotent:** aman dipanggil berulang untuk periode yang sama — kartu
  yang sudah `done` tidak pernah diambil lagi.
- **Aturan matching** (dikonfirmasi Denny lewat opsi "Recommended"):
  - Kartu diurutkan `created_at` ASC — kartu paling lama dibuat diselesaikan
    duluan.
  - Total qty yang ditandai selesai = sebanyak angka di gaji Jahit untuk
    kode itu. Sisa kartu (reject / belum sempat dijahit semua) DIBIARKAN —
    tidak dipaksa selesai, supaya reject tetap kelihatan/bisa ditelusuri.
  - Warna/ukuran kartu diabaikan sepenuhnya — murni ikuti ANGKA per
    penjahit ("tidak peduli warna siapa penjahit yang mengerjakan").
  - Kalau kode yang sama dikerjakan >1 penjahit: penjahit pertama
    "menghabiskan" kartu-kartu awal sejumlah qty-nya, baru lanjut ke
    penjahit berikutnya (urutan ikut urutan baris gaji Jahit).
  - Satu kartu = satu unit ATOMIK, tidak dipecah lintas 2 penjahit — kalau
    qty kartu melebihi sisa kuota penjahit saat ini, kartu itu tetap
    sepenuhnya "milik" penjahit itu. Ini bisa menghasilkan atribusi yang
    sedikit tidak presisi kalau angkanya tidak pas — trade-off yang
    diterima demi kesederhanaan aturan.

## 3. Kancing per-pcs & Lubang (Finishing)

**File:** `utils.js` (`calcKancingQty`, `deriveKancingPerPcs`,
`calcLubangQty`, `newProduk`)

- Field Kancing diisi PER PCS (dulu total manual, admin harus kalikan
  sendiri) — total dihitung otomatis (`jumlah × kancing_per_pcs`).
- Lubang: opsional per produk (toggle `pakai_lubang`), qty-nya field
  terpisah dari Kancing (`lubang_per_pcs`) — jumlah lubang tidak selalu
  sama dengan jumlah kancing.
- `deriveKancingPerPcs`: fallback untuk record lama yang cuma nyimpan total
  `kancing_qty` tanpa `kancing_per_pcs` (dibuat sebelum fitur per-pcs ada) —
  supaya buka-edit record lama tidak kehilangan nilai kancing.

## 4. Sinkronisasi Dua-Arah Kancing HPP ↔ Finishing

**File:** `api.js` (`fetchKancingHppByKode`, `syncKancingHppFromFinishing`)
· `hooks.js` (`useSaveFinishing`) · `FinishingForm.jsx` (`deriveItem`)

"Kalau di HPP kancingnya sudah tertulis, otomatis default value di
Finishing — begitupun sebaliknya, kalau HPP kancingnya belum ada, lalu di
Finishing diinput, otomatis HPP-nya ikut terisi."

- **Arah HPP → Finishing:** `fetchKancingHppByKode` + fallback placeholder
  di `FinishingForm.jsx` (`deriveItem`). Bukan pre-fill paksa.
- **Arah Finishing → HPP:** `syncKancingHppFromFinishing`, dipanggil
  setelah `saveFinishing` sukses. HANYA update kalau: (1) Template HPP kode
  itu SUDAH ADA — tidak auto-create, karena Template HPP butuh banyak field
  lain yang tidak diketahui Finance; DAN (2) `kancing_qty` template masih
  KOSONG/0 — tidak pernah menimpa nilai yang sudah sengaja diisi admin
  Produksi.
- **Error handling:** SENGAJA ditelan diam-diam (try/catch lokal di
  `useSaveFinishing`) — kebalikan dari sync Jahit Kanban (§2). Penyimpanan
  Finishing sendiri sudah pasti sukses saat baris ini jalan; kalau errornya
  dilempar ke atas, toast "Gagal: ..." jadi menyesatkan (seolah Finishing
  gagal tersimpan, padahal cuma sinkronisasi HPP pelengkapnya yang gagal).
  Ini murni kenyamanan pengisian form, jadi lebih aman gagal senyap.

## 5. Auto-isi Jumlah QC dari Total Finishing

**File:** `utils.js` (`sumFinishingItemsJumlah`) · `QCForm.jsx`

"Diambil dari total baju yang telah selesai di finishing ... dengan opsi
bisa edit." Dijumlah dari SEMUA kode di satu entri Finishing periode ini
(bukan per-kode) — contoh: kode 001 20pcs + 002 5pcs + 003 10pcs = 35pcs
total, auto-isi Jumlah QC saat tambah entri baru (bukan saat edit).

## 6. Auto-select Dropdown 1 Opsi

**File:** `utils.js` (`autoSelectIfSingle`) · `FinishingStockModal.jsx`

"Untuk setiap dropdown, kalau pilihannya hanya ada 1 opsi, maka otomatis
terpilih, tetapi jika lebih dari 1 jangan ada yang dipilih dulu." Dipakai
untuk dropdown Ukuran/Warna baris manual — produk dengan 1 varian ukuran
atau 1 warna langsung terisi otomatis.

## 7. Upah Tukang Jahit — Dua Sumber

**File:** `api.js` (`fetchUpahJahitByKode`, `fetchUpahJahitHistoryByKode`)
· `hooks.js` (`useUpahJahitMap`, `useUpahJahitHistoryMap`) · `JahitForm.jsx`

- `fetchUpahJahitByKode`: estimasi dari `produksi_batch.upah_jahit`, ambil
  batch TERBARU per kode.
- `fetchUpahJahitHistoryByKode`: upah AKTUAL yang benar-benar sudah pernah
  dibayar (riwayat `gaji_jahit.kartu_items`) — ini PRIORITAS UTAMA saat
  auto-isi "Upah/pcs" di `JahitForm`, supaya karyawan berbeda yang
  mengerjakan kode yang sama otomatis dapat upah konsisten dengan histori
  pembayaran nyata, bukan sekadar estimasi produksi yang mungkin belum
  pernah dibayarkan.

## 8. Acuan Pilih Produk di Finishing

**File:** `api.js` (`fetchProduksiTotalByKode`, `fetchKancingHppByKode`) ·
`hooks.js` (`useProduksiTotalMap`, `useKancingHppMap`) · `FinishingForm.jsx`

"Jumlah bisa sesuai dengan produksi, sedangkan kancing bisa sesuai dengan
HPP." Dua map ini HANYA info pembanding ("Acuan: Produksi X pcs · HPP
Kancing Y/pcs" saat pilih kode) — TIDAK otomatis mengisi field, karena
jumlah pcs Finishing aktual bisa lebih sedikit dari total produksi (belum
semua selesai difinishing).

## 9. "Beli Gas" & "Persiapan ATK" (Ringkasan Gaji)

**File:** `utils.js` (`BELI_GAS_LABEL`, `BELI_GAS_AMOUNT`,
`PERSIAPAN_ATK_LABEL`, `otherTambahan`, `buildTambahanPayload`) ·
`TabRingkasan.jsx`

Checkbox "Beli Gas" (nominal tetap Rp100.000) + input manual "Persiapan
ATK" (placeholder, bukan default 0), selain "Uang Denny & Wulan Terpakai"
(§10) yang sudah ada.

**Desain:** SENGAJA tidak menambah kolom baru di `gajian_minggu` — dua-duanya
disimpan sebagai entri biasa di kolom `tambahan` (jsonb array) yang sudah
ada, dengan label baku, supaya otomatis ikut kehitung di
`sumTambahan`/`calcTotalRequest` dan otomatis muncul di ringkasan & teks WA
(`generateWAText` sudah iterasi `tambahan` generik) — tanpa ubah skema atau
logic totals. `otherTambahan()` memisahkan keduanya dari daftar "Tambahan
Lain" freeform supaya tidak diedit dari dua tempat berbeda.

## 10. "Uang Denny & Wulan Terpakai" (Reimburse Petty Cash)

**File:** `utils.js` (`pettycashTerpakaiFromSaldo`) · `hooks.js`
(`usePettycashTerpakai`, `useFinalizeGajian`) · `TabRingkasan.jsx`

- = bagian saldo Petty Cash yang **MINUS** (saldo = total isi − total
  keluar) — BUKAN total pengeluaran "keluar" all-time. Artinya pengeluaran
  petty cash sudah melebihi topup, selisihnya sudah ditalangi dari kantong
  Denny & Wulan dan perlu diganti lewat gajian minggu ini. Saldo
  positif/nol → hasilnya 0 (tidak ada yang perlu diganti).
- Dipakai switch "Tambahkan Pettycash?" di `TabRingkasan` (default ON) —
  saat menyala, nilai Pettycash otomatis mengikuti angka ini, tidak diketik
  manual.
- `useFinalizeGajian` otomatis mencatat isi-ulang Petty Cash sebesar angka
  ini saat finalisasi — dulu ini langkah manual terpisah (buka halaman
  Petty Cash, catat "Isi Ulang" senilai yang sama) supaya saldo tidak terus
  minus/dobel dihitung minggu berikutnya.

## 11. Urutan Operasi Finalisasi Gajian

**File:** `hooks.js` (`useFinalizeGajian`)

`finalizeGajian` (kunci status + totals) → terapkan tiap potongan kasbon
sebagai cicilan (`features/kasbon`) → reimburse pettycash (§10) → sync
Jahit Kanban (§2, PALING TERAKHIR, boleh gagal tanpa membatalkan yang di
atas). Aman dipanggil cuma sekali per periode karena tombol "Finalisasi
Gajian" hilang begitu `gajian.status === "final"` (lihat `TabRingkasan.jsx`).
