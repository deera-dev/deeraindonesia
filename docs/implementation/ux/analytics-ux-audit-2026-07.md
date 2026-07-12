# Laporan Implementasi — Audit UX Lanjutan, Hilangkan Duplikasi Analytics, & Redesign Back to Top Seluruh Aplikasi
**Tanggal:** 13 Juli 2026
**Cakupan:** `apps/admin/src/features/analytics/` (lanjutan), `packages/shared/components/BackToTop.jsx` + `hooks/useScrollVisibility.js` (baru), `AdminBottomNav`/`FinanceBottomNav`/`PosBottomNav`, seluruh halaman ber-scroll panjang di 3 app (Admin/Finance/POS).

Dokumen ini melanjutkan `Laporan_Implementasi_Analytics_Redesign_2026-07.md` (SQL fix + redesign UI/UX pertama). Isi di sini murni bagian **audit lanjutan** yang diminta setelah redesign pertama selesai: (1) evaluasi ulang Analytics sebagai UX/Product Designer — bukan sekadar cek requirement terpenuhi, (2) hilangkan duplikasi informasi lintas halaman, (3) redesign total fitur Back to Top untuk SELURUH aplikasi (bukan cuma Analytics), (4) audit konsistensi UX aplikasi secara luas. Setiap keputusan di bawah disertai alasan Product Design-nya, sesuai permintaan — bukan cuma daftar file yang berubah.

---

## Bagian C — Audit UX Lanjutan Analytics: Hilangkan Duplikasi

### C.1 Cara mengaudit

Redesign pertama (lihat laporan sebelumnya) sudah membenahi navigasi, istilah, dan kepadatan halaman. Audit lanjutan ini menjawab pertanyaan yang berbeda: **setelah semua section "benar" secara individual, apakah ada informasi yang tampil berulang tanpa alasan, dan apakah tiap halaman betul-betul membantu keputusan (bukan cuma memajang angka)?** Caranya bukan membaca komponen satu-satu, tapi menelusuri dari mana setiap angka berasal (`hooks.js`) dan membandingkan section-section yang judulnya mirip di halaman berbeda.

### C.2 Temuan #1 (bug nyata) — "Performa Terbaik" di Ringkasan Bisnis = duplikat 1:1 dari "Sorotan" di Ringkasan Penjualan

**Yang ditemukan:** `ExecutiveTab.jsx` (Ringkasan Bisnis) punya section "Performa Terbaik" yang menampilkan `bestProduct`/`bestCustomer`/`bestMarket`. Ditelusuri ke `hooks.js`, ketiga field ini ternyata di-assign **langsung** dari `overview.quickInsight.produkTerlaris` / `.customerTerbaik` / `.pasarTerbaik` — objek yang SAMA PERSIS yang sudah ditampilkan penuh di section "Sorotan" pada `OverviewTab.jsx` (Ringkasan Penjualan). Bukan mirip — literal objek yang sama, hanya diberi nama variabel berbeda.

**Kenapa ini masalah:** Ini contoh persis dari kekhawatiran yang disampaikan — "KPI yang sama muncul di Executive dan Overview tanpa alasan". Pemilik toko yang buka Ringkasan Bisnis lalu Ringkasan Penjualan akan melihat produk/pelanggan/cabang terbaik yang SAMA dua kali, tanpa informasi tambahan, tanpa membantu keputusan baru apa pun di kunjungan kedua.

**Keputusan:** Section "Performa Terbaik" **dihapus** (bukan disingkat/disembunyikan) dari `ExecutiveTab.jsx`. Prinsip yang dipakai: *tampilkan versi lengkap hanya di halaman yang paling tepat*. "Sorotan" tetap di Ringkasan Penjualan karena itu memang halaman yang secara tematik membahas performa penjualan per entitas. Ringkasan Bisnis tetap punya "Cabang Terbaik" dkk secara tidak langsung — lewat Rekomendasi ("Fokuskan promosi di cabang X") yang justru actionable, bukan cuma angka.

**Kenapa dihapus, bukan disembunyikan di `<details>`:** Karena datanya BENAR-BENAR nol nilai tambah di halaman ini (bukan sekadar "terlalu detail untuk tampilan default" — kasus itu yang dipakai `<details>` di section lain). Kalau disembunyikan di accordion, pemilik toko yang membukanya tetap akan bingung "kenapa ini sama dengan yang di halaman satunya?". Menghapus lebih jujur daripada menyembunyikan sesuatu yang memang tidak perlu ada.

Field `bestProduct`/`bestCustomer`/`bestMarket` di `hooks.js` **sengaja tidak dihapus** dari return value hook (hanya tidak dikonsumsi lagi oleh komponen) — supaya tidak mengubah kontrak `useAnalyticsExecutive()` yang mungkin dipakai/diuji di tempat lain, sesuai prinsip "perubahan aditif, bukan breaking" yang konsisten dipakai sepanjang proyek ini.

### C.3 Temuan #2 (bug nyata, ditemukan tidak sengaja saat memperbaiki #2) — Label "Persentase Keuntungan" muncul 2× di halaman yang SAMA

Saat memperbaiki istilah (lihat C.4), label item "Kesehatan Bisnis" untuk margin diberi nama "Persentase Keuntungan" — tapi ternyata `ExecutiveTab.jsx` **sudah punya** KPI card berjudul persis sama ("Persentase Keuntungan") di section "Kondisi Bisnis Hari Ini", 4 baris di atasnya. Efeknya: satu halaman menampilkan tulisan "Persentase Keuntungan" dua kali — sekali sebagai angka besar (KPI), sekali sebagai baris status hijau/kuning/merah.

**Keputusan:** Baris status di "Kesehatan Bisnis" diberi nama **"Status Keuntungan"**, bukan "Persentase Keuntungan". Alasannya bukan sekadar menghindari tabrakan teks — kedua section itu memang menjawab pertanyaan berbeda: KPI card menjawab *"berapa persennya?"*, baris Kesehatan Bisnis menjawab *"apakah itu sehat?"* (indikator warna). Memberi nama yang berbeda membuat perbedaan fungsi itu eksplisit, bukan terlihat seperti pengulangan yang tidak disengaja. Detail angka di baris status tetap ditampilkan (persen yang sama) karena tanpa angka, indikator warna saja tidak informatif — tapi labelnya sekarang menandakan ini "status", bukan "angka lagi".

### C.4 Temuan #3 — Fungsi pembentuk kalimat (`utils.js`) masih mengeluarkan istilah Inggris/teknis

Redesign pertama menerjemahkan label statis di JSX, tapi melewatkan string yang **dibentuk secara dinamis** oleh fungsi murni di `utils.js` (`buildBusinessHealth`, `buildBiggestRisk`, `buildExecutiveInsights`, `buildRecommendations`) — karena audit sebelumnya fokus ke label JSX, bukan ke output fungsi. Contoh yang ditemukan dan diperbaiki:

| Sebelum (bocor dari `utils.js`) | Sesudah |
|---|---|
| `"Revenue (MoM)"` | `"Penjualan (Bulan ke Bulan)"` |
| `"Margin Portfolio"` | `"Status Keuntungan"` (lihat C.3) |
| `"Return Rate"` | `"Tingkat Retur"` |
| `"Dead Stock"` (kategori risiko) | `"Stok Tidak Bergerak"` |
| `"Margin portofolio saat ini 24,0%."` | `"Persentase keuntungan keseluruhan saat ini 24,0%."` |
| `"Top 5 produk menyumbang 62.1% dari total revenue."` | `"5 produk teratas menyumbang 62.1% dari total penjualan."` |
| `"Evaluasi harga/HPP produk margin negatif: ..."` | `"Evaluasi harga/modal produk yang terjual rugi: ..."` |
| Nama lokasi mentah (`"cideng"`) di kalimat rekomendasi | `LOCATION_LABELS["cideng"]` → `"Cideng"` (diimpor dari `@deera/shared/lib/marketDay`, sumber kebenaran yang sama dipakai di seluruh halaman lain) |

**Kenapa ini penting secara UX, bukan cuma kosmetik:** Insight dan rekomendasi adalah bagian paling "dibaca" dari Ringkasan Bisnis (kalimat naratif, bukan angka di tabel) — istilah teknis yang bocor di sana lebih merusak kepercayaan pemilik toko dibanding di label KPI, karena kalimat naratif terasa seperti "penjelasan langsung untuk saya", jadi kalau ada kata Inggris di tengahnya terasa aneh/tidak selesai diterjemahkan.

Seluruh perubahan di atas murni string formatting — logika klasifikasi (threshold hijau/kuning/merah, pengurutan, filter data) di setiap fungsi **tidak disentuh sama sekali**, jadi tidak ada risiko perubahan business logic.

### C.5 Temuan #4 — "Ringkasan per Cabang" muncul di 2 halaman (Ringkasan Penjualan & Pasar): dipertahankan, bukan dihapus

**Yang ditemukan:** `OverviewTab.jsx` dan `MarketsTab.jsx` (halaman "Pasar") sama-sama punya section berjudul persis "Ringkasan per Cabang", dengan kartu per lokasi yang tampilannya sangat mirip (Penjualan/Keuntungan/Jumlah Terjual).

**Kenapa TIDAK dihapus (beda dari temuan #1):** Setelah ditelusuri, keduanya menampilkan **data yang berbeda secara sengaja**, bukan duplikat murni. Versi di Ringkasan Penjualan mengikuti Global Filter Bar aktif (tanggal/lokasi yang dipilih pemilik toko) — cocok untuk pertanyaan *"bagaimana performa cabang PADA PERIODE yang sedang saya lihat?"*. Versi di halaman Pasar sengaja mengabaikan filter (selalu tampilkan seluruh cabang apa adanya, sudah didokumentasikan di kode sejak redesign pertama) dan dilengkapi tombol "Lihat Detail" yang membuka `MarketDetailPanel` — cocok untuk pertanyaan *"bagaimana gambaran lengkap semua cabang, di luar filter yang sedang aktif?"*. Ini pola "ringkasan di beranda kategori + halaman detail penuh" yang sama dipakai di banyak aplikasi bagus (mis. ringkasan langkah harian di layar utama, breakdown lengkap di halaman terpisah) — bukan kesalahan desain.

**Yang tetap diperbaiki:** Judul section yang identik padahal datanya bisa berbeda (satu ikut filter, satu tidak) berisiko bikin pemilik toko bingung "kok angkanya beda antara dua halaman ini?". Ditambahkan **1 kalimat penjelas** di deskripsi masing-masing section (bukan cuma di komentar kode) yang menyebutkan perbedaan dan mengarahkan ke halaman satunya — di Ringkasan Penjualan: *"...Untuk detail lengkap semua cabang tanpa filter, buka halaman Pasar."*; komentar berimbang ditambahkan juga di `MarketsTab.jsx` menjelaskan hubungan sebaliknya. Ini menerapkan instruksi *"halaman lain cukup tampilkan ringkasan singkat atau arahkan ke halaman tersebut"* — dalam bentuk penjelasan tekstual, karena kedua section sama-sama valid untuk tetap ada (bukan kasus "satu section harus jadi rujukan tunggal").

**Kenapa tidak dibuatkan tautan navigasi fungsional (tombol "buka Pasar"):** `AnalyticsPage.jsx` saat ini menyimpan halaman aktif sebagai `useState` lokal tanpa mekanisme lintas-komponen untuk berpindah section dari dalam tab lain. Membuat tautan yang benar-benar berfungsi berarti mengubah kontrak props seluruh 9 komponen tab (menambah callback navigasi) — perubahan struktural yang di luar skala "audit UX, perbaiki yang aman", jadi didokumentasikan sebagai rekomendasi (lihat §F, Rekomendasi) alih-alih dikerjakan sekarang dengan risiko regresi di 9 halaman sekaligus.

### C.6 Bagian yang diperiksa tapi TIDAK diubah (dan alasannya)

- **"Pelanggan Terbaik" (top-3 leaderboard) vs "Ranking Pelanggan" (daftar lengkap, collapsed) di `CustomersTab.jsx`** — ini BUKAN duplikasi bermasalah, ini pola "ringkasan + lihat semua" yang benar (sudah diterapkan sejak redesign pertama). Ranking Pelanggan sengaja collapsed karena top-3-nya sudah cukup untuk kebanyakan kunjungan.
- **KPI "Total Penjualan"/"Keuntungan" muncul di Ringkasan Bisnis DAN Ringkasan Penjualan** — dipertahankan dengan alasan sama seperti C.5: Ringkasan Bisnis adalah beranda (butuh angka headline tanpa pindah halaman), Ringkasan Penjualan adalah laporan detailnya (6 KPI vs 4 KPI, bukan salinan identik). Pola "ringkasan di beranda + laporan detail" ini konsisten dipakai di seluruh redesign, jadi diperlakukan sebagai desain yang benar, bukan cacat yang perlu diseragamkan paksa.
- **"Persentase Keuntungan Keseluruhan" di `AdvancedTab.jsx` (Analisis Lanjutan)** — angka yang sama juga muncul di Ringkasan Bisnis & Ringkasan Penjualan. Diperlakukan sama seperti KPI headline lain: Analisis Lanjutan adalah halaman "gali lebih dalam" untuk pengguna yang sengaja mencari detail (margin risk per produk, breakdown ABC, dst), jadi KPI headline di paling atas tetap berguna sebagai konteks sebelum masuk ke accordion detail — bukan section yang berdiri sendiri tanpa tujuan.
- **"Saran Restock Berdasarkan Prediksi" (halaman Prediksi Penjualan, daftar lengkap) vs "Peluang Terbesar"/Tindakan Prioritas (Ringkasan Bisnis, top-3)** — sumber data sama (`forecast.restockForecast`), tapi ini pola ringkasan (top-N paling mendesak) vs detail (daftar lengkap semua produk) yang sama seperti kasus Pelanggan Terbaik/Ranking Pelanggan — bukan duplikasi tanpa alasan.

### C.7 Verifikasi

Seluruh 20 file test di `features/analytics/` yang bersinggungan dengan perubahan Bagian C dijalankan ulang: `ExecutiveTab.test.jsx` (20), `OverviewTab.test.jsx` (11), `MarketsTab.test.jsx` (12), `utils.test.js` (85), `hooks.test.js` (56), plus 6 tab lain yang tidak diubah tapi diverifikasi tetap hijau (`AdvancedTab` 20, `CustomersTab` 12, `InventoryTab` 12, `ForecastTab` 12, `ProductsTab` 14, `TrendsTab` 10, `MarketDetailPanel` 8, `AnalyticsPage` 16) — **total 288 test, seluruhnya PASSED**, tidak ada regresi ke fitur yang tidak diubah.

Regression test baru ditambahkan di `ExecutiveTab.test.jsx` untuk mengunci temuan #1 (`queryByText("Performa Terbaik")` harus `not.toBeInTheDocument()`), supaya kalau ada yang menambahkan section itu lagi di masa depan tanpa sadar, test akan gagal.

---

## Bagian D — Redesign Back to Top: Satu Komponen, Satu Perilaku, Seluruh Aplikasi

### D.1 Audit kondisi sebelumnya

`BackToTop` sebelumnya sudah ada sebagai komponen di `packages/shared/components/`, tapi API-nya mengandalkan prop `bottomClass` (string Tailwind manual, mis. `"bottom-24"`) yang harus di-set SENDIRI oleh setiap halaman pemanggil. Audit ke seluruh pemakaian (grep ke 60 file, dipersempit ke ~12 halaman konsumen nyata) menemukan bahwa desain "harus diingat manual per halaman" ini sudah menyebabkan 4 bug nyata, bukan cuma "terasa tidak konsisten" secara subjektif:

1. **3 dari 5 halaman Produksi merender `<BackToTop/>` DUA KALI** (`ProduksiRecordPage.jsx`, `ProduksiHPPPage.jsx`, `ProduksiBahanPage.jsx`) — dua tombol mengambang bertumpuk di layar yang sama.
2. **`AdminPage.jsx` meng-import `BackToTop` tapi tidak pernah me-render-nya** — dead import, dan yang lebih mengkhawatirkan: ada mock test untuk komponen ini yang sudah lama ada tapi TIDAK PERNAH diberi assertion, jadi bug ini lolos tanpa terdeteksi test selama ini.
3. **Aplikasi Finance sama sekali tidak punya Back to Top di halaman manapun** — padahal halaman seperti daftar Gajian atau riwayat Kas bisa panjang.
4. **Class `safe-area-inset-bottom`** yang dipakai di `AdminBottomNav.jsx` dan `FinanceBottomNav.jsx` untuk memberi jarak dari home indicator iPhone **tidak pernah benar-benar terdefinisi** di CSS manapun di seluruh repo (bukan utility Tailwind bawaan, tidak ada `@layer` custom) — sehingga secara diam-diam TIDAK melakukan apa pun sejak awal ditulis. `PosBottomNav.jsx` bahkan tidak punya penanganan safe-area sama sekali.

Temuan ini mengonfirmasi masalah yang disampaikan ("hanya tersedia di sebagian halaman, tidak konsisten, kadang hilang sama sekali") bukan cuma soal selera visual, tapi bug fungsional nyata yang tidak pernah tertangkap karena tidak ada satu sumber kebenaran untuk perilaku ini.

### D.2 Kenapa desain baru: "Extended FAB" bersudut siku, bukan pil/kaca/lingkaran

Beberapa pola dipertimbangkan (Extended FAB, Floating Pill, Floating Glass, Floating Chip, Docked Button, Floating Toolbar, Sticky Scroll Indicator). Dipilih **Extended FAB** (ikon panah + label "ATAS", bukan cuma lingkaran ikon polos) karena:

- **Lebih mudah dikenali dari sudut mata** dibanding lingkaran kecil — ada teks pendek yang langsung menjelaskan fungsinya, penting untuk pemilik toko yang belum tentu familiar dengan konvensi ikon "panah ke atas = kembali ke atas".
- **Target sentuh lebih besar** (min. 48×48px sesuai syarat aksesibilitas) — bentuk memanjang secara alami memberi area tap lebih luas dibanding lingkaran kecil dengan diameter sama.

**Bentuknya SENGAJA bersudut siku (`border-2 border-skin-bdr`, bukan `rounded-full`/pil melengkung seperti Material Design pada umumnya)** — ini penyimpangan yang disengaja dari konvensi Extended FAB standar, karena SELURUH Design System aplikasi ini (kartu, tombol, modal, input) memakai border tegas bersudut siku bergaya "editorial" (lihat `border-skin-bdr`, `border-2` di berbagai komponen), tidak ada elemen melengkung besar di manapun. Memakai FAB berbentuk pil bulat akan jadi satu-satunya elemen melengkung di seluruh aplikasi — konsisten dengan Design System yang ada dinilai lebih penting daripada mengikuti konvensi Material Design secara literal.

### D.3 Kenapa offset otomatis, bukan lagi prop manual

API lama (`bottomClass="bottom-24"`) diganti `withBottomNav` (boolean, default `true`) dan `offsetPx` (override eksplisit, opsional). Nilai default (88px + `env(safe-area-inset-bottom)`) dihitung supaya cukup tinggi untuk membersihkan bottom nav TERTINGGI dari ketiga app (Admin 64px, Finance 56px, POS ±62px) dengan margin — jadi halaman baru otomatis dapat perilaku benar tanpa perlu tahu tinggi persis bottom nav app tempatnya berada. Ini langsung menghilangkan akar masalah #1 (tabrakan dengan Bottom Navigation) tanpa perlu tiap developer mengingat angka piksel yang berbeda per app.

`safe-area-inset-bottom` (env() CSS asli, bukan class custom yang salah ketik) dipakai konsisten di BackToTop maupun ketiga BottomNav — memastikan device dengan home indicator (notch bawah iPhone) benar-benar mendapat jarak aman, bukan cuma di atas kertas.

### D.4 Kenapa muncul/hilang otomatis berdasarkan scroll, bukan selalu tampil

Dibangun 1 hook baru (`useScrollVisibility`, 53 baris, reusable) yang dipakai satu-satunya oleh `BackToTop`. Perilaku: tersembunyi (opacity 0 + sedikit turun + skala mengecil) di dekat atas halaman, muncul dengan fade + slide + scale halus setelah scroll melewati threshold (default 300px, bisa disesuaikan per halaman — mis. 150px di halaman POS yang lebih pendek). Alasan:

- **Tombol yang selalu tampil justru mengganggu** — di halaman pendek (kurang dari 1 layar), tombol "kembali ke atas" tidak ada gunanya dan cuma menutupi konten/bottom nav.
- **Animasi ringan (fade/slide/scale), bukan animasi mencolok** — sesuai prinsip "jangan berlebihan", supaya kemunculannya terasa halus, bukan menarik perhatian berlebih dari konten utama.
- Elemen tetap ada di DOM (bukan unmount/mount berulang) dengan `aria-hidden`+`tabIndex=-1` saat tersembunyi — supaya transisi CSS bisa berjalan mulus dan elemen tidak "meloncat" muncul tanpa animasi.

### D.5 Performa: satu hook, bukan listener per halaman

`useScrollVisibility` memakai `requestAnimationFrame` dengan guard `tickingRef` supaya scroll event yang menembak puluhan kali per detik hanya memicu maksimal 1 pengecekan per frame (bukan 1 pengecekan per event) — mencegah kalkulasi ulang berlebihan saat scroll cepat. Listener didaftarkan `{ passive: true }` (tidak memblokir scroll native) dan dibersihkan otomatis saat komponen unmount. Karena hook dan komponennya cuma ada SATU implementasi dipakai di seluruh app (bukan disalin-tempel per halaman), perbaikan performa ini otomatis berlaku di semua tempat tanpa perlu diulang.

### D.6 Migrasi ke seluruh aplikasi — apa yang berubah di tiap tempat

| Lokasi | Perubahan | Alasan |
|---|---|---|
| `ProduksiLayout.jsx` (Admin) | `<BackToTop/>` dirender SATU KALI di layout bersama, dihapus dari 5 halaman Produksi individual (2 di antaranya sempat merender 2×) | Konsolidasi ke 1 titik render menghilangkan risiko duplikasi terulang di masa depan — halaman baru yang dibungkus `ProduksiLayout` otomatis dapat perilaku benar, tidak perlu mengingat untuk menambahkannya sendiri |
| `FinanceLayout.jsx` | `<BackToTop/>` ditambahkan (Finance sebelumnya nol Back to Top di seluruh app) | Mengisi kekosongan penuh yang ditemukan di audit D.1 |
| `AdminPage.jsx` | `<BackToTop/>` benar-benar dirender (sebelumnya dead import) | Memperbaiki bug yang lolos tanpa terdeteksi |
| `TransferPage.jsx`, `StokOpnamePage.jsx`, `BukuPotonganPage.jsx` | `bottomClass="bottom-24"` disederhanakan jadi `<BackToTop/>` polos | API baru sudah otomatis benar, prop manual jadi tidak diperlukan lagi |
| `KasirPage.jsx` (POS) | Tetap pakai `className="left-4"` (custom), `bottomClass` dihapus | Halaman ini punya FAB lain di kanan bawah (tombol ringkasan keranjang, warna emas) — BackToTop SENGAJA digeser ke kiri supaya tidak bertabrakan dengan FAB yang sudah ada. Ini bukan inkonsistensi, tapi penyesuaian sadar untuk 1 halaman yang memang punya elemen mengambang lain |
| `LaporanPage.jsx` (POS) | `bottomClass="bottom-20"` dihapus, sisanya tetap | Sama seperti di atas — offset otomatis sudah benar |
| `AdminBottomNav.jsx`, `FinanceBottomNav.jsx` | Class mati `safe-area-inset-bottom` → `pb-[env(safe-area-inset-bottom)]` (Tailwind arbitrary value yang valid) | Memperbaiki bug D.1 poin 4 |
| `PosBottomNav.jsx` | Ditambahkan `pb-[env(safe-area-inset-bottom)]` (sebelumnya tidak ada sama sekali) | Sama |
| `HistoryPage.jsx`, `AnalyticsPage.jsx` (Admin) | Tidak berubah | Sudah memakai `<BackToTop/>` polos sejak awal, dikonfirmasi ulang lewat test suite masing-masing supaya tidak ada regresi dari perubahan API |

### D.7 Kenapa Catalog TIDAK ikut dimigrasi (pengecualian yang disengaja)

`ProductDetailPage.jsx` di app Catalog memakai tema hitam/putih/emas yang di-hardcode penuh (`bg-black text-white`, font khusus) — SENGAJA keluar dari sistem token `bg-skin-*`/`text-skin-*` yang dipakai di seluruh aplikasi lain, untuk menciptakan pengalaman "immersive" ala katalog fashion premium. Memaksakan `BackToTop` versi shared (yang memakai token skin) ke halaman ini berisiko terlihat rusak secara visual (warna tidak cocok) atau merusak kesan imersif yang memang jadi tujuan desain halaman tersebut. Tombol navigasi Catalog yang sudah ada (kembali, "Visit Us") sengaja dibiarkan dengan gaya kaca gelap (`bg-black/40 backdrop-blur`) khas halaman itu sendiri — bukan oversight, tapi pengecualian yang beralasan dan didokumentasikan di kode.

### D.8 Aksesibilitas & pengujian

- Touch target 48×48px minimum (`h-12 min-w-[48px]`), `aria-label="Kembali ke atas"` selalu ada terlepas dari `showLabel`, `focus-visible:ring-2` untuk navigasi keyboard, kontras warna memakai token `text-skin-text3`/border `#CAB170` saat hover — konsisten dengan warna aksen brand di seluruh aplikasi.
- 20 test baru untuk `BackToTop.jsx`, 9 test baru untuk `useScrollVisibility.js` — mencakup: state tersembunyi awal, muncul setelah threshold, klik → scroll ke atas, threshold custom, kembali tersembunyi di bawah threshold, listener dibersihkan saat unmount, listener bersifat passive, kalkulasi offset (`withBottomNav` true/false, `offsetPx` custom), label bisa disembunyikan tapi `aria-label` tetap ada, target sentuh 48px, dan mode `scrollEl` (untuk halaman dengan area scroll internal seperti daftar produk POS).
- Total across App-wide BackToTop migration: **20 (BackToTop) + 9 (useScrollVisibility) + regression test di `ProduksiLayout`, `FinanceLayout`, `AdminPage`, `AdminBottomNav`, `FinanceBottomNav`, `PosBottomNav`, dan 5 halaman Produksi + 3 halaman Admin lain + 2 halaman POS = seluruhnya PASSED**, dijalankan ulang di sesi ini sebagai bagian verifikasi akhir (lihat Bagian F).

---

## Bagian E — Audit Konsistensi UX Aplikasi Secara Luas

Instruksi meminta audit lebih luas dari Analytics/Back to Top: FAB, Bottom Navigation, Empty/Loading/Error State, Skeleton, Dialog, Bottom Sheet, Snackbar, Search Bar, Filter, Sticky Header/Action, Card, Spacing, Typography, Warna, Shadow, Animasi, dan feedback loading/sukses/gagal. Dengan instruksi eksplisit: **kalau risikonya rendah dan tidak menyentuh business logic, perbaiki langsung; kalau perubahannya besar, cukup didokumentasikan sebagai temuan + rekomendasi.**

Perbaikan langsung yang SUDAH dikerjakan (bagian dari D.6) dihitung sebagai bagian dari audit ini juga (Bottom Nav safe-area, Back to Top). Berikut sisa temuan, dengan keterangan kenapa masing-masing tidak diperbaiki langsung sekarang:

### E.1 Loading / Error / Empty State — TIDAK ada komponen shared, hanya ada untuk Analytics

`LoadingState.jsx`/`ErrorState.jsx` HANYA ada di `apps/admin/src/features/analytics/components/shared/` — dipakai konsisten di 9 halaman Analytics (skeleton `animate-pulse` untuk loading, pesan seragam + tombol "Coba Lagi" untuk error). Di luar Analytics, ditemukan **~30 file berbeda** di Admin/Finance/POS yang masing-masing menulis teks "Memuat..." secara ad-hoc tanpa skeleton visual maupun pola error yang seragam (grep menunjukkan pola teks ini tersebar di `BukuPotonganPage`, `TransferPage`, `StokOpnamePage`, seluruh halaman Gajian di Finance, `LaporanPage`/`RiwayatPage`/`PelangganPage` di POS, dst).

**Kenapa tidak dikerjakan sekarang:** Memperbaiki ini dengan benar berarti (1) memindahkan `LoadingState`/`ErrorState` dari folder khusus Analytics ke `packages/shared/components/` supaya bisa dipakai lintas app, lalu (2) mengganti ~30 titik pemakaian ad-hoc satu-per-satu, tiap titik berpotensi sedikit berbeda kondisi loading-nya (skeleton kartu vs skeleton list vs spinner). Ini bukan perubahan business logic, tapi volumenya besar dan berisiko mengubah tampilan banyak halaman sekaligus tanpa mockup/review per halaman — di luar batas "risiko rendah" yang diminta untuk dikerjakan langsung.

**Rekomendasi:** Jadikan `LoadingState`/`ErrorState`/tambahan `EmptyState` sebagai komponen `packages/shared/components/` (generalisasi dari versi Analytics yang sudah teruji), lalu migrasi bertahap per-app (mulai dari Finance karena paling banyak titik "Memuat..." manual), satu fitur per PR supaya mudah di-review.

### E.2 Toast/Snackbar — hanya wired di Admin & POS, Finance tidak punya feedback global

`ToastContainer.jsx` + Zustand store toast (`packages/shared/features/toast/`) sudah ada sebagai infrastruktur shared dan dipakai untuk feedback sukses/gagal (mis. `toast.success("Produk berhasil disimpan.")`) di `AdminPage.jsx` dan `App.jsx` POS. **Finance sama sekali tidak memanggil `toast.*` di manapun** — padahal Finance punya banyak alur simpan/hapus (Kas, Kasbon, Pettycash, Gajian, Karyawan) yang butuh feedback jelas kalau berhasil/gagal.

**Kenapa tidak dikerjakan sekarang:** Sama seperti E.1 — memasang `<ToastContainer/>` di `FinanceLayout.jsx` sendiri murah dan rendah risiko (mirip pola Back to Top di D.6), TAPI supaya benar-benar berguna perlu menyisipkan `toast.success/error(...)` ke setiap handler mutasi di 5+ fitur Finance, yang berarti menyentuh banyak titik logic form-submit — di luar cakupan "perbaikan kosmetik aman".

**Rekomendasi:** Tambahkan `<ToastContainer/>` ke `FinanceLayout.jsx` (perubahan aman, 1 baris, konsisten dengan pola Back to Top yang baru saja dikonsolidasi ke layout yang sama), lalu secara bertahap tambahkan pemanggilan `toast.success/error` di setiap mutation handler Finance, dimulai dari fitur yang paling sering dipakai (Gajian, Kas). Catalog TIDAK direkomendasikan memakai toast — halaman itu publik, read-only, tidak ada aksi simpan/hapus yang butuh feedback.

### E.3 Dialog/Modal — diimplementasikan ulang per fitur, bukan 1 komponen shared

Ditemukan 2 implementasi `Modal.jsx` terpisah (`features/produksi-bahan/components/Modal.jsx` dan `features/gajian/components/Modal.jsx`), plus `BottomSheet.jsx` yang HANYA ada di Admin (dipakai `SectionPicker` Analytics), plus modal konfirmasi hapus yang ditulis inline di `HistoryPage.jsx`. Ketiganya kemungkinan besar punya struktur HTML/CSS yang mirip (overlay full-screen di mobile, lihat pola yang sudah didokumentasikan di CLAUDE.md §14) tapi diimplementasikan terpisah tiga kali.

**Kenapa tidak dikerjakan sekarang:** Menyatukan 3 implementasi jadi 1 komponen shared berisiko tinggi kalau terburu-buru — masing-masing punya kebutuhan spesifik (ukuran, tombol aksi, apakah bisa ditutup dengan tap overlay) yang perlu diaudit detail sebelum digabung, dan dipakai di alur kerja penting (hapus data, HPP, penggajian) yang perlu sangat hati-hati terhadap regresi.

**Rekomendasi:** Ekstrak 1 komponen `Modal`/`Dialog` shared ke `packages/shared/components/` mengikuti pola yang SUDAH didokumentasikan di CLAUDE.md §14 (full-screen mobile, `h-[100dvh] md:h-auto`), jadikan 3 implementasi yang ada sebagai referensi, migrasi satu per satu dengan test yang ketat di setiap langkah karena menyentuh alur hapus/simpan data.

### E.4 FAB (Floating Action Button) — 2 pola berbeda, KEDUANYA dipertahankan dengan alasan

Ditemukan 2 FAB non-BackToTop: tombol ringkasan keranjang di `KasirPage.jsx` (POS, warna emas solid, kanan-bawah) dan tombol navigasi immersive di `CatalogPage.jsx` (kaca gelap, kiri & kanan bawah). Keduanya TIDAK diseragamkan dengan BackToTop maupun satu sama lain.

**Kenapa dipertahankan berbeda (bukan oversight):** FAB Kasir adalah aksi transaksional utama (buka ringkasan keranjang sebelum checkout) — warna solid mencolok memang disengaja supaya jadi elemen paling menarik perhatian di layar kasir (sesuai fungsinya, tombol paling penting di halaman itu). FAB Catalog memakai gaya kaca gelap karena halaman itu sendiri immersive (lihat D.7). Menyeragamkan ketiganya (BackToTop + FAB Kasir + navigasi Catalog) ke 1 gaya visual akan mengaburkan hierarki kepentingan — BackToTop memang harus terasa "sekunder" (bantuan navigasi), sementara FAB Kasir harus terasa "primer" (aksi utama halaman). Perbedaan gaya di sini justru mendukung hierarki visual yang benar, bukan inkonsistensi yang perlu diperbaiki.

### E.5 `window.confirm` — sudah 100% sesuai aturan, tidak ada temuan

CLAUDE.md §13 secara eksplisit melarang `window.confirm`. Diperiksa ulang di seluruh 812 file JS/JSX — satu-satunya kemunculan string `window.confirm` ada di **komentar kode** `HistoryPage.jsx` yang menjelaskan bahwa pola itu SUDAH diganti modal konfirmasi kustom. Tidak ada pelanggaran aktif ditemukan — dicatat di sini sebagai konfirmasi positif, bukan temuan yang perlu ditindaklanjuti.

### E.6 Shadow & Animasi — variasi kecil, bukan masalah mendesak

Penggunaan `shadow-xl` (25×), `shadow-sm` (9×), `shadow-lg` (6×), `shadow-md` (1×) tersebar tanpa dokumentasi eksplisit "elevation level mana pakai shadow apa". Animasi (`animate-pulse` untuk skeleton, `animate-spin`, `animate-fadeIn` yang baru ditambahkan di transisi tab Analytics) jumlahnya sedikit dan tidak berlebihan — sudah sesuai prinsip "animasi ringan, jangan berlebihan". Kedua hal ini **tidak menimbulkan masalah UX yang terlihat oleh pengguna** (variasi shadow terlalu halus untuk disadari pemilik toko), jadi tidak diprioritaskan untuk diseragamkan sekarang — cukup dicatat sebagai catatan kerapian teknis untuk developer di masa depan.

---

## Bagian F — Verifikasi Akhir

### F.1 Test

Seluruh test yang bersinggungan dengan perubahan Bagian C & D dijalankan ulang (bukan cuma file yang diedit):

| Area | File | Test |
|---|---|---|
| Analytics (tab + logic) | 9 tab + `AnalyticsPage` + `utils`/`hooks` | **288 test — PASSED** (lihat rincian C.7) |
| `packages/shared` | `BackToTop.test.jsx`, `useScrollVisibility.test.js`, `ToastContainer.test.jsx` | **35 test — PASSED** |
| Admin shared | `AdminBottomNav`, `ProduksiLayout`, `OverflowMenu`, `BottomSheet`, `ProtectedRoute`, `WhatsApp` | **43 test — PASSED** |
| Finance shared | `FinanceBottomNav`, `FinanceLayout`, `ProtectedRoute`, `format` | **42 test — PASSED** |
| POS (Bottom Nav + halaman yang dimigrasi) | `PosBottomNav`, `KasirPage`, `LaporanPage` | **43 test — PASSED** |
| **Total sesi ini** | | **451 test, seluruhnya PASSED, 0 gagal** |

### F.2 Truncation Scan

Seluruh **812 file JS/JSX** di `apps/` dan `packages/` (bukan cuma file yang diubah) di-scan dengan `esbuild` langsung (`node_modules/.bin/esbuild --bundle=false`, mendeteksi syntax error akibat truncation) — **0 file rusak**. Satu insiden truncation TERJADI selama sesi ini (tool Windows `Edit` sempat dipakai langsung ke `AdminBottomNav.jsx` di mount Linux, memotong file di tengah tag JSX) — **tertangkap seketika** oleh kebiasaan verifikasi `esbuild` setelah setiap penulisan file, diperbaiki dengan menulis ulang file lengkap lewat `bash heredoc`, dan tidak sempat masuk ke test run manapun dalam kondisi rusak. Sejak insiden itu, SELURUH penulisan file sisanya di sesi ini murni lewat `mcp__workspace__bash` (Python/heredoc), sesuai aturan CLAUDE.md.

### F.3 Build

```
npm run build:admin   → ✓ 893 modules transformed, built in 17.15s
npm run build:finance → ✓ 229 modules transformed, built in 4.67s
npm run build:pos     → ✓ 793 modules transformed, built in 7.02s
```

Ketiganya berhasil tanpa error. Warning "chunk lebih dari 500kB" tetap ada di admin & POS (pre-existing, sama seperti dicatat di laporan redesign pertama, di luar cakupan pekerjaan UX ini). Catalog tidak di-build ulang karena tidak ada file yang diubah di app tersebut sesi ini (lihat D.7).

---

## Rekomendasi Selanjutnya (Belum Dikerjakan, Sesuai Skala Temuan E)

Diurutkan dari yang paling disarankan dikerjakan lebih dulu:

1. **Ekstrak `LoadingState`/`ErrorState`/`EmptyState` jadi komponen shared** (E.1) — dampak UX paling besar dari seluruh temuan Bagian E, karena saat ini pengalaman "memuat data" terasa berbeda-beda di tiap halaman non-Analytics.
2. **Pasang `<ToastContainer/>` di `FinanceLayout.jsx`** (E.2) — perubahan 1 baris, rendah risiko, baru bermanfaat penuh setelah handler mutasi Finance diberi pemanggilan `toast.success/error` secara bertahap.
3. **Tautan navigasi fungsional antar-halaman Analytics** (C.5) — perlu perubahan kontrak props 9 komponen tab, dianjurkan dikerjakan sebagai task terpisah dengan test yang lengkap.
4. **Konsolidasi `Modal`/`Dialog` jadi 1 komponen shared** (E.3) — dampak sedang, risiko regresi lebih tinggi karena menyentuh alur hapus/simpan data penting.
5. Item lama dari laporan redesign pertama yang masih relevan: code-splitting bundle admin/POS (warning chunk 500kB+), badge indikator tindakan mendesak di `SectionPicker`.
