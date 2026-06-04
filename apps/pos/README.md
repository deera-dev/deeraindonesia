# apps/pos — Aplikasi Kasir POS

Aplikasi kasir **offline-first** untuk transaksi di pasar grosir.
Dirancang untuk pengguna mobile (jari besar, layar pasar terang, gerak cepat).

---

## Routing

| Route | Halaman | Fungsi |
|-------|---------|--------|
| `/` | Kasir | Transaksi penjualan & retur |
| `/laporan` | Laporan | Laporan harian/mingguan, filter transaksi |
| `/pelanggan` | Pelanggan | Manajemen data pembeli |

Navigasi via `PosBottomNav` dengan `NavLink` — URL dipertahankan saat refresh.

---

## Struktur Folder

```
apps/pos/src/
├── App.jsx
├── pages/
│   ├── Kasir.jsx
│   ├── Laporan.jsx
│   └── Pelanggan.jsx
├── components/
│   ├── kasir/
│   │   ├── ProductList.jsx
│   │   ├── CartPanel.jsx
│   │   ├── CartItem.jsx
│   │   ├── WarnaPanel.jsx
│   │   ├── BuyerInput.jsx
│   │   └── PriceEditor.jsx
│   ├── laporan/
│   │   ├── MetricCard.jsx
│   │   ├── FilterBar.jsx
│   │   ├── SaleCard.jsx
│   │   ├── DetailModal.jsx
│   │   ├── ReturModal.jsx
│   │   └── DeleteConfirm.jsx
│   ├── AppHeader.jsx
│   ├── LoginScreen.jsx
│   ├── SyncErrorModal.jsx
│   ├── Struk.jsx           # Modal struk: print, PNG, share WA, BLE
│   ├── StrukContent.jsx    # Visual struk (di-capture ke PNG via html-to-image)
│   └── PosBottomNav.jsx
├── hooks/
│   ├── useCart.js
│   ├── useSales.js         # Report, buat sale, retur, hapus + localDateStr()
│   ├── useProducts.js      # Offline-first, debounce realtime
│   ├── usePelanggan.js
│   └── useTsplPrinter.js
└── lib/
    ├── db.js               # Dexie schema, key: [kode+size+warna]
    ├── sync.js             # syncStok() — Dexie transaction + Promise lock
    └── salesUtils.js
```

---

## Bug Fix Penting

### Timezone "Hari Ini" (fixed)
`toISOString()` menggunakan UTC — transaksi jam 00.00–07.00 WIB tersimpan
dengan tanggal kemarin. Semua date sekarang memakai `localDateStr()`:

```js
function localDateStr(d = new Date()) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}
```

---

## Sync Strategy

1. Load dari IndexedDB (cache) → tampil segera
2. Sync dari Supabase → update IndexedDB → re-render
3. Realtime listener (debounced 600ms) untuk perubahan `stok_warna`
4. `visibilitychange` listener sebagai backup

**KRITIS**: `syncStok()` di `lib/sync.js`:
- Shared Promise lock → cegah fetch ganda
- `db.transaction("rw", ...)` atomik → cegah race condition antara `clear()` dan `bulkPut()`

---

## Lokasi Pasar Otomatis

```
Senin, Kamis → Cideng
Jumat        → Tegalgubug
Hari lain    → Gudang
```

---

## Struk

- **Print**: `window.print` dengan CSS `@media print`
- **Download PNG**: `html-to-image` toPng, pixelRatio 3
- **Share**: Web Share API → fallback WA link
- **BLE Print**: `useTsplPrinter` (Bluetooth thermal printer)

---

## UI/UX Guidelines

- Touch target minimum 44×44px (tombol utama 48–56px)
- Font minimum `text-base` (16px) untuk konten interaktif
- Stok 0 → `text-red-600 font-bold`
- Warna primer: `#CAB170` (gold)
- Tombol destruktif: `bg-red-500` + konfirmasi modal
