# apps/admin — Dashboard Admin

Aplikasi web untuk mengelola produk, stok, dan riwayat perubahan.
Membutuhkan login (Supabase Auth). Dirancang untuk dipakai di desktop/tablet.

---

## Struktur Folder

```
apps/admin/src/
├── App.jsx
├── pages/
│   ├── Admin.jsx       # Halaman utama: grid produk + stokMap
│   ├── History.jsx     # Riwayat perubahan produk
│   └── Login.jsx       # Form login admin
├── components/
│   └── admin/
│       ├── ProductCard.jsx  # Kartu produk: gambar, stok, tombol aksi
│       ├── ProductForm.jsx  # Form tambah/edit produk lengkap
│       ├── ImageSection.jsx # Upload & preview gambar (Cloudinary)
│       ├── SizeSection.jsx  # Input ukuran & harga per ukuran
│       └── StockSection.jsx # Input stok per warna × lokasi
└── hooks/
    └── useHistory.js    # Log perubahan ke tabel history Supabase
```

---

## Alur Data Stok

```
Admin input stok di StockSection
  → StockForm.jsx simpan ke stok_warna (upsert per kode+size+warna)
  → Admin.jsx ambil stokMap dari stok_warna (aggregate per kode)
  → ProductCard menampilkan stok per lokasi dari stokMap prop
```

> ⚠ Stok TIDAK disimpan di tabel `products`. Selalu baca dari `stok_warna`.

---

## Menambah Produk Baru

1. Klik "+ Tambah" di header
2. Isi kode produk (format: `D-{nomor}-{bahan}`, contoh: `D-76-JAQ`)
3. Upload gambar (otomatis ke Cloudinary)
4. Tambah ukuran & harga per ukuran
5. Isi warna yang tersedia
6. Input stok per warna × lokasi di StockSection
7. Simpan → data masuk ke Supabase, invalidate cache

---

## Sort Produk

Produk diurutkan Z→A berdasarkan kode (produk terbaru biasanya punya nomor lebih besar).
Urutan default bisa diatur via kolom `position` di tabel `products`.
