# ARCHITECTURE.md — Arsitektur Teknis
# Deera Indonesia

---

## 1. Gambaran Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌───────────┐   ┌───────────┐   ┌─────────────────────┐   │
│  │  Catalog  │   │   Admin   │   │        POS          │   │
│  │  (React)  │   │  (React)  │   │  (React + Dexie)    │   │
│  └─────┬─────┘   └─────┬─────┘   └──────────┬──────────┘   │
│        │               │                     │              │
│        │               │              ┌──────┴──────┐       │
│        │               │              │  IndexedDB  │       │
│        │               │              │  (Dexie)    │       │
│        │               │              └─────────────┘       │
└────────┼───────────────┼─────────────────────┼─────────────┘
         │               │                     │
         │        @deera/shared                │
         │         (package)                   │
         │               │                     │
         └───────────────┴─────────────────────┘
                         │
                    Supabase SDK
                         │
         ┌───────────────┴─────────────────────┐
         │            SUPABASE                  │
         │                                      │
         │  PostgreSQL (database)               │
         │  Auth (JWT sessions)                 │
         │  Realtime (WebSocket pub/sub)        │
         │  RLS (row-level security)            │
         └──────────────────────────────────────┘
                         │
                  Cloudinary CDN
                  (gambar produk)
```

---

## 2. Monorepo Structure

Project ini menggunakan **npm workspaces**. Setiap app di `apps/` adalah Vite
project independen yang bisa di-build dan di-deploy terpisah.

```
deeraindonesia/
│
├── package.json              ← root workspace config
│
├── packages/
│   └── shared/               ← @deera/shared
│       ├── package.json
│       ├── components/
│       │   ├── BackToTop.jsx
│       │   └── ThemeToggle.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useProducts.js    ← catalog/admin: module-level cache
│       │   ├── useTransfers.js   ← transfer CRUD + audit
│       │   ├── useTheme.js
│       │   └── useStokByLocation.js
│       └── lib/
│           ├── supabase.js       ← singleton Supabase client
│           ├── auth.js           ← getCurrentUser, displayName
│           ├── cloudinary.js     ← uploadImage, cldUrl
│           ├── constants.js      ← SIZE_PRESETS, buildKode, formatHarga
│           ├── marketDay.js      ← lokasi pasar per hari
│           ├── storeInfo.js      ← nama toko, rekening, WA
│           └── waFormat.js       ← format pesan WhatsApp
│
├── apps/
│   ├── catalog/
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── Catalog.jsx   ← halaman utama snap-scroll
│   │       │   └── ProductDetail.jsx
│   │       └── components/
│   │           ├── CatalogSlide.jsx
│   │           └── Modal.jsx     ← modal "Visit Us"
│   │
│   ├── admin/
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── Admin.jsx     ← product list + CRUD
│   │       │   ├── StokOpname.jsx
│   │       │   ├── Transfer.jsx
│   │       │   ├── BukuPotongan.jsx
│   │       │   ├── History.jsx   ← audit log
│   │       │   └── Login.jsx
│   │       ├── components/
│   │       │   ├── admin/        ← ProductForm, ProductCard, ImageSection, SizeSection
│   │       │   └── transfer/     ← TransferForm, TransferCard, SuratJalan, ConfirmModal
│   │       └── hooks/
│   │           ├── useHistory.js
│   │           └── usePushNotification.js
│   │
│   └── pos/
│       └── src/
│           ├── App.jsx           ← auth, doSync, tab navigation
│           ├── pages/
│           │   ├── Kasir.jsx
│           │   ├── Laporan.jsx
│           │   └── Pelanggan.jsx
│           ├── components/
│           │   ├── kasir/        ← ProductList, CartPanel, WarnaPanel, CartItem, dll
│           │   └── laporan/      ← LaporanRiwayat, LaporanKeuangan, dll
│           ├── hooks/
│           │   ├── useProducts.js  ← offline-first, BERBEDA dari shared
│           │   ├── useCart.js
│           │   ├── useSales.js
│           │   └── usePelanggan.js
│           └── lib/
│               ├── db.js           ← Dexie schema
│               ├── sync.js         ← syncStok, syncProducts, dll
│               └── salesUtils.js   ← helper kalkulasi
```

---

## 3. Data Flow

### 3.1 Catalog (Read-only)

```
Supabase (products table)
       ↓ useProducts() – fetch sekali, module-level cache
React State (products[])
       ↓
CatalogSlide components
```

### 3.2 Admin Product CRUD

```
User action (form submit)
       ↓
Supabase.upsert(products)
       ↓
logHistory() → Supabase.insert(product_history)
       ↓
invalidateProducts() → re-fetch
       ↓
UI update
```

### 3.3 POS Offline-First (Critical Path)

```
App Mount
  │
  ├─→ [Step 1] Dexie (IndexedDB) → loadEnriched() → setProducts (immediate display)
  │
  └─→ [Step 2] Supabase fetch
        │
        ├─→ syncProducts() → db.products.clear() → bulkPut()
        │
        └─→ syncStok() ──────────────────────────────────┐
              │  [shared Promise lock]                   │
              │  fetch stok_warna from Supabase          │
              │  db.transaction("rw", db.stok_warna,     │  ← ATOMIK
              │    clear() + bulkPut()                   │
              │  )                                       │
              └──────────────────────────────────────────┘
                         ↓
                  loadEnriched() → setProducts (fresh display)

Sale Created (Kasir)
  │
  ├─→ applyStokLocal() → update IndexedDB (immediate)
  │
  └─→ [if online] applyStokToSupabase() + sales.insert()
      [if offline] sales.insert(status:"pending")
                         ↓ [when online]
                   flushPendingSales() → sync ke Supabase

Stok Opname (Admin) → Supabase Realtime Event → POS
  │
  └─→ stok_warna rows updated in Supabase
        ↓ Realtime postgres_changes event
        ↓ POS Realtime listener (debounce 600ms)
        ↓ refreshStok() → syncStok() [atomic] → loadEnriched()
        ↓ setProducts (stok update terlihat di POS)
```

---

## 4. State Management

Tidak ada global state manager. State dikelola dengan:

### Catalog
- Module-level cache di `useProducts.js` (tidak re-fetch antar navigasi)
- `useState` untuk modal open/close

### Admin
- `useState` lokal per halaman
- Data di-fetch ulang via `reload()` setelah mutasi
- `useCallback` untuk memoize fetch functions

### POS
- `useState` untuk UI state
- `useRef` untuk: sync lock (`syncing`), debounce timer (`realtimeTimer`)
- IndexedDB (Dexie) sebagai source of truth untuk produk dan stok
- `localStorage` untuk:
  - Tema dark/light
  - Modal "Visit Us" (catalog)
  - Deleted sale IDs (POS, untuk mencegah "bangkit" setelah hapus)

---

## 5. Authentication

Semua app menggunakan **Supabase Auth** (email + password).

```
packages/shared/lib/supabase.js
  → createClient(url, anonKey)
  → singleton instance, dipakai semua app

packages/shared/hooks/useAuth.js
  → supabase.auth.getSession()
  → supabase.auth.onAuthStateChange()
  → return { user, loading }

apps/admin/src/components/ProtectedRoute.jsx
  → redirect ke /login jika tidak ada user

apps/pos/src/App.jsx
  → if (!user) return <LoginScreen />
```

**Session:** JWT disimpan di localStorage oleh Supabase SDK secara otomatis.
**RLS:** Semua query ke Supabase secara otomatis menyertakan JWT di header.

---

## 6. Image Architecture

```
Upload (Admin/POS)
  └─→ uploadImage(file) [cloudinary.js]
        └─→ POST https://api.cloudinary.com/v1_1/{cloud}/image/upload
              └─→ Returns: { url, publicId, ... }
                    └─→ Disimpan sebagai URL string di products.image

Display
  └─→ cldUrl(url, { width: 320 })
        └─→ Inject transform: /upload/f_auto,q_auto,w_320/
              └─→ Cloudinary otomatis serve WebP/AVIF
```

Tidak ada biaya storage Supabase untuk gambar. Gambar hidup di Cloudinary.

---

## 7. Realtime Architecture

POS menggunakan **Supabase Realtime** untuk menerima update stok secara instan:

```
Admin melakukan Stok Opname
  └─→ supabase.from("stok_warna").upsert(rows)
        └─→ PostgreSQL triggers change event
              └─→ Supabase Realtime (via WebSocket)
                    └─→ POS Realtime listener (debounce 600ms)
                          └─→ refreshStok() → syncStok() → loadEnriched()
                                └─→ setProducts(fresh) → UI update
```

**Requirement Supabase:**
```sql
ALTER TABLE stok_warna REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE stok_warna;
```

---

## 8. Deployment

Setiap app di-deploy ke **Vercel** sebagai project terpisah.

```
apps/catalog/vercel.json  → domain: catalog.deera.id (atau sesuai config)
apps/admin/vercel.json    → domain: admin.deera.id
apps/pos/vercel.json      → domain: pos.deera.id
```

**Build command per app:**
```bash
npm run build --workspace=apps/catalog
npm run build --workspace=apps/admin
npm run build --workspace=apps/pos
```

Output: `dist/` folder di masing-masing app (SPA, di-serve sebagai static files).

---

## 9. Race Condition Prevention (POS Stok)

Ini adalah bagian paling kritis dari arsitektur. Masalah:

```
syncStok() traditional:
  await db.stok_warna.clear()    ← TX 1 commit
  await db.stok_warna.bulkPut()  ← TX 2 start

Jika loadEnriched() dipanggil di antara TX 1 dan TX 2:
  db.stok_warna.toArray() → [] (kosong!)
  stokByWarna = {} → semua produk tampil HABIS
```

**Solusi yang diimplementasikan:**

```js
// 1. Dexie transaction atomik
await db.transaction("rw", db.stok_warna, async () => {
  await db.stok_warna.clear();
  await db.stok_warna.bulkPut(rows);
  // Reader concurrent TIDAK bisa melihat state kosong
});

// 2. Shared Promise lock (cegah fetch duplikat)
let _syncStokPromise = null;
export function syncStok() {
  if (_syncStokPromise) return _syncStokPromise; // return same Promise
  _syncStokPromise = (async () => { ... })()
    .finally(() => { _syncStokPromise = null; });
  return _syncStokPromise;
}

// 3. Debounce di Realtime listener (cegah flood dari banyak row update)
realtimeTimer.current = setTimeout(() => refreshStok(), 600);

// 4. Retry di loadEnriched jika stok kosong tapi produk ada
if (products.length > 0 && stokRows.length === 0) {
  await new Promise(r => setTimeout(r, 150));
  stokRows = await db.stok_warna.toArray();
}
```

---

## 10. Dexie Schema Evolution

```js
// db.js
db.version(1) → products, sales
db.version(2) → + stok_warna [kode+size+warna], kode
db.version(3) → + pelanggan
db.version(4) → + sales.supabase_id index

// stok_warna primary key: compound [kode, size, warna]
// Semua bagian key HARUS non-null untuk IndexedDB
// Produk tanpa warna: warna = "_" (string underscore)
```

Saat menambah versi Dexie baru, versi lama HARUS tetap ada (IndexedDB migration).
