# Migration Plan — FINAL (Architecture Review Pass)

**Peran:** Principal Software Engineer + Database Architect (second-pass, adversarial review)
**Dokumen ini MENGGANTIKAN prioritas & desain di `MIGRATION_ROADMAP.md`** — bukan ringkasan ulang, tapi hasil menantang tiap rekomendasi di dokumen itu dengan asumsi sistem ini akan hidup bertahun-tahun di production.
**Sifat dokumen:** Rencana final saja. Tidak ada kode, tidak ada SQL, tidak ada implementasi.

---

## 0. Cara Saya Melakukan Review Ini

Untuk tiap 19 temuan di roadmap awal, saya bertanya lima hal:

1. Apakah jenis solusinya (RPC/View/Trigger/dst) benar-benar yang paling sederhana yang cukup — atau saya over-engineer?
2. Kalau ini diimplementasikan persis seperti yang saya tulis, **bug/insiden apa yang masih bisa lolos**?
3. Apakah rekomendasi saya sendiri diam-diam mengulangi masalah yang sedang saya coba perbaiki (misalnya: RPC yang menutup satu celah "percaya client" tapi diam-diam membuka celah "percaya client" yang lain)?
4. Apa yang terjadi kalau ini di-deploy ke production yang sudah berjalan (bukan database kosong)?
5. Bagaimana cara membatalkannya kalau ternyata salah?

Hasilnya: beberapa rekomendasi saya **konfirmasi apa adanya**, beberapa saya **turunkan kompleksitasnya** (ternyata saya over-engineer), beberapa saya **naikkan kompleksitasnya/perbaiki** (ternyata ada celah yang saya lewatkan sendiri), dan saya temukan **satu kelas masalah sistemik** yang tidak muncul sama sekali di draft pertama.

---

## 1. Temuan Sistemik — Berlaku untuk HAMPIR SEMUA Item, Wajib Diputuskan Dulu Sebelum Implementasi Apa Pun

Ini bagian terpenting dari review ini. Kalau lima hal di bawah tidak diputuskan lebih dulu sebagai **konvensi seluruh proyek**, setiap RPC yang diimplementasikan satu-satu akan mengulang kesalahan desain yang sama, dan kita akan menemukan celah ini lagi satu per satu — persis seperti bug duplikat POS yang polanya baru ditemukan setelah terjadi di production.

### 1.1 🔴 Celah yang saya lewatkan di rekomendasi saya sendiri: RPC yang menerima identitas user sebagai parameter dari client

Di draft pertama saya merekomendasikan RPC seperti `approve_transfer(transfer_id, approver_email)`, `finalize_gajian(...)`, `apply_kasbon_payment(..., sumber)`. **Ini masih salah** — kalau `approver_email` dikirim sebagai parameter biasa dari client, siapa pun yang bisa memanggil RPC ini (dengan `anon`/`authenticated` key) bisa mengirim email siapa saja sebagai "approver", termasuk email admin lain. RPC ini menutup race condition, tapi **tidak** menutup celah "user bisa mengaku jadi orang lain" — yang notabene adalah salah satu validasi bisnis yang justru ingin saya perkuat (§3.1.1 di roadmap awal: "tidak bisa approve transfer sendiri").

**Perbaikan wajib:** Semua RPC yang perlu tahu "siapa yang melakukan aksi ini" **wajib** mengambil identitas dari sesi terautentikasi Supabase (`auth.uid()` dan turunannya, dilihat dari dalam function via `auth.jwt()` atau join ke tabel user), **bukan** menerima email/id sebagai parameter yang dikirim client. Ini berlaku untuk SEMUA RPC di roadmap awal yang menyebut parameter seperti `approver_email`, `userEmail`, `sumber` (kasbon) — treat parameter semacam ini sebagai bau kode (code smell) yang harus dihilangkan di desain final tiap RPC.

**Konsekuensi turunan:** Function-function ini harus jalan sebagai `SECURITY INVOKER` (default) sebisa mungkin, bukan otomatis `SECURITY DEFINER`, supaya `auth.uid()` di dalam function tetap mengacu ke user yang benar-benar memanggil, bukan ke pemilik function. `SECURITY DEFINER` hanya dipakai kalau function itu memang butuh privilege lebih tinggi dari RLS caller (misalnya menulis ke tabel yang RLS-nya membatasi ke role tertentu) — dan kalau dipakai, wajib validasi otorisasi secara eksplisit DI DALAM function (karena RLS caller tidak lagi otomatis berlaku), bukan diasumsikan aman karena "cuma dipanggil dari UI yang sudah login".

### 1.2 🔴 Idempotency belum dibahas sama sekali di draft pertama — ini krusial untuk semua P0

`apps/pos` offline-first: kalau RPC dipanggil lalu koneksi putus SEBELUM client menerima response (tapi SESUDAH server commit), client tidak tahu apakah operasi berhasil atau tidak. Pola retry yang sudah ada di codebase (`flushPendingSales`) akan mencoba lagi — kalau RPC "pengurangan stok" dipanggil dua kali untuk transaksi yang sama, stok akan berkurang dua kali untuk satu penjualan.

**Perbaikan wajib:** Semua RPC yang bisa dipanggil ulang oleh mekanisme retry (terutama §RPC #2 pengurangan stok POS, tapi berlaku juga untuk approve transfer & finalize gajian kalau UI-nya punya tombol yang bisa ter-double-click atau retry otomatis) **wajib idempotent**. Cara paling murah: RPC menerima semacam idempotency key (bisa berupa id lokal transaksi yang sudah ada, seperti `sale.id`/`transfer.id`), dan sebelum mengeksekusi efek samping, cek dulu apakah operasi dengan key itu sudah pernah tercatat sukses (misal: `stok_adjustments` sudah pernah diterapkan untuk `sale_id` ini) — kalau sudah, langsung return sukses tanpa mengulang efek.

**Revisi desain untuk RPC #2 (pengurangan stok POS):** Draft pertama saya memisahkan "insert sale" dan "kurangi stok" sebagai dua langkah (RPC hanya membungkus langkah kedua). Ini **kurang tepat** — kalau di antara dua langkah itu koneksi putus, hasilnya sale tercatat tanpa stok berkurang (atau sebaliknya kalau urutan dibalik). **Desain yang benar:** SATU RPC `create_sale(sale_payload jsonb, client_sale_id uuid)` yang melakukan insert ke `sales` DAN penyesuaian `stok_warna` dalam SATU transaksi, dengan `client_sale_id` sebagai idempotency key (kolom `UNIQUE`, kalau RPC dipanggil ulang dengan id yang sama, `ON CONFLICT DO NOTHING` lalu return baris yang sudah ada). Ini menaikkan sedikit kompleksitas RPC #2 dari perkiraan awal, tapi menutup celah yang draft pertama lewatkan.

### 1.3 🟠 Deadlock ordering — perlu untuk semua RPC yang mengunci >1 baris

RPC approve transfer (§1 roadmap) dan create_sale (§2, direvisi di atas) sama-sama melakukan `UPDATE`/lock pada beberapa baris `stok_warna` dalam satu transaksi (satu per item). Kalau dua transaksi yang berjalan bersamaan mengunci baris-baris yang sama tapi dengan **urutan berbeda** (transaksi A: item X lalu Y; transaksi B: item Y lalu X), Postgres bisa mendeteksi ini sebagai **deadlock** dan membatalkan salah satu transaksi secara paksa dengan error.

**Perbaikan wajib:** Di dalam SEMUA RPC yang melakukan multi-row lock pada `stok_warna` (atau tabel lain yang sama), item **wajib diurutkan dulu** dengan urutan yang konsisten (misalnya `ORDER BY kode, size, warna`) sebelum di-loop untuk update — supaya semua transaksi yang bersaing selalu mengunci dalam urutan yang sama, sehingga tidak ada deadlock, hanya antrian (yang jauh lebih aman, walau sedikit menunggu).

### 1.4 🟡 Constraint sebagai "defense in depth" — jangan andalkan RPC saja

Draft pertama menempatkan validasi (stok tidak boleh minus, transfer tidak boleh approve diri sendiri, dst) **di dalam** RPC. Ini benar sebagai lapisan pertama, tapi kalau suatu saat ada jalur lain yang menulis ke tabel yang sama (migrasi data manual, script maintenance, RPC baru yang lupa memanggil validasi yang sama, atau — skenario paling realistis — developer masa depan yang menambah fitur dan lupa ada aturan ini), tidak ada apa pun di level tabel yang mencegahnya.

**Perbaikan wajib (checklist constraint minimal, independen dari RPC manapun):**
- `stok_warna`: `CHECK (gudang >= 0 AND cideng >= 0 AND tegalgubug >= 0)` — baris terakhir pertahanan kalau logika oversell-prevention di RPC ada bug atau dilewati.
- `kasbon`: `CHECK (sisa >= 0)` dan `CHECK (sisa <= jumlah)`.
- `transfers.transfer_no`: `UNIQUE` — saat ini di-generate client-side dengan 3 digit random (900 kemungkinan), risiko tabrakan nyata kalau volume transfer tinggi. Constraint ini murah untuk ditambahkan dan **tidak perlu menunggu** RPC approve_transfer selesai dikerjakan — bisa jalan duluan, independen, risiko nyaris nol.
- `gajian_minggu.tanggal_sabtu`: `UNIQUE` — mencegah race condition "buat periode duplikat" (§createGajianPeriode di roadmap awal) tanpa perlu RPC sama sekali, cukup constraint. Ini juga bisa dikerjakan duluan.
- `sampel.status`: `CHECK (status IN ('draft','approved','rejected'))` — kalau belum ada.

Poin penting: **dua item di atas (transfer_no UNIQUE, tanggal_sabtu UNIQUE) sebaiknya dipindah ke Fase 0** — sebelum RPC apa pun — karena risiko implementasinya nyaris nol (constraint pada kolom yang seharusnya memang unik secara bisnis) tapi langsung menutup race condition nyata, tanpa perlu menunggu desain RPC yang lebih besar selesai.

### 1.5 🟡 Index yang hilang — FK columns TIDAK otomatis ter-index di Postgres

Ini poin yang sepenuhnya absen dari draft pertama. Postgres, tidak seperti sebagian orang kira, **tidak otomatis membuat index pada kolom foreign key**. Semua tabel `gaji_potong`, `gaji_jahit`, `gaji_finishing`, `gaji_qc`, `gaji_kreatif`, `gaji_cmt` di-query terus-menerus dengan `WHERE gajian_id = X` (lihat §3.4.4 roadmap awal — `fetchGajianTotals` menjalankan ini 6 kali). Kalau `gajian_id` di keenam tabel itu tidak punya index eksplisit, setiap query itu adalah **sequential scan** — akan terasa lambat begitu histori gajian menumpuk bertahun-tahun, terlepas dari apakah nanti tetap pakai 6 fetch terpisah (§3.4.4 lama) atau sudah dipindah ke View/RPC (§3.4.4 revisi) — karena View/RPC pun tetap butuh index yang sama di baliknya.

**Checklist index minimal (independen dari keputusan RPC/View, harus ada bagaimanapun):**
- `gaji_potong`, `gaji_jahit`, `gaji_finishing`, `gaji_qc`, `gaji_kreatif`, `gaji_cmt` — index pada `gajian_id`.
- `kasbon` — index komposit `(karyawan_id, status)` untuk `getKasbonBelumLunasByKaryawanIds`.
- `transfers` — index pada `status`, dan pada `created_by` (dipakai validasi "bukan approve punya sendiri").
- `produksi_batch` — index pada `tanggal_produksi` (range query laporan bulanan).
- `bahan_pembelian`, `bahan_pinjam` — index komposit `(status_bayar, jatuh_tempo)` untuk query tagihan jatuh tempo.
- `product_history` — index pada `changed_at` (order by + range filter) dan `category` (filter dropdown) kalau belum ada.
- `sales` — index pada `date` dan `location` (dipakai hampir semua laporan) kalau belum ada; ini independen dari keputusan jsonb-GIN vs normalisasi `sale_items` di §1.6.

Ini semua **berisiko sangat rendah untuk ditambahkan** (index tidak mengubah perilaku aplikasi, hanya mempercepat query) dan bisa dikerjakan di Fase 0, paralel dengan apa pun.

### 1.6 🟠 Keputusan arsitektur yang tertunda di draft pertama: normalisasi `sale_items`

Di roadmap awal saya menyebut "pertimbangkan tabel `sale_items` ternormalisasi" sebagai catatan sampingan di §3.1.5, padahal ini sebenarnya **keputusan fondasi** yang memengaruhi setidaknya 4 temuan lain: riwayat penjualan per produk (§3.1.5), profit per item (§3.2.3), mesin BEP (§3.4.1), dan laporan produksi (harga jual rata-rata, §3.1.7). Membiarkan `items` sebagai `jsonb` di tabel `sales` berarti **setiap** laporan yang butuh query per-item harus menulis ulang logika `jsonb_array_elements` + GIN index yang mahal untuk write — empat kali, dengan gaya query yang berbeda-beda tiap kali ditulis developer berbeda.

**Rekomendasi final:** Perlakukan normalisasi `sale_items` (satu baris per item per transaksi, dengan kolom `sale_id`, `kode`, `size`, `warna`, `qty`, `harga`, `hpp`) sebagai **keputusan arsitektur terpisah, di depan semua temuan lain yang bergantung padanya** — bukan detail implementasi di salah satu RPC. `items` jsonb di `sales` tetap dipertahankan sebagai snapshot sumber kebenaran (untuk struk, riwayat edit, kompatibilitas mundur), tapi `sale_items` jadi tabel turunan yang di-populate BERSAMAAN saat insert (via trigger `AFTER INSERT ON sales`, atau langsung di dalam RPC `create_sale` hasil revisi §1.2) — supaya laporan yang butuh agregasi per-item punya tabel relasional biasa dengan index normal (BTree), bukan harus selalu lewat jsonb GIN yang lebih mahal dan kurang fleksibel untuk JOIN.

**Trade-off yang harus disadari:** Ini menambah satu tabel baru dan satu trigger/langkah tambahan di setiap insert sale — kompleksitas naik dibanding pendekatan jsonb-GIN-index murni. Tapi untuk sistem yang **diasumsikan hidup bertahun-tahun** (syarat eksplisit dari Denny di prompt ini), ini investasi yang tepat: query per-item jadi query SQL biasa yang bisa dipahami developer baru dalam hitungan menit, bukan harus belajar sintaks jsonb dulu.

### 1.7 🟡 Risiko rollout yang sepenuhnya baru: PWA/service worker cache

Keempat aplikasi ini adalah PWA (ada `usePushSubscription`, service worker tersirat dari konteks mobile-first). Begitu RPC baru di-deploy ke Supabase, **client lama (JS bundle lama yang masih tersimpan di cache browser pengguna)** masih akan memanggil pola lama (misalnya masih melakukan SELECT-lalu-UPDATE manual, bukan RPC baru) sampai mereka refresh dan dapat bundle baru. Ini berarti selama masa transisi, **dua jalur penulisan berbeda ke tabel yang sama** bisa aktif bersamaan — satu lewat RPC baru (aman), satu masih lewat kode lama (masih punya race condition).

**Perbaikan wajib:** Sebelum menghapus/menonaktifkan jalur lama, pastikan constraint di §1.4 sudah aktif duluan (jadi bahkan kalau client lama masih menulis lewat jalur tidak aman, constraint tetap mencegah data rusak — walau mungkin muncul error ke user, itu jauh lebih baik daripada data korup diam-diam). Setelah constraint aktif, RPC baru bisa dinaikkan bertahap, dan jalur lama SEBAIKNYA tetap dibiarkan hidup (tidak langsung dihapus dari kode) selama 1-2 siklus rilis sebagai fallback, dipantau lewat log, baru dihapus setelah yakin traffic ke jalur lama sudah nol.

---

## 2. Review Item per Item (Revisi terhadap Roadmap Awal)

Format: **Verdict** (DIKONFIRMASI / DIREVISI / DITURUNKAN / DINAIKKAN) lalu alasan singkat. Nomor mengacu ke `MIGRATION_ROADMAP.md`.

### §3.1.1 — Approve Transfer (RPC, P0)
**Verdict: DIKONFIRMASI + DIREVISI (lihat §1.1, §1.3).** RPC tetap jenis yang tepat — ini genuinely butuh row locking + business rule + multi-table write dalam satu transaksi, tidak ada alternatif lebih sederhana yang tetap aman. **Wajib** menambahkan: (a) ambil identitas approver dari `auth.uid()`, bukan parameter; (b) urutkan item sebelum lock (cegah deadlock); (c) idempotency check kalau UI approve punya kemungkinan double-submit (tombol approve biasanya bukan retry-prone seperti POS, tapi tetap disiplinkan sama). **Testing wajib:** simulasi 2 RPC call konkuren yang approve transfer berbeda tapi menyentuh item stok yang sama — verifikasi hasil akhir benar dan tidak ada deadlock error yang tidak tertangani.

### §3.1.3 — Kalkulasi HPP (Trigger, P1)
**Verdict: DIREVISI — pertimbangkan Generated Column, bukan Trigger, kalau semua input ada dalam baris yang sama.** Kalau `hpp_template.total_hpp` bisa dihitung murni dari kolom-kolom di baris yang sama (`bahan_items` jsonb + `upah_jahit` + `bordir` + dst + `config_snapshot` yang SUDAH disnapshot di baris itu sendiri), maka `GENERATED ALWAYS AS (...) STORED` lebih sederhana dan lebih kuat dari trigger: **tidak mungkin lupa dipasang** di jalur insert baru manapun (trigger bisa saja tidak ter-attach kalau ada yang membuat tabel baru dengan cara CREATE TABLE LIKE tanpa trigger-nya ikut, generated column adalah bagian permanen dari definisi kolom). Trigger baru diperlukan KALAU kalkulasi butuh data dari tabel lain di luar baris itu sendiri (query ke `hpp_config` yang terpisah, bukan snapshot) — periksa dulu apakah `config_snapshot` yang sudah ada di `hpp_template` cukup sebagai sumber, sebelum memutuskan trigger vs generated column. **Kompleksitas turun dari Sedang ke Rendah-Sedang** kalau generated column memungkinkan.

### §3.1.4 — Agregasi Stok per Kode (View, P2)
**Verdict: DIKONFIRMASI.** View sederhana, risiko rendah, langsung mengikuti pola `v_stok_bahan` yang sudah terbukti. Tidak ada revisi. **Tambahan:** pastikan index pada `stok_warna(kode)` ada untuk mempercepat `GROUP BY` di view ini — kemungkinan sudah ada lewat constraint UNIQUE(kode,size,warna), tapi perlu diverifikasi index itu bisa dipakai untuk GROUP BY kode saja (composite index biasanya bisa, karena kode adalah kolom pertama).

### §3.1.5 — Riwayat Penjualan per Produk (RPC + GIN index, P1)
**Verdict: DIREVISI — jadikan bagian dari keputusan normalisasi `sale_items` di §1.6, bukan solusi jsonb-GIN berdiri sendiri.** Kalau `sale_items` sudah dinormalisasi, ini menjadi query SQL biasa (`SELECT location, SUM(qty) FROM sale_items WHERE kode=$1 GROUP BY location`) dengan index BTree normal — jauh lebih murah dan gampang dipahami daripada RPC berisi `jsonb_array_elements`. **Prioritas naik menjadi bagian dari Fase 1 (fondasi), bukan berdiri sendiri di P1.**

### §3.1.6 — Buku Potongan (View, P2)
**Verdict: DIKONFIRMASI, dengan catatan.** `FULL OUTER JOIN` antara dua tabel di-`GROUP BY` dulu untuk salah satu sisi (stok_warna perlu di-aggregate lintas lokasi dulu sebelum di-join ke expected_stok per kode+size+warna) — pastikan desain view memperhitungkan ini supaya tidak salah hitung (row multiplication kalau join dilakukan sebelum aggregate). Bukan alasan mengubah jenis solusi (View tetap benar), hanya catatan implementasi untuk nanti.

### §3.1.7 — Laporan Produksi Bulanan + Total All-Time (View + Materialized View + RPC, P2)
**Verdict: DITURUNKAN — Materialized View untuk total all-time kemungkinan besar OVER-ENGINEERING.** Volume realistis `produksi_batch` untuk bisnis fashion skala ini (beberapa batch per hari) kemungkinan tetap di kisaran puluhan ribu baris bahkan setelah bertahun-tahun — `SUM`/`COUNT` dengan index yang tepat pada tabel sebesar itu masih sangat cepat di Postgres (milidetik), tidak butuh materialized view (yang menambah kompleksitas refresh-strategy untuk manfaat yang belum tentu terasa). **Revisi:** cukup **View biasa** (atau RPC ringan) dengan index `produksi_batch(tanggal_produksi)`. Materialized view baru dipertimbangkan ulang KALAU nanti terbukti lambat secara terukur (bukan diasumsikan di depan). Laporan bulanan (RPC dengan parameter tanggal) tetap seperti rencana awal — itu genuinely butuh parameter jadi View biasa tidak cukup, RPC/parameterized view yang tepat.

### §3.1.8 — Deteksi & Gabung Bahan Duplikat (RPC + Constraint, P3)
**Verdict: DIKONFIRMASI, dengan peringatan migrasi yang lebih tegas.** Sebelum menambahkan `UNIQUE constraint`, **wajib** jalankan dulu query deteksi terhadap data production yang ada sekarang untuk melihat: (a) berapa banyak "duplikat" yang sebenarnya sudah ada, (b) apakah semuanya benar-benar human error atau ada yang memang sah (beli bahan sama 2x di hari sama itu valid secara bisnis). Constraint yang dipasang tanpa langkah ini bisa memblokir input yang sah di masa depan atau gagal dipasang sama sekali karena data existing sudah melanggarnya. Ini murni migration-risk, bukan mengubah jenis solusi.

### §3.1.9 — Workflow Status Sampel (RPC + Constraint, P2)
**Verdict: DIKONFIRMASI, kompleksitas dikonfirmasi Rendah-Sedang (bukan diturunkan lebih jauh).** Ini kandidat RPC kecil yang jelas — bukan over-engineering, karena "all-or-nothing" pada batch approve/reject memang butuh transaksi eksplisit yang saat ini tidak ada (`Promise.all` bukan transaksi). Tidak ada revisi jenis solusi.

### §3.1.10 — Audit Log via Trigger (P4)
**Verdict: DINAIKKAN kehati-hatiannya — TIDAK direkomendasikan sebagai pengganti, hanya pelengkap opsional untuk tabel paling kritis.** Pada refleksi ulang, mengubah `logHistory()` sepenuhnya jadi trigger generik punya downside nyata: trigger yang menangkap before/after secara generik akan menghasilkan snapshot mentah (seluruh row lama vs baru), bukan ringkasan human-readable yang dirancang sengaja seperti sekarang (`nama`, `kode`, deskripsi singkat per action type) — audit log jadi kurang enak dibaca manusia. **Revisi rekomendasi:** biarkan `logHistory()` di application layer seperti sekarang (sudah didesain best-effort dengan benar), TAPI pertimbangkan trigger tambahan **hanya** sebagai jaring pengaman kedua (bukan pengganti) pada tabel-tabel paling kritis yang sudah diidentifikasi butuh audit tak-terputus: `gajian_minggu` (transisi ke final) dan `stok_warna`/`kasbon` (perubahan saldo) — trigger ini cukup mencatat "sesuatu berubah, oleh siapa, kapan" secara kasar, bukan menggantikan log naratif yang sudah ada.

### §3.2.1 — Pengurangan Stok POS (RPC, P0)
**Verdict: DIREVISI SIGNIFIKAN — lihat §1.2.** Digabung dengan insert sale jadi satu RPC atomik dengan idempotency key, bukan RPC terpisah yang hanya membungkus penyesuaian stok. Ini perubahan desain paling penting dari seluruh review ini karena POS adalah aplikasi offline-first — kegagalan menutup celah "sale tercatat tanpa stok berkurang (atau sebaliknya)" akan jauh lebih sering terjadi di sini dibanding di aplikasi lain yang online-only.

### §3.2.2 — Total Transaksi POS (Trigger, P1)
**Verdict: DIREVISI — Generated Column, sama seperti §3.1.3.** `sales.total` bisa dihitung murni dari `sales.items` (jsonb, in-row) dan `sales.discount` (in-row) — tidak butuh lookup ke tabel lain. Ini kandidat kuat untuk `GENERATED ALWAYS AS (...) STORED` (Postgres bisa menjalankan fungsi jsonb di dalam generated column selama fungsinya `IMMUTABLE`). Ini LEBIH KUAT dari trigger karena tidak mungkin lupa dipasang, dan otomatis berlaku juga untuk `useUpdateSale` maupun `useCreateSale` tanpa perlu dua trigger terpisah atau khawatir salah satu jalur insert lupa memicu trigger.

### §3.2.3 — Profit per Item (SQL Function, P2)
**Verdict: DIKONFIRMASI, tapi jadi prasyarat kecil untuk §1.6, bukan berdiri sendiri.** Kalau `sale_items` dinormalisasi, `item_profit` paling gampang jadi generated column juga di tabel `sale_items` (`(harga - hpp) * qty`), bukan SQL Function terpisah yang dipanggil manual. Sederhanakan sesuai keputusan §1.6.

### §3.4.1 — Mesin BEP (View + Materialized View + RPC, P1, kompleksitas Tinggi)
**Verdict: DIREVISI ARSITEKTURnya, kompleksitas TETAP Tinggi (bukan turun) tapi levelnya lebih tepat sasaran.** Draft awal mengusulkan materialized view yang di-refresh oleh trigger setiap ada `sales` baru — ini **berbahaya untuk sistem write-heavy**: `REFRESH MATERIALIZED VIEW` (bahkan versi `CONCURRENTLY`) adalah operasi yang relatif berat, dan memicunya di setiap transaksi kasir akan memperlambat setiap checkout POS demi mempercepat dashboard BEP yang dilihat sesekali — pertukaran yang salah arah. **Revisi:** pisahkan hari yang sudah "tutup buku" (kemarin dan sebelumnya — datanya tidak akan berubah lagi) dari hari berjalan (hari ini — masih bisa berubah). Data historis (immutable) disimpan di tabel ringkasan biasa (bukan materialized view yang di-refresh ulang, tapi tabel yang di-`INSERT` sekali per hari lewat scheduled job/cron ringan saat hari itu berakhir, ATAU di-maintain incremental lewat trigger yang menambah delta — bukan refresh penuh). Saldo hari ini dihitung LIVE (murah, karena cuma satu hari data) di atas saldo akumulasi hari-hari sebelumnya yang sudah tersimpan. Pola ini (ledger dengan running-balance yang di-checkpoint per periode, bukan direplay dari nol) adalah pola akuntansi standar dan jauh lebih aman untuk sistem yang dipakai bertahun-tahun. **Testing wajib diperberat**: bandingkan output pendekatan baru vs fungsi JS lama untuk SETIAP hari dalam data historis yang ada sebelum cutover — bukan sample, karena modul ini sudah terbukti riskan salah logika (lihat komentar "dobel hitung utang" di kode aslinya).

### §3.4.2 — Ledger Kasbon (RPC, P0/P1)
**Verdict: DIKONFIRMASI + DIREVISI (lihat §1.1, §1.4).** RPC tetap benar. Tambahkan: (a) `sumber` TIDAK dikirim sebagai parameter bebas — derive dari konteks pemanggilan (kalau dipanggil dari alur finalize_gajian, RPC finalize_gajian sendiri yang tahu itu "dari gajian", bukan client yang menyatakan); (b) constraint `sisa >= 0` sebagai jaring pengaman independen (§1.4); (c) pertimbangkan normalisasi `cicilan` jsonb ke tabel `kasbon_cicilan` terpisah untuk skala jangka panjang — dicatat sebagai **peningkatan masa depan (bukan blocker P0)**, karena volume cicilan per kasbon row realistis masih kecil (belasan entri), tidak mendesak seperti `sale_items`.

### §3.4.3 — Kalkulasi Upah per Tim (Trigger + generated column `selisih_manual`, P1)
**Verdict: DIKONFIRMASI sebagai konsep, DIREVISI mekanismenya — generated column untuk `expected_upah`, trigger (atau tetap generated column) untuk `selisih_manual`.** Sama alasan §3.1.3/§3.2.2: kalau `finance_config` di-snapshot ke masing-masing baris `gaji_*` saat disimpan (perlu dipastikan ini terjadi — kalau config berubah setelah entri disimpan, hasil generated column bisa berubah retroaktif kalau TIDAK di-snapshot, yang salah), maka generated column lebih aman dari trigger. **Prasyarat yang harus dipastikan dulu:** apakah `finance_config` di-snapshot per baris (seperti pola `config_snapshot` di `hpp_template`) atau selalu dibaca live dari tabel `finance_config` terpisah saat form dibuka. Kalau live (bukan snapshot), generated column TIDAK aman dipakai (nilai bisa berubah historis kalau tarif berubah) — trigger `BEFORE INSERT` (bukan `UPDATE`, supaya nilai terkunci di titik input, tidak berubah kalau tarif berubah nanti) yang menyalin nilai tarif SAAT ITU jadi kolom snapshot di baris yang sama, baru generated column dihitung dari snapshot itu. Ini detail yang harus diverifikasi dulu terhadap skema `gaji_*` yang sebenarnya sebelum memilih antara trigger vs generated column.

### §3.4.4 — Agregasi Total Gajian (View, P1)
**Verdict: DIKONFIRMASI, DIPERSEMPIT jadi View saja (hapus opsi RPC dari draft awal).** Draft pertama menawarkan "View atau RPC" secara ambigu — final: **View saja**. RPC di sini menambah lapisan tanpa manfaat karena tidak butuh parameter kompleks atau side-effect, cukup `SELECT` yang di-filter `WHERE gajian_id = X` dari luar. Kurangi permukaan kode yang perlu dirawat (developer experience).

### §3.4.5 — Finalisasi Gajian (RPC, P0)
**Verdict: DIKONFIRMASI + DITAMBAH langkah yang hilang total dari draft awal.** Draft awal tidak membahas: (a) row lock pada `gajian_minggu` (`SELECT...FOR UPDATE`) untuk mencegah entri tim baru masuk PAS SAAT finalize berjalan; (b) validasi status masih `'draft'` sebelum finalize (cegah finalize dobel); (c) **yang paling penting dan sama sekali absen dari draft awal: tidak ada rencana untuk skenario "gajian sudah final, ternyata ada kesalahan, bagaimana cara mengoreksinya?"** Payroll di dunia nyata SELALU butuh jalur koreksi (karyawan komplain kurang bayar, entri salah ketik ditemukan setelah final). Kalau tidak didesain sejak awal, tim akan terpaksa langsung `UPDATE` manual ke baris final di production, yang justru merusak jaminan "final = tidak bisa diubah diam-diam" yang coba dibangun. **Rekomendasi baru:** desain pola "reopen" eksplisit — `status` bisa `final → dikoreksi` lewat RPC terpisah `reopen_gajian(gajian_id, alasan)` yang mencatat SIAPA & KENAPA (wajib alasan, tidak boleh kosong) sebelum mengizinkan edit lagi, lalu proses finalize ulang. Ini bukan detail kecil — ini keputusan desain yang harus ada SEBELUM implementasi, bukan ditambal belakangan.

### §3.4.6 — Dashboard Finance (View + RPC, P2)
**Verdict: DIKONFIRMASI.** Skala data (pettycash all-time) masih realistis untuk plain aggregate view, tidak butuh materialized view. Tidak ada revisi.

### Item lain (§3.1.2 duplikat dari §3.2.1, §3.3 catalog, §3.4.7 WA text, §3.5 shared minor)
**Verdict: DIKONFIRMASI seperti draft awal.** Tidak ditemukan celah tambahan pada review kedua ini.

---

## 3. Checklist Konsolidasi — Constraint & Index yang WAJIB Ada (Independen dari Timeline RPC)

Ini daftar tunggal, gabungan dari §1.4 dan §1.5, supaya tim implementasi punya satu checklist yang bisa dikerjakan di awal tanpa menunggu desain RPC besar manapun selesai:

**Constraint:**
- `stok_warna`: CHECK gudang/cideng/tegalgubug >= 0
- `kasbon`: CHECK sisa >= 0 DAN sisa <= jumlah
- `transfers.transfer_no`: UNIQUE
- `gajian_minggu.tanggal_sabtu`: UNIQUE
- `sampel.status`: CHECK IN ('draft','approved','rejected') — verifikasi belum ada

**Index (FK & kolom filter yang sering dipakai):**
- `gaji_potong/jahit/finishing/qc/kreatif/cmt(gajian_id)`
- `kasbon(karyawan_id, status)`
- `transfers(status)`, `transfers(created_by)`
- `produksi_batch(tanggal_produksi)`
- `bahan_pembelian(status_bayar, jatuh_tempo)`, `bahan_pinjam(status_bayar, jatuh_tempo)`
- `product_history(changed_at)`, `product_history(category)`
- `sales(date)`, `sales(location)`

---

## 4. Kebutuhan Testing (Berlaku Lintas Semua Fase)

- **Unit test SQL (pgTAP atau setara):** tiap generated column & function murni (HPP, total transaksi, expected_upah) — verifikasi hasil terhadap kasus tepi (nilai 0, negatif, array kosong).
- **Concurrency test (WAJIB untuk semua RPC P0):** simulasikan 2+ pemanggilan RPC bersamaan yang menyentuh baris sama (approve transfer, create_sale, kasbon payment, finalize gajian) — verifikasi tidak ada data hilang/salah, dan deadlock (kalau terjadi) tertangani dengan retry, bukan bikin transaksi user gagal permanen.
- **Migration rehearsal:** karena proyek ini TIDAK punya automated migration runner (dicatat di `DEPLOYMENT.md`, dan sudah terbukti jadi sumber drift sebelumnya di sesi audit awal), setiap constraint/index/RPC baru wajib diuji dulu terhadap **salinan data production** (bukan database kosong) sebelum dijalankan di production asli — terutama constraint UNIQUE/CHECK yang bisa gagal dipasang kalau data existing sudah melanggarnya.
- **Regression test BEP:** bandingkan output arsitektur baru vs fungsi JS lama untuk seluruh rentang tanggal historis yang ada, bukan sample acak — modul ini sudah terbukti sensitif terhadap kesalahan logika di masa lalu.
- **Rollback rehearsal:** untuk tiap RPC/trigger baru, pastikan `DROP FUNCTION`/`DROP TRIGGER` sudah dicoba di staging dan tidak meninggalkan sistem dalam state yang lebih rusak dari sebelum migrasi (terutama untuk generated column — menghapus generated column butuh `ALTER TABLE`, yang pada tabel besar bisa memicu table rewrite/lock; rencanakan jendela maintenance kalau tabel target sudah besar).

---

## 5. Rencana Fase Final (Revisi)

**Fase 0 — Nyaris tanpa risiko, tidak perlu menunggu apa pun (kerjakan duluan, paralel dengan apa saja).**
Seluruh checklist §3 (constraint + index). Ini murni penambahan, tidak mengubah perilaku aplikasi yang ada, dan langsung menutup beberapa race condition (transfer_no, tanggal_sabtu) tanpa perlu RPC sama sekali.

**Fase 1 — Fondasi yang jadi prasyarat banyak temuan lain.**
Keputusan & implementasi normalisasi `sale_items` (§1.6). Ini bukan "satu fitur", tapi mengubah dasar dari 4 temuan lain — kerjakan ini SEBELUM riwayat penjualan per produk, profit per item, dan (sebagian) BEP.

**Fase 2 — Tutup celah integritas data kritis (P0, dengan revisi §1.1–§1.3 WAJIB diterapkan ke semuanya).**
`create_sale` atomik+idempotent (POS), `approve_transfer` (admin), `finalize_gajian` + desain "reopen" (finance), `apply_kasbon_payment` (finance). Semua RPC di fase ini wajib: identitas dari `auth.uid()`, item locking berurutan, idempotency key kalau relevan.

**Fase 3 — Kunci kalkulasi finansial via generated column (lebih sederhana dari rencana trigger awal).**
`sales.total`, `hpp_template.total_hpp` (setelah verifikasi config ter-snapshot), `gaji_*.selisih_manual` (setelah verifikasi snapshot tarif). Ini sekarang jauh lebih sederhana dari perkiraan draft awal karena pakai generated column, bukan trigger — kerjakan setelah Fase 2 karena beberapa bergantung pada struktur data yang sama.

**Fase 4 — Migrasi BEP dengan arsitektur ledger-checkpoint (direvisi dari materialized-view-refresh-by-trigger).**
Paling kompleks, sisihkan waktu testing terbanyak, jangan digabung jadwalnya dengan fase lain.

**Fase 5 — Efisiensi laporan & dashboard (View biasa, BUKAN materialized view kecuali terbukti perlu).**
Agregasi stok per kode, buku potongan, laporan produksi (view+RPC parameterized, tanpa materialized view — direvisi turun dari draft awal), dashboard finance, agregasi total gajian.

**Fase 6 — Pembersihan & pencegahan.**
Deteksi/gabung duplikat bahan (dengan verifikasi data dulu), workflow status sampel, audit log trigger sebagai pelengkap (bukan pengganti) di tabel paling kritis saja.

---

## 6. Satu Kalimat Kesimpulan

Draft pertama benar soal *masalahnya apa*; review ini mengoreksi *bagaimana cara menutupnya tanpa membuka celah baru* — terutama soal identitas user yang harus datang dari sesi terautentikasi (bukan parameter), idempotency untuk aplikasi offline-first, generated column sebagai alternatif yang lebih kuat dari trigger di banyak kasus, dan satu keputusan arsitektur (`sale_items`) yang sebelumnya tersembunyi sebagai catatan kecil padahal jadi fondasi separuh temuan lain.
