# apps/pos — Aplikasi Kasir POS

Aplikasi kasir **offline-first** untuk transaksi di pasar grosir.
Dirancang untuk pengguna mobile (jari besar, layar pasar terang, gerak cepat).

---

## Struktur Folder

```
apps/pos/src/
├── App.jsx               # Entry point: auth, sync, navigasi tab
├── pages/
│   ├── Kasir.jsx         # Halaman transaksi (komposisi komponen)
│   ├── Laporan.jsx       # Laporan harian (komposisi komponen)
│   └── Pelanggan.jsx     # Manajemen data pembeli
├── components/
│   ├── kasir/
│   │   ├── ProductList.jsx   # Grid/list produk untuk dipilih
│   │   ├── CartPanel.jsx     # Panel keranjang kanan/fullscreen
│   │   ├── CartItem.jsx      # Satu baris item di keranjang
│   │   ├── WarnaPanel.jsx    # Bottom sheet pilih warna & qty
│   │   ├── BuyerInput.jsx    # Autocomplete nama pembeli
│   │   └── PriceEditor.jsx   # Input ubah harga inline
│   ├── laporan/
│   │   ├── MetricCard.jsx    # Kartu ringkasan (omset, untung, dll)
│   │   ├── FilterBar.jsx     # Tab filter + date picker
│   │   ├── SaleCard.jsx      # Kartu satu transaksi di list
│   │   ├── DetailModal.jsx   # Modal detail transaksi lengkap
│   │   ├── ReturModal.jsx    # Modal partial retur + QtyControl
│   │   └── DeleteConfirm.jsx # Dialog konfirmasi hapus
│   ├── AppHeader.jsx         # Header: sync, lokasi, tab nav
│   ├── LoginScreen.jsx       # Form login
│   ├── SyncErrorModal.jsx    # Modal ketika sync gagal
│   └── Struk.jsx             # Komponen struk (print + download PNG)
├── hooks/
│   ├── useCart.js        # State & logika keranjang belanja
│   ├── useSales.js       # Report, buat sale, retur, hapus
│   ├── useProducts.js    # Load produk dari IndexedDB + sync stok
│   └── usePelanggan.js   # Search & tambah pelanggan
└── lib/
    ├── db.js             # Dexie schema (IndexedDB)
    ├── sync.js           # Sync Supabase ↔ IndexedDB
    └── salesUtils.js     # Helper: effectiveQty, itemProfit, formatTime
```

---

## Alur Data

### Transaksi Baru

```
Kasir → pilih produk → WarnaPanel (pilih warna/qty) → cart
     → isi nama pembeli (opsional)
     → tap Bayar
     → useCreateSale():
         1. simpan ke IndexedDB (status: "pending")
         2. kurangi stok di IndexedDB (applyStokLocal)
         3. jika online: sync ke Supabase + update status "synced"
     → tampilkan Struk
```

### Sync Otomatis

```
App start / kembali online
  → doSync(silent=true)
  → syncProducts() + syncStok() + syncPelanggan()  ← Supabase → IndexedDB
  → flushPendingSales()                             ← IndexedDB pending → Supabase
```

### Stok

Stok dibaca dari `stokByWarna` yang diisi oleh `useProducts.js`:

```js
stokByWarna = {
  [size]: {
    [warnaName]: { gudang: N, cideng: N, tegalgubug: N },
  },
};
```

---

## Cara Tambah Komponen Baru

1. Buat file di folder yang sesuai (`components/kasir/` atau `components/laporan/`)
2. Export default function dengan JSDoc props di atas
3. Import di halaman yang membutuhkan (Kasir.jsx atau Laporan.jsx)
4. Jangan taruh logika bisnis di komponen — gunakan hook atau salesUtils.js

---

## UI/UX Guidelines

- **Touch target minimum**: 44px × 44px (tombol penting: 48-56px)
- **Font minimum**: `text-base` (16px) untuk konten interaktif
- **Harga & kode produk**: `text-xl` atau lebih besar
- **Stok 0**: `text-red-600 font-bold` — harus sangat jelas terlihat
- **Warna primer (tombol utama)**: `#CAB170` (gold)
- **Tombol destruktif**: `bg-red-500` — selalu butuh konfirmasi
