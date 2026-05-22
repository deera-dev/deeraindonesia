# packages/shared — Kode Bersama

Semua kode yang dipakai oleh lebih dari satu app (pos, admin, catalog).
Diimport via alias `@deera/shared/...` (dikonfigurasi di setiap `vite.config.js`).

---

## Isi

```
packages/shared/
├── lib/
│   ├── supabase.js     # Supabase client (singleton)
│   ├── auth.js         # signIn, signOut, displayName
│   ├── cloudinary.js   # cldUrl() — generate URL gambar dari public_id
│   ├── constants.js    # SIZE_PRESETS, formatHarga(), buildKode()
│   ├── marketDay.js    # getMarketLocation(), LOCATION_LABELS, dll
│   ├── storeInfo.js    # Info toko: nama, WA, rekening bank
│   └── waFormat.js     # generateWAText() — format pesan WA produk
├── hooks/
│   ├── useAuth.js      # Hook: user, loading dari Supabase Auth
│   └── useProducts.js  # Hook: fetch + cache produk dari Supabase
└── styles/
    └── index.css       # Font + Tailwind base styles
```

---

## Referensi Cepat

### `formatHarga(val)`
Format angka ke format Rupiah Indonesia: `250000` → `"250.000"`

### `getMarketLocation(date?)`
Kembalikan lokasi pasar berdasarkan hari: `"gudang"` | `"cideng"` | `"tegalgubug"`

### `cldUrl(publicId, options?)`
Generate URL gambar Cloudinary dengan transformasi (width, format auto, quality auto).

### `useProducts()`
Hook dengan cache module-level — tidak fetch ulang antar navigasi.
Returns: `{ products, loading, error }`

Produk di-enrich dengan `stokByWarna`:
```js
stokByWarna = { [size]: { [warnaName]: { gudang, cideng, tegalgubug } } }
```

### `useAuth()`
Returns: `{ user, loading }` — user adalah Supabase User object atau null.

---

## Menambah Fungsi Baru

Jika fungsi hanya dipakai oleh **satu app**, taruh di dalam app itu sendiri (`apps/pos/src/lib/`).
Jika dipakai oleh **2+ app**, taruh di sini (`packages/shared/lib/`).
