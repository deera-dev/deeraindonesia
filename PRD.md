# PRD — Product Requirements Document
# Deera Indonesia — Sistem Manajemen Bisnis Fashion

**Versi:** 1.0  
**Tanggal:** Mei 2026  
**Status:** Production  

---

## 1. Ringkasan Eksekutif

Deera Indonesia adalah brand fashion muslim (gamis, mukena) yang beroperasi melalui
toko online dan berjualan di pasar tradisional. Sistem ini menggantikan pencatatan
manual (buku tulis, spreadsheet) dengan platform digital yang mencakup:

- Katalog produk online untuk pelanggan
- Manajemen produk dan stok untuk admin
- Point of Sale yang bisa dipakai offline di pasar

**Masalah yang dipecahkan:**
1. Stok di berbagai lokasi (gudang, Cideng, Tegalgubug) sulit dipantau
2. Pencatatan penjualan di pasar tidak terintegrasi dengan stok
3. Tidak ada audit trail saat stok berubah
4. Transfer barang antar lokasi tidak terdokumentasi

---

## 2. Pengguna

### 2.1 Admin / Pemilik
- Akses penuh ke semua fitur
- Mengelola produk (tambah, edit, hapus)
- Melakukan stok opname
- Melihat laporan dan audit log
- Approve/reject transfer stok

### 2.2 Kasir / Penjual Pasar
- Akses ke aplikasi POS saja
- Mencatat transaksi penjualan di pasar
- Melihat stok yang tersedia untuk lokasi aktif
- Melihat laporan transaksi sendiri

### 2.3 Pembeli / Reseller (Catalog)
- Tidak perlu login
- Melihat katalog produk terbaru
- Menghubungi toko via WhatsApp

---

## 3. Tiga Aplikasi

### 3.1 Aplikasi Catalog (apps/catalog)

**Tujuan:** Memperkenalkan produk ke pelanggan dan reseller.

**Fitur:**
- Tampilan full-screen snap-scroll — satu produk per layar
- Foto produk dengan kualitas tinggi (via Cloudinary CDN)
- Info lengkap per produk: ukuran, warna, harga, bahan
- Tombol "Visit Us" dengan info toko dan rekening
- Halaman detail produk dengan semua foto
- Label "SOLD OUT" untuk produk habis
- Tombol kembali ke atas (scroll to top)

**Non-fitur (sengaja):**
- Tidak ada keranjang belanja / checkout online
- Tidak ada harga yang ditampilkan (model B2B/reseller)
- Tidak ada login pembeli

**Constraint:**
- Hanya produk yang punya foto utama yang tampil
- Urutan produk berdasarkan nomor kode (terbaru dulu)

---

### 3.2 Aplikasi Admin (apps/admin)

**Tujuan:** Manajemen operasional bisnis oleh admin/pemilik.

#### 3.2.1 Manajemen Produk
- Tambah produk baru dengan kode, nama, bahan, HPP
- Upload foto utama + foto detail (via Cloudinary)
- Konfigurasi ukuran: pilih dari preset (Midi, Midi Jumbo, Gamis, Gamis Jumbo) dengan harga per ukuran
- Konfigurasi warna dalam satu seri
- Edit dan hapus produk
- Produk tanpa foto tetap tersimpan (tidak muncul di katalog)

#### 3.2.2 Stok Opname
- Input stok aktual semua produk sekaligus
- Stok per: kode produk × ukuran × warna × lokasi (Gudang/Cideng/Tegalgubug)
- Highlight baris yang diubah
- Filter "hanya tampilkan perubahan"
- Accordion per produk (expand/collapse)
- Simpan hanya baris yang berubah (efisien)
- Otomatis update POS via Supabase Realtime setelah simpan

#### 3.2.3 Transfer Stok
- Buat transfer dari satu lokasi ke lokasi lain
- Pilih barang dari stok yang tersedia
- Generate surat jalan (nomor: SJ-YYYYMMDD-XXX)
- Status: Menunggu → Disetujui / Ditolak
- Stok baru berpindah saat diapprove (bukan saat dibuat)
- Edit dan hapus hanya untuk transfer yang masih pending
- Filter berdasarkan tanggal dan status
- Badge jumlah pending di tab navigasi

#### 3.2.4 Buku Potongan
- Perbandingan stok ekspektasi vs stok aktual
- Input expected qty per produk/ukuran/warna
- Selisih ditampilkan dengan kode warna (hijau=sesuai, merah=kurang, amber=lebih)
- Membantu audit stok fisik vs catatan

#### 3.2.5 Riwayat & Audit Log
- Semua perubahan tercatat: tambah/edit/hapus produk, transfer, stok opname
- Diff view: sebelum vs sesudah untuk setiap perubahan
- Filter berdasarkan periode (Hari Ini / 7 Hari / 30 Hari / Custom / Semua)
- Filter berdasarkan kategori (Produk / Transfer / Stok)
- Detail perubahan dalam modal (bukan halaman baru)
- Hapus entri riwayat individual
- Dicatat: nama user, email, timestamp

---

### 3.3 Aplikasi POS (apps/pos)

**Tujuan:** Kasir bisa mencatat transaksi di pasar, bahkan tanpa internet.

#### 3.3.1 Tab Kasir
- Daftar produk dengan mode Teks (cepat) atau Foto (visual)
- Pencarian produk (kode, bahan, warna)
- Tampilkan stok sesuai lokasi aktif saat ini
- Panel cart:
  - Tambah item ke keranjang
  - Pilih warna dari panel warna
  - Tombol "Seri Penuh" untuk isi semua warna sekaligus (+1 per warna)
  - Edit harga satuan per item
  - Diskon nominal atau persentase
  - Input nama dan nomor HP pembeli
  - Autocomplete pelanggan dari database
- Struk digital setelah transaksi

#### 3.3.2 Tab Laporan
- Sub-tab: Transaksi, Keuangan, Stok, Pembeli
- Filter tanggal
- Laporan keuangan: omset, HPP, keuntungan per hari
- Laporan stok keluar
- Top pembeli
- Edit dan hapus transaksi (dengan konfirmasi)
- Retur transaksi

#### 3.3.3 Tab Pelanggan
- Database pelanggan (nama, HP, alamat)
- Tambah, edit, hapus pelanggan

#### 3.3.4 Fitur Offline
- Semua produk dan stok di-cache di IndexedDB (Dexie)
- Transaksi tersimpan lokal dengan status "pending"
- Saat online kembali: transaksi di-flush ke Supabase, stok di-update
- Indikator online/offline di header
- Tombol sync manual

#### 3.3.5 Lokasi Otomatis
```
Senin, Kamis → Cideng
Jumat        → Tegalgubug
Hari lain    → Gudang
```
User bisa override lokasi manual (dengan indikator).

---

## 4. Business Rules

### Stok
- Stok tidak pernah negatif
- Stok berubah hanya saat: penjualan POS, stok opname, atau transfer diapprove
- Produk baru dibuat dengan stok 0 — isi via Stok Opname
- Warna yang dihapus dari produk: data stok-nya dihapus otomatis (hanya jika stok = 0, berikan warning jika ada stok)

### Transfer
- Hanya user terautentikasi yang bisa approve/reject
- Transfer tidak bisa di-approve oleh pembuat sendiri (best practice, tidak di-enforce oleh sistem saat ini)
- Stok di lokasi asal tidak dikunci saat pending — perlu diperhatikan

### Audit
- Semua aksi yang mengubah data produk/stok/transfer dicatat
- Audit tidak bisa diedit, hanya bisa dihapus oleh admin
- Before snapshot wajib ada untuk aksi "edit" dan "approve/reject transfer"

### Produk
- Kode produk unik dan immutable setelah dibuat (perubahan kode = link lama tidak valid)
- Foto bersifat opsional — produk bisa tersimpan tanpa foto (tidak muncul di katalog)
- Ukuran minimum: harus pilih minimal 1 ukuran

---

## 5. Non-Functional Requirements

### Performance
- Catalog: first meaningful paint < 2 detik (foto lazy loaded)
- POS: tampil dari cache IndexedDB < 500ms (sebelum sync selesai)
- Admin: data produk cached di module level, tidak re-fetch setiap render

### Offline Capability
- POS harus bisa dipakai tanpa internet
- Transaksi offline tersimpan dan sync otomatis saat online

### Mobile-First
- Semua UI dirancang untuk smartphone (lebar ~375px)
- Tidak ada hover-only interactions (tidak ada tooltip, hover state kritis)
- Tombol hapus/aksi selalu visible (tidak hanya saat hover)
- Font size minimum 14px untuk keterbacaan di outdoor

### Security
- Supabase RLS aktif di semua tabel
- Admin dan POS: authenticated users only
- Catalog: anon read (dengan RLS yang membatasi data sensitif)
- Tidak ada data sensitif (HPP, profit) di catalog

### Dark Mode
- Admin dan POS mendukung dark/light mode
- Preference disimpan di localStorage
- Catalog selalu dark (desain identitas brand)

---

## 6. Integrasi Pihak Ketiga

| Service | Kegunaan | Konfigurasi |
|---------|----------|-------------|
| Supabase | Database, Auth, Realtime | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Cloudinary | Upload & CDN gambar | `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` |
| Vercel | Hosting & deployment | `vercel.json` per app |

---

## 7. Roadmap / Backlog

### Prioritas Tinggi
- [ ] Push notification ke admin saat ada transfer pending baru
- [ ] Export laporan ke Excel/PDF

### Prioritas Sedang
- [ ] Riwayat harga per produk (price history)
- [ ] Fitur pre-order / pesanan khusus
- [ ] Multi-user role (admin vs kasir yang lebih terbatas)

### Nice to Have
- [ ] Barcode scanner untuk input produk di POS
- [ ] Integrasi WhatsApp Business API untuk notifikasi otomatis
- [ ] Dashboard analytics di admin
