# UX Redesign — Template HPP & Harga Dasar
**Peran:** Principal Product Designer (UI/UX) — pengalaman ERP, Inventory, Manufacturing, Finance
**Modul:** Produksi HPP, `apps/admin`
**Tema:** Premium hitam-emas (`#CAB170` / `#A8925A`), mobile-first

---

## Catatan Awal — Satu Temuan Teknis yang Mengubah Cara Baca Brief Ini

Sebelum masuk ke kritik desain, saya cek dulu kode yang sekarang berjalan supaya kritik saya berbasis fakta, bukan tebakan. Satu temuan penting: **halaman "Harga Dasar" bukan cuma "belum didesain" — dia sekarang benar-benar blank karena bug routing tab** (`activeTab` yang dihasilkan tombol tab adalah `"harga-dasar"`, tapi kondisi render di halaman mengecek `"config"`). UI untuk mengedit nilai config-nya sebenarnya SUDAH ada di kode dan sudah fungsional (fetch, edit, save ke `hpp_config` semua jalan) — hanya tidak pernah bisa terlihat karena salah kunci. Ini menjelaskan kenapa "user tidak mengerti apa itu Harga Dasar": mereka belum pernah benar-benar melihat kontennya sama sekali.

Saya sebut ini di awal karena mengubah strategi: redesign Screen 2 di bawah bukan cuma "hias tampilan", tapi juga rekomendasi eksplisit soal apa yang perlu diperbaiki di level struktur data & routing supaya desain barunya benar-benar bisa dipakai. (Perbaikan kode tetap tanggung jawab tim engineering — dokumen ini murni desain — tapi saya tandai di mana perbaikan itu wajib terjadi.)

Temuan kedua yang relevan: `hpp_config` adalah tabel **kecil dan tetap** (~13 baris, key sudah ditentukan lewat migration SQL, kode penyimpanannya cuma bisa UPDATE — tidak pernah INSERT). Ini bukan katalog yang tumbuh bebas seperti daftar bahan baku. Ini lebih mirip halaman **Pengaturan/Konfigurasi** dengan field tetap, bukan daftar record yang di-CRUD bebas. Keputusan desain saya di Screen 2 mengikuti fakta ini, bukan mengikuti pola "list + tombol Add" secara membabi buta.

---

## Prinsip Lintas-Layar (berlaku untuk kedua screen)

1. **Ikon tanpa label tulisan hanya boleh dipakai untuk makna universal** (×, +, ⋮, ←/→). Untuk aksi yang maknanya spesifik ke konteks bisnis (mis. "bagikan HPP ke WhatsApp"), teks selalu menang dari ikon. Ini prinsip yang menjawab langsung keluhan #1–#3 di Screen 1.
2. **Tidak ada warna baru di luar hitam-emas.** Saya sengaja TIDAK memakai hijau WhatsApp di mana pun, walau itu warna brand yang dikenali orang — karena instruksi eksplisit "UI harus tetap konsisten dengan style aplikasi yang sudah ada" lebih penting daripada asosiasi warna brand pihak ketiga. Affordance WhatsApp dibangun lewat teks + ikon, bukan warna.
3. **Bottom Sheet, bukan modal tengah, untuk aksi yang butuh fokus penuh** (detail HPP, edit Harga Dasar). Konvensi ini sudah ada di codebase (modal lain sudah `items-end` di mobile) — saya hanya menegaskan dan menerapkannya konsisten, bukan menciptakan pola baru.
4. **Data finansial = butuh gesekan (friction) yang disengaja sebelum berubah.** Baik "Bagikan HPP ke pihak luar" maupun "Ubah Harga Dasar" adalah aksi yang dampaknya keluar dari layar itu sendiri (ke WhatsApp, ke template baru berikutnya). Keduanya saya desain supaya butuh satu langkah konfirmasi sadar (buka sheet dulu), bukan satu-tap-langsung-jadi dari list.
5. **Reuse, bukan reinvent.** Semua field style (`fieldFullCls`, `labelCls`), warna tombol (gold primer, outline sekunder, merah destruktif), dan pola card (`border border-skin-bdr`, `divide-y divide-skin-bdr-lt`) yang sudah ada saya pakai ulang persis. Redesign ini tentang *struktur dan kejelasan*, bukan tentang membangun design system baru.

---

# BAGIAN A — Screen 1: Template HPP

## A.1 Kritik Desain Sekarang

Kondisi aktual card (dari kode): baris info (kode produk, nama produk, catatan gelaran kalau ada, Total HPP di kanan) lalu 4 tombol sejajar — `Detail`/`Tutup` (toggle expand), `↑` (share, icon-only), `Edit`, `×` (hapus, merah).

| # | Masalah | Kenapa ini masalah nyata, bukan estetika |
|---|---|---|
| 1 | Tombol share cuma ikon `↑`, tanpa teks | Panah ke atas secara universal = "upload/naik/kirim ke server", bukan "bagikan ke WhatsApp". User harus menebak lewat trial-and-error. |
| 2 | Fungsi WhatsApp tidak terlihat sama sekali di UI | Tidak ada indikasi visual bahwa tujuannya WhatsApp — padahal itu satu-satunya alasan fitur ini ada. |
| 3 | 4 tombol sejajar di lebar layar 320–375px | Target tap jadi sempit, risiko salah pencet naik — terutama antara `↑` (share) dan `Edit` yang bersebelahan dan sama-sama outline abu-abu. |
| 4 | Tidak ada CTA utama yang jelas | Empat tombol punya bobot visual yang nyaris sama (semua outline, kecuali `×` yang merah). Mata tidak tahu harus fokus ke mana dulu. |
| 5 | Hierarki info datar | Kode produk, nama, dan Total HPP sama-sama "penting" secara visual meski Total HPP-lah yang paling sering dicari user saat scan cepat. Info "gelaran N produk" (info yang cukup penting — menandakan template ini dipakai bareng produk lain) tersembunyi jadi teks kecil abu-abu, gampang terlewat. |
| 6 (temuan tambahan) | Warna teks tombol gold tidak konsisten | `+ Buat HPP` pakai `text-white` di atas gold, tombol `Bagikan Gambar` di modal share pakai `text-black` di atas gold yang sama — inkonsistensi kecil tapi terlihat kalau dua tombol itu muncul berdekatan. |

## A.2 Pain Point (dari sudut pandang admin produksi)

- **"Ini tombol apa?"** — momen ragu setiap kali mau share, terutama untuk staf baru yang belum hafal ikon. Butuh percobaan pertama yang gagal/salah tebak sebelum akhirnya hafal.
- **Rasa tidak percaya diri saat demo ke owner.** Kalau admin salah pencet dan yang terbuka bukan yang diharapkan (mis. malah trigger native share sheet berisi opsi Instagram/Gmail/dll, bukan langsung WhatsApp), momen itu terasa tidak profesional di depan owner yang minta harga cepat.
- **Kepadatan tombol bikin ragu-ragu sebelum tap** — dengan 4 tombol rapat, sebagian user jadi hati-hati berlebihan (zoom-in dulu, lihat baik-baik) yang justru memperlambat alur kerja yang seharusnya cepat (harga HPP sering ditanya mendadak lewat chat).
- **Konteks hilang begitu expand.** Pola "Detail" sekarang adalah accordion in-place — begitu satu card di-expand di tengah list panjang, posisi scroll berantakan dan card lain di sekitarnya ikut terdorong. Untuk data finansial yang perlu dibaca tenang (bukan sambil scroll), ini bikin capek mata.

## A.3 UX Improvement & Keputusan Desain

### Keputusan #1 — Ganti ikon dengan kata. Titik.
Solusi termurah dan paling efektif untuk masalah #1–#3: **hapus ikon `↑`, ganti jadi teks "Bagikan"** di level card, dan **"Bagikan ke WhatsApp"** (lengkap, sebagai CTA utama) di level detail. Codebase ini sendiri sudah konsisten memakai *text button* untuk aksi bermakna spesifik (`Detail`, `Edit`, `Tutup`) — hanya share yang menyimpang jadi ikon. Menyamakan pola ini bukan cuma menjawab keluhan, tapi juga membuat card ini konsisten dengan dirinya sendiri.

*(Catatan implementasi, di luar scope desain: pastikan tim engineering mengecek apakah share saat ini benar memakai deep-link `wa.me` (seperti pola `shareProductViaWA` yang sudah ada di fitur Produk) atau native Web Share API generik yang menampilkan semua aplikasi terpasang. Kalau ternyata generik, label tetap boleh "Bagikan ke WhatsApp" karena itu memang skenario penggunaan nyatanya — tapi idealnya perilakunya disamakan dengan pola WA-langsung yang sudah terbukti jalan di fitur Produk, supaya label dan perilaku 100% cocok.)*

### Keputusan #2 — Share: hybrid antara card dan detail, BUKAN salah satu saja
Anda tanya: tombol penuh "Bagikan ke WhatsApp", pindah ke Detail, atau Bottom Sheet? **Jawaban saya: ketiganya, di tempat yang berbeda, dengan alasan berbeda:**

- **Di card (list)**: share tetap ada sebagai tombol berlabel kecil "Bagikan" (bukan full-width, bukan warna gold-primer). Alasan: berdasarkan konteks bisnis, share adalah aksi yang **sering** dilakukan (owner/mitra tanya harga lewat chat, admin balas cepat) — mewajibkan buka Detail dulu setiap kali menambah gesekan untuk aksi yang seharusnya cepat. Tapi karena ini bukan aksi *utama* saat browsing list (aksi utama saat browsing adalah *melihat*, bukan *membagikan*), dia tetap sekunder secara visual: outline gold, bukan filled gold.
- **Di Bottom Sheet Detail**: share menjadi CTA **utama, penuh lebar, filled gold**, `"Bagikan ke WhatsApp"`. Alasan: begitu user membuka detail, mereka sudah dalam mode "meninjau angka sebelum mengirim" — inilah momen paling tepat untuk CTA tegas satu-tujuan, karena user sudah melihat rincian dan sudah yakin apa yang mau dibagikan.
- **Kenapa Bottom Sheet (bukan accordion in-place seperti sekarang)?** Karena rincian HPP (bahan, per-warna, biaya lain, catatan) itu konten finansial yang perlu dibaca tenang — bukan konten yang enak dibaca sambil ikut ter-scroll bersama list. Bottom Sheet mengunci fokus ke satu template, list di baliknya tidak ikut kacau, dan ini pola yang **sudah ada** di codebase untuk modal-modal lain (tinggal diterapkan konsisten ke sini).

### Keputusan #3 — Kurangi tombol di card dari 4 jadi 2
`Edit` dan `Hapus` dipindah ke menu `⋮` (kebab), diletakkan di pojok card, bukan sejajar dengan tombol utama. Alasan:
- `Hapus` adalah aksi destruktif — menaruhnya semudah `Bagikan` (tap tunggal, tanpa langkah tambahan) berisiko salah pencet menghapus template HPP yang makan waktu untuk dibuat ulang.
- `Edit` tetap sering dipakai, tapi kalah frekuensi dibanding "lihat" dan "bagikan" untuk persona admin produksi harian — cukup satu tap ekstra di menu, bukan constant fixture di setiap card.
- Hasilnya: card jadi `[card info] [Detail] [Bagikan] [⋮]` — tiga elemen interaktif, bukan empat, dengan target tap lebih lega di layar sempit.

### Keputusan #4 — Hierarki info: Total HPP naik kelas, gelaran jadi badge
- **Kode produk** tetap identitas utama (bold, ukuran normal).
- **Nama produk** di bawahnya, satu baris, di-truncate — tetap sekunder seperti sekarang.
- **Total HPP** naik jadi elemen paling besar & paling gold di card (bukan cuma teks bold biasa) — karena ini angka yang paling sering jadi alasan orang membuka card ini sama sekali.
- **Info gelaran** (kalau `>1` produk) jadi **badge kecil** (bukan kalimat penuh "Gelaran: N produk per potong") — badge lebih cepat di-scan mata saat melihat banyak card sekaligus, kalimat penuh baru muncul di Detail.

## A.4 Struktur Halaman Baru

```
Template HPP (list)
 ├─ Header: "+ Buat HPP" (CTA primer halaman, tidak berubah dari sekarang)
 ├─ [State: loading / kosong / list]
 └─ Card × N (redesign — lihat A.6/A.8)
      └─ tap card / "Detail" → Bottom Sheet Detail
           ├─ Header sheet: kode + nama + tombol ⋮ (Edit, Hapus) + tombol tutup ✕
           ├─ Body (scrollable): breakdown bahan, biaya, catatan — SAMA seperti isi accordion sekarang, hanya beda wadah
           └─ Footer sticky: [Bagikan ke WhatsApp] — full width, filled gold, satu-satunya CTA di footer
```

## A.5 Hierarki Informasi (card, urut prioritas visual)

1. Total HPP (terbesar, gold, kanan atas)
2. Kode Produk (bold, kiri atas)
3. Nama Produk (regular, abu, di bawah kode)
4. Badge Gelaran (kecil, hanya muncul jika relevan)
5. Baris tombol: Detail · Bagikan · ⋮

## A.6 CTA Utama & Sekunder

| Tingkat | CTA Utama | CTA Sekunder | Aksi Berisiko (dipisah) |
|---|---|---|---|
| Halaman list | `+ Buat HPP` (di header) | — | — |
| Card | (tap kartu = buka Detail) | `Bagikan` (outline) | `⋮ → Hapus` (merah, di dalam menu) |
| Bottom Sheet Detail | `Bagikan ke WhatsApp` (filled gold, full-width) | `Edit` (text button, dekat header) | `⋮ → Hapus` (di header sheet) |

## A.7 Empty State (list Template HPP)

Belum diminta eksplisit di brief, tapi saya sertakan singkat untuk kelengkapan:

```
┌─────────────────────────────┐
│                               │
│         (ikon dokumen)        │
│                               │
│   Belum ada Template HPP      │
│   Buat template pertama untuk │
│   mulai hitung HPP per produk │
│                               │
│      [ + Buat HPP ]           │
│                               │
└─────────────────────────────┘
```
Copy sengaja pendek dan actionable — tombol CTA di empty state sama persis dengan CTA header, supaya tidak ada pola baru yang perlu dipelajari.

## A.8 Wireframe Low-Fidelity (ASCII)

**Card — kondisi sekarang (untuk pembanding):**
```
┌───────────────────────────────────┐
│ D-07-OSK                Rp 148.500 │
│ Gamis Wolfis Premium               │
│ Gelaran: 3 produk per potong       │
│ ┌────────┬───┬────────┬───┐        │
│ │ Detail │ ↑ │  Edit  │ × │        │
│ └────────┴───┴────────┴───┘        │
└───────────────────────────────────┘
        ↑ ikon ambigu, 4 target tap sempit
```

**Card — redesign:**
```
┌───────────────────────────────────┐
│  D-07-OSK                          │
│  Gamis Wolfis Premium    [3 gelaran]│
│                                     │
│                        Rp 148.500  │  ← terbesar, gold
│                                     │
│  ┌──────────┐  ┌───────────┐  ┌──┐ │
│  │  Detail  │  │  Bagikan  │  │⋮ │ │
│  └──────────┘  └───────────┘  └──┘ │
└───────────────────────────────────┘
   (seluruh kartu juga bisa di-tap → buka Detail)
```

**Bottom Sheet — Detail HPP:**
```
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ (drag handle)
┌───────────────────────────────────┐
│ D-07-OSK — Gamis Wolfis   ⋮   ✕   │
├───────────────────────────────────┤
│ BAHAN                              │
│  Wolfis Premium (motif)  Rp 90.000 │
│   HITAM 2yd · MERAH 1.5yd          │
│  Kancing (tambahan)      Rp 4.000  │
│                                     │
│ BIAYA LAIN                         │
│  Upah Jahit               Rp 35.000│
│  Bordir                   Rp 10.000│
│  Biaya Studio              Rp 9.500│
│                                     │
│  ┌─────────────────────────────┐   │
│  │  TOTAL HPP     Rp 148.500   │   │  ← border-2 gold, existing style
│  └─────────────────────────────┘   │
│                                     │
│ Catatan: motif custom untuk Q3     │
├───────────────────────────────────┤
│ ┌─────────────────────────────┐   │
│ │   Bagikan ke WhatsApp        │   │  ← sticky, full width, filled gold
│ └─────────────────────────────┘   │
│           Edit template            │  ← text link kecil, di bawah CTA
└───────────────────────────────────┘
```

**Menu ⋮ (dari card maupun sheet):**
```
        ┌───────────────┐
        │  Edit          │
        │  Hapus (merah) │
        └───────────────┘
```

## A.9 Komponen yang Digunakan

- `HppTemplateCard` (redesign `HPPCard.jsx`) — versi ramping, 2 tombol + kebab.
- `HppTemplateDetailSheet` (baru) — mengganti logic expand in-place, isi konten dipindah dari blok `expanded &&` yang sudah ada (tidak perlu ditulis ulang dari nol, cuma pindah wadah + tambah footer sticky).
- `BottomSheet` (baru, generik/reusable) — wrapper `fixed inset-0 ... items-end`, dipakai juga oleh Screen 2. Satu komponen, dua pemakai — mengurangi duplikasi modal yang sekarang tersebar (`HPPShareModal`, form modal, delete modal semua menulis struktur serupa manual).
- `OverflowMenu` / `KebabMenu` (baru, reusable) — dropdown kecil untuk Edit/Hapus, dipakai di card dan sheet.
- `HPPShareCard` — **tidak berubah**, tetap dipakai apa adanya di dalam alur share (generate gambar), hanya *trigger*-nya yang pindah tempat.

## A.10 Copywriting

| Elemen | Lama | Baru | Alasan |
|---|---|---|---|
| Tombol share (card) | `↑` (ikon saja) | `Bagikan` | Kata > ikon untuk makna spesifik |
| Tombol share (detail) | *(tidak ada — user harus buka modal share dulu)* | `Bagikan ke WhatsApp` | Eksplisit menyebut tujuan, sesuai fungsi asli fitur |
| Judul modal share | `Share HPP — {kode}` | `Bagikan HPP — {kode}` | Konsisten Bahasa Indonesia (sisa UI sudah full Indonesia) |
| Badge gelaran | `Gelaran: 3 produk per potong` (kalimat) | `3 gelaran` (badge) | Ringkas untuk scan cepat, detail lengkap tetap ada di sheet |

## A.11 Hal yang Sebaiknya Dihapus dari Desain Lama

- Ikon `↑` polos sebagai satu-satunya penanda fungsi share.
- Pola accordion in-place untuk detail (digantikan Bottom Sheet).
- 4 tombol sejajar rata di card.
- Inkonsistensi warna teks tombol gold (`text-black` vs `text-white`) — samakan jadi satu (rekomendasi: `text-white`, karena itu yang dipakai mayoritas tombol primer lain di app).

---

# BAGIAN B — Screen 2: Harga Dasar

## B.1 Kritik Desain Sekarang

Secara teknis halaman ini kosong total di production (lihat catatan awal). Tapi kalaupun bug routing-nya diperbaiki hari ini tanpa desain ulang, UI yang sudah ada di kode punya masalah konsep, bukan cuma tampilan:

1. **Tidak ada penjelasan sama sekali tentang apa itu "Harga Dasar"** sebelum user dihadapkan ke daftar 13 angka mentah. Satu-satunya kalimat penjelas ("Nilai default untuk semua kalkulasi HPP...") ukurannya kecil dan mudah terlewat.
2. **Semua 13 item ditumpuk rata tanpa pengelompokan** — campur antara ongkos jahit, biaya kemasan, dan poin komisi karyawan dalam satu list panjang tanpa header pemisah.
3. **Input angka selalu dalam mode "siap diedit"** — setiap baris punya `<input type="number">` yang langsung bisa diketik tanpa langkah konfirmasi terpisah. Untuk nilai yang jadi acuan default banyak Template HPP ke depan, ini berisiko: sekali tersenggol/salah ketik saat scroll, nilainya berubah tanpa niat.
4. **Tidak ada indikasi siapa & kapan terakhir ubah nilai** — padahal datanya (`updated_by`, `updated_at`) sudah tersimpan di database, cuma tidak pernah ditampilkan.

## B.2 Pain Point

- **"Halaman ini buat apa?"** — user baru (atau bahkan yang lama, kalau jarang ke sini) tidak dapat konteks apa pun sebelum melihat angka-angka.
- **Takut salah ubah.** Karena tidak jelas efeknya ke mana ("ini ngubah template yang sudah ada, atau cuma default baru?"), user jadi ragu menyentuh halaman ini sama sekali — walau justru sengaja dibuat aman (tidak memengaruhi template lama).
- **Susah nemu nilai tertentu di tengah 13 baris rata** tanpa pengelompokan — misal owner tanya "kancing sekarang harganya berapa", admin harus scan satu-satu.
- **Tidak ada jejak audit yang terlihat** — kalau owner tanya "ini biaya jahit gamis dari kapan segini", admin tidak punya jawaban dari UI, padahal datanya ada.

## B.3 UX Improvement & Keputusan Desain

### Keputusan #1 — Ini halaman Pengaturan, bukan halaman List/CRUD
Brief meminta saya menentukan sendiri "List atau Table" dan "Add/Edit Flow". Setelah melihat data aslinya (13 key tetap, kode penyimpanan cuma bisa UPDATE, tidak pernah INSERT), saya sengaja **tidak** mendesain ini seperti daftar record yang bisa ditambah/dihapus bebas (seperti daftar Bahan Baku). Ini lebih dekat ke halaman **Pengaturan Harga** dengan field tetap — mirip halaman "Biaya Pengiriman Default" di aplikasi e-commerce, bukan "Daftar Produk".

**Konsekuensi konkret:**
- **Tidak ada tombol "+ Tambah"** di halaman ini. Menambah key baru tanpa perubahan kode (formula `calcTotal()`) tidak akan berefek apa pun — jadi menyediakan tombol Add justru menyesatkan user untuk melakukan sesuatu yang percuma.
- **Edit tetap ada**, tapi per-item, lewat Bottom Sheet (bukan input inline yang selalu terbuka) — lihat Keputusan #3.

### Keputusan #2 — List/Card bertingkat (grouped), BUKAN Table
Tegas: **List, bukan Table.** Ini juga sudah jadi aturan tertulis di konvensi proyek ("Jangan gunakan `<table>` untuk konten yang perlu responsif di mobile — gunakan flex wrap/list"), dan aplikasi ini mobile-first murni. Table butuh scroll horizontal atau kolom yang dipaksa muat di ~340px layar — selalu kalah dibanding list vertikal untuk data "1 label + 1 angka + 1 keterangan" seperti ini.

Bedanya dari list HPP Template: 13 item ini saya **kelompokkan** ke 4 kategori berdasarkan key yang sudah ada di kode (`utils.js`), bukan dibiarkan rata:

- **Ongkos Jahit** — Jahit Midi, Jahit Gamis
- **Bordir & Finishing** — Bordir
- **Kemasan & Aksesoris** — Plastik, Hangtag, Tali Hangtag, Merk, Pin, Kain Keras, Kancing (satuan)
- **Studio & Lainnya** — Studio Foto, Poin Denny, Poin Haikal

Pengelompokan ini murni presentasi (tidak butuh perubahan skema `hpp_config` — grouping-nya didefinisikan di layer UI berdasarkan `key`).

### Keputusan #3 — Lihat dulu, edit belakangan (tap-to-edit, bukan always-editable)
Baris jadi **read-only by default**: Label, Keterangan singkat, Nilai (Rp, badge gold), dan teks kecil "Diubah {tanggal} oleh {nama}" kalau ada. Tidak ada `<input>` yang langsung terlihat. Untuk mengubah, user tap baris (atau tombol kecil "Ubah") → **Bottom Sheet** terbuka dengan satu field angka besar + disclaimer ("nilai ini cuma default untuk Template HPP baru, tidak mengubah Template yang sudah tersimpan" — kalimat ini saya pertahankan dari kode lama karena sudah jelas dan tepat) + tombol Batal/Simpan.

**Alasan:** ini prinsip umum desain finance/ERP — nilai konfigurasi yang berdampak luas (dipakai sebagai default banyak Template ke depan) sebaiknya tidak "selalu dalam mode edit". Memisahkan mode lihat vs mode ubah menghilangkan risiko kesalahan tak sengaja, dan sekaligus membuat halaman ini terasa lebih tenang/rapi saat 90% kunjungan penggunanya hanya untuk *mengecek* nilai, bukan mengubahnya.

### Keputusan #4 — Search: sengaja TIDAK ditambahkan (untuk sekarang)
Brief meminta saya menentukan soal Search. Dengan hanya ~13 item yang sudah dikelompokkan ke 4 kategori, search bar justru menambah elemen UI untuk masalah yang belum ada (semua item selalu muat tanpa scroll panjang di kebanyakan HP). Saya **tidak menyertakan search bar** di versi ini.

Kalau ke depan jumlah item bertambah signifikan (>20, misal karena bisnis menambah lini produk baru dengan komponen biaya berbeda), tinggal tambahkan search bar tipis di atas grup pertama — struktur grouped-list yang saya desain sekarang sudah kompatibel dengan itu tanpa perlu dirombak.

### Keputusan #5 — Tetap tab terpisah, jangan digabung ke Template HPP
Brief bertanya apakah lebih baik digabung. **Rekomendasi saya: tetap terpisah**, alasannya:

1. **Frekuensi pemakaian jauh berbeda.** Template HPP dibuka setiap kali ada produk baru (sering). Harga Dasar hanya disentuh saat ada perubahan biaya bahan/ongkos dari pemasok (jarang — mungkin bulanan). Menggabungnya ke satu list akan mencampur ritme kerja yang berbeda.
2. **Model mental berbeda.** Template HPP = "catatan per produk" (record individual, banyak, bisa dihapus). Harga Dasar = "pengaturan global" (satu set tetap, tidak pernah bertambah/berkurang). Mencampur dua model ini di satu tampilan bikin user bingung mana yang "punya" satu produk dan mana yang berlaku ke semua produk.
3. **Struktur 3-tab yang ada sekarang (Template / Kalkulator / Harga Dasar) sebenarnya sudah masuk akal** — masalah aslinya cuma bug navigasi + halaman yang belum didesain, bukan susunan tab-nya. Memperbaiki isi tab jauh lebih aman daripada merombak arsitektur informasi yang sebenarnya sudah benar.

Yang saya ubah bukan strukturnya, tapi **isinya**: begitu tab Harga Dasar dibuka, halaman langsung menjelaskan dirinya sendiri lewat copy pembuka yang jelas — bukan lewat ikon tab yang dihias-hias (ikon dekoratif akan terasa asing dari sisa aplikasi yang minimalis, jadi saya hindari).

## B.4 Struktur Halaman Baru

```
Harga Dasar
 ├─ Intro block (persisten, ringkas):
 │    "Harga Dasar adalah acuan biaya per potong yang otomatis
 │     mengisi Template HPP baru. Bukan harga final — tetap bisa
 │     disesuaikan per Template."
 ├─ [State: loading / error+retry / list]
 ├─ Grup "Ongkos Jahit"
 │    └─ Row × 2
 ├─ Grup "Bordir & Finishing"
 │    └─ Row × 1
 ├─ Grup "Kemasan & Aksesoris"
 │    └─ Row × 7
 ├─ Grup "Studio & Lainnya"
 │    └─ Row × 3
 └─ tap Row → Bottom Sheet Edit
      ├─ Label + keterangan
      ├─ Field angka (besar, fokus otomatis)
      ├─ Disclaimer (reuse copy lama)
      └─ [Batal]  [Simpan]
```

## B.5 Hierarki Informasi

**Level halaman:** Intro (kenapa halaman ini ada) → Grup (kategori biaya) → Row (item + nilai).
**Level row:** Label (bold, utama) → Nilai Rp (badge gold, kanan, elemen kedua paling menonjol) → Keterangan (kecil, abu, di bawah label) → Meta "diubah oleh/kapan" (paling kecil, hanya muncul kalau ada datanya).

## B.6 Empty State & Error State

Karena data selalu ter-seed (13 baris tetap), true-empty seharusnya nyaris tidak pernah terjadi — tapi tetap didesain sebagai jaring pengaman:

```
┌─────────────────────────────┐
│                               │
│        (ikon gerigi)          │
│                               │
│  Konfigurasi belum tersedia   │
│  Hubungi tim teknis untuk     │
│  menyiapkan Harga Dasar.      │
│                               │
│        [ Coba Lagi ]          │
│                               │
└─────────────────────────────┘
```
State error (gagal fetch) memakai layout yang sama, ganti teks jadi "Gagal memuat Harga Dasar" + tombol "Coba Lagi" yang refetch. Saya sengaja tidak membuat halaman ini punya CTA "+ Tambah Konfigurasi" di empty state manapun — konsisten dengan Keputusan #1 (bukan halaman CRUD bebas).

## B.7 CTA Utama & Sekunder

| Tingkat | CTA Utama | CTA Sekunder |
|---|---|---|
| Halaman | *(tidak ada — halaman ini tidak "membuat" apa pun)* | — |
| Row | *(tap row = buka sheet edit)* | teks kecil "Ubah" di kanan row, untuk affordance eksplisit selain tap-seluruh-baris |
| Bottom Sheet Edit | `Simpan` (filled gold, muncul/aktif hanya kalau nilai benar-benar berubah — perilaku ini dipertahankan dari kode lama, sudah bagus) | `Batal` (outline/text) |

## B.8 Wireframe Low-Fidelity (ASCII)

```
┌───────────────────────────────────┐
│  HARGA DASAR                       │
│  Acuan biaya per potong yang       │
│  otomatis mengisi Template HPP     │
│  baru. Bukan harga final.          │
├───────────────────────────────────┤
│  ONGKOS JAHIT                      │
│  ┌─────────────────────────────┐   │
│  │ Jahit (Midi)                │   │
│  │ Ongkos jahit ukuran Midi     │   │
│  │                  Rp 35.000 ›│   │
│  ├─────────────────────────────┤   │
│  │ Jahit (Gamis)                │   │
│  │                  Rp 45.000 ›│   │
│  └─────────────────────────────┘   │
│                                     │
│  KEMASAN & AKSESORIS                │
│  ┌─────────────────────────────┐   │
│  │ Plastik           Rp 1.800 ›│   │
│  │ Hangtag              Rp 200 ›│   │
│  │ Kancing (per biji)   Rp 500 ›│   │
│  │  Diubah 3 Jun 2026 · Admin   │   │
│  │ ...                          │   │
│  └─────────────────────────────┘   │
│                                     │
│  STUDIO & LAINNYA                   │
│  ┌─────────────────────────────┐   │
│  │ Studio Foto      Rp 165.000 ›│   │
│  │ Poin Denny        Rp 10.000 ›│   │
│  │ Poin Haikal        Rp 10.000 ›│   │
│  └─────────────────────────────┘   │
└───────────────────────────────────┘
```

**Bottom Sheet — Edit satu nilai:**
```
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
┌───────────────────────────────────┐
│  Kancing (per biji)          ✕    │
│  Harga kancing per biji            │
├───────────────────────────────────┤
│                                     │
│         ┌───────────────┐          │
│         │  Rp  [ 500 ]  │          │  ← field besar, fokus otomatis
│         └───────────────┘          │
│                                     │
│  ⓘ Nilai ini cuma default untuk    │
│    Template HPP baru. Tidak         │
│    mengubah Template yang sudah     │
│    tersimpan.                       │
│                                     │
│  Diubah terakhir 3 Jun 2026        │
│  oleh Admin                        │
├───────────────────────────────────┤
│   [ Batal ]      [ Simpan ]        │
└───────────────────────────────────┘
```

## B.9 Komponen yang Digunakan

- `ConfigGroupHeader` (baru) — label kategori kecil, uppercase, tracking lebar (pola `labelCls` yang sudah ada).
- `ConfigRow` (baru, ganti blok `configRows.map` yang lama) — read-only, tap-to-open.
- `ConfigEditSheet` (baru) — pakai `BottomSheet` generik yang sama dari Bagian A.
- Field & tombol: pakai ulang `fieldFullCls`, `labelCls`, style tombol gold/outline yang sudah ada — nol komponen visual baru di luar struktur di atas.

## B.10 Copywriting

| Elemen | Lama | Baru | Alasan |
|---|---|---|---|
| Judul/intro | *(tidak ada judul penjelas, hanya kalimat kecil)* | Blok intro 2 kalimat, ukuran normal, selalu terlihat di atas | User paham fungsi halaman dalam <3 detik tanpa harus tanya orang lain |
| Deskripsi field | `row.keterangan` apa adanya (mis. "Ongkos jahit ukuran Midi & Midi Jumbo") | dipertahankan, sudah cukup jelas | Tidak perlu diubah — sudah baik dari awal |
| Disclaimer di edit | "Nilai default untuk semua kalkulasi HPP. Tidak mempengaruhi template yang sudah tersimpan." | dipertahankan persis, dipindah ke dalam sheet edit (momen paling relevan untuk dibaca — tepat sebelum user menekan Simpan) | Copy lama sudah bagus, masalahnya cuma penempatan & ukurannya, bukan isinya |
| Label tombol edit | *(tidak ada — seluruh row selalu jadi input)* | "Ubah" (implisit lewat `›` + tap area, eksplisit lewat teks kalau diperlukan) | Menegaskan bahwa row bukan otomatis-editable |

## B.11 Hal yang Sebaiknya Dihapus/Diubah dari Desain Lama

- Input `<input type="number">` yang selalu terbuka di setiap row — ganti jadi read-only + Bottom Sheet.
- Susunan 13 item tanpa pengelompokan — ganti jadi 4 grup.
- **(Prioritas tertinggi, di luar scope visual tapi wajib)**: perbaiki key mismatch `"harga-dasar"` vs `"config"` di `ProduksiHPPPage.jsx` — tanpa ini, desain sebagus apa pun tidak akan pernah terlihat pengguna.

---

## Ringkasan Keputusan Kunci

1. **Screen 1**: ikon share diganti teks; share tersedia ringan di card (frekuensi tinggi) dan tegas sebagai CTA penuh di Bottom Sheet Detail (momen keputusan); Edit/Hapus dipindah ke menu `⋮` agar card tidak padat dan aksi destruktif tidak semudah aksi aman.
2. **Screen 2**: didesain sebagai halaman **Pengaturan** (bukan CRUD list) — tanpa tombol Add, dengan grouping 4 kategori, mode lihat-dulu-edit-belakangan lewat Bottom Sheet, tanpa search (untuk sekarang), tetap sebagai tab terpisah dari Template HPP.
3. Kedua redesign memakai satu komponen `BottomSheet` generik yang sama — investasi kecil di awal, konsisten untuk seluruh modul Produksi HPP ke depan.
4. Bug routing tab Harga Dasar (`"harga-dasar"` vs `"config"`) perlu diperbaiki di kode sebelum redesign Screen 2 bisa dipakai user sama sekali — ini temuan teknis, bukan bagian dari deliverable desain, tapi terlalu penting untuk tidak disebut.
