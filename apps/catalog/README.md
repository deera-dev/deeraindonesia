# apps/catalog — Katalog Publik

Katalog produk bergaya Instagram — scroll vertikal layar penuh, satu produk per "slide".
**Tidak membutuhkan login**. Dirancang untuk dibagikan ke pelanggan via link/QR.

---

## Struktur Folder

```
apps/catalog/src/
├── App.jsx
├── pages/
│   ├── Catalog.jsx       # Feed produk + fetch sold-out dari Supabase RPC
│   └── ProductDetail.jsx # Halaman detail satu produk
└── components/
    ├── CatalogSlide.jsx  # Slide satu produk (gambar, info, sold-out stamp)
    └── Modal.jsx         # Modal "Visit Us" (info toko, tampil 1x/hari)
```

---

## Fitur Utama

- **Scroll snap vertikal** — satu slide per produk, nyaman di mobile
- **Sold-out stamp** — overlay HABIS (grayscale + stempel merah) jika stok = 0
- **Sort Z→A** — produk terbaru (kode terbesar) muncul paling atas
- **Modal "Visit Us"** — muncul sekali per hari via localStorage

---

## Cara Sold-Out Terdeteksi

```
Catalog.jsx → supabase.rpc("get_sold_out_kodes")
           → function SECURITY DEFINER di Supabase
           → LEFT JOIN products × stok_warna
           → kembalikan kode yang total stok = 0 atau belum ada di stok_warna
           → setSoldOutSet(new Set(kodes))
           → soldOut={soldOutSet.has(model.kode)} dikirim ke CatalogSlide
```

> RPC dipakai (bukan query langsung) karena anon user tidak punya akses ke tabel `stok_warna`.

---

## Deploy

Catalog adalah app **publik** — bisa di-host di Netlify/Vercel tanpa auth.
Set environment variable `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
