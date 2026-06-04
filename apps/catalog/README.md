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

## Fitur

- **Scroll snap vertikal** — satu slide per produk, nyaman di mobile
- **Sold-out stamp** — overlay HABIS (grayscale + stempel merah) jika stok = 0
- **Sort Z→A** — produk terbaru (kode terbesar) muncul paling atas
- **Modal "Visit Us"** — muncul sekali per hari via localStorage
- Hanya produk dengan `image` yang tampil

---

## Cara Sold-Out Terdeteksi

```
Catalog.jsx → supabase.rpc("get_sold_out_kodes")
           → LEFT JOIN products × stok_warna
           → kembalikan kode yang total stok = 0 atau belum ada di stok_warna
```

RPC dipakai karena anon user tidak punya akses langsung ke `stok_warna`.

---

## Deploy

App publik — bisa di-host di Netlify/Vercel tanpa auth.
Env: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
