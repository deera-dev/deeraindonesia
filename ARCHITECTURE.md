# ARCHITECTURE.md — Arsitektur Teknis

# Deera Indonesia

> **Catatan migrasi (mulai 2026-06):** Bagian 1–10 di bawah ini mendeskripsikan
> arsitektur yang berjalan sebelum refactor Zustand + TanStack Query + Vertical
> Slice. Bagian 9 dan 10 (race condition prevention POS, Dexie schema) TETAP
> berlaku apa adanya — inti offline-sync POS sengaja TIDAK diubah oleh refactor
> ini. Bagian lain (struktur folder, state management per app, lokasi hooks)
> berangsur digantikan oleh konvensi baru di **Bagian 11** seiring tiap
> app/slice selesai dimigrasi. Cek tabel status di akhir Bagian 11 untuk tahu
> bagian mana yang sudah migrasi dan mana yang masih mengikuti dokumentasi lama
> di atas.

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

---

## 11. Refactor: Vertical Slice + Zustand + TanStack Query (target arsitektur)

### 11.1 Tujuan

- **Vertical Slice Architecture**: kode dikelompokkan per fitur/use-case
  (`features/<nama-fitur>/`), bukan per layer teknis (tidak ada lagi folder
  `components/`, `hooks/` datar yang menampung semua domain dalam satu app).
- **Zustand**: satu-satunya mekanisme state client (UI state, form draft,
  filter, modal) — mengganti pola "lift state ke parent" / props-drilling.
- **TanStack Query**: satu-satunya mekanisme data fetching/caching dari
  Supabase — mengganti pola manual `useEffect` + `supabase.from(...).select()`
  dan cache module-level manual (`useProducts` lama).
- **Dependency Inversion ala React**: komponen UI (modul level-tinggi) HANYA
  boleh import dari `features/<fitur>/hooks.js` (abstraksi). Komponen TIDAK
  PERNAH import `supabase`, Zustand store, atau Dexie langsung.
- **Pengecualian eksplisit**: inti offline-sync POS yang dijelaskan di Bagian
  9–10 di atas (`apps/pos/src/lib/sync.js`, `apps/pos/src/lib/db.js`,
  `apps/pos/src/hooks/useProducts.js`) **tidak** ditulis ulang maupun
  dipindah lokasinya.

### 11.2 Struktur folder per app (target)

```
apps/<app>/src/
  App.jsx              # Routes saja
  main.jsx              # Entry point + provider wiring (QueryClientProvider, dst)
  features/
    <nama-fitur>/
      api.js               # Panggilan Supabase MENTAH — pure async functions, no React.
                            #   "Modul level-rendah". Tidak pernah diimport komponen.
      queries.js            # useQuery/useMutation hooks yang membungkus api.js.
      store.js               # (opsional) Zustand store — hanya kalau ada state client asli
                              #   (form draft, filter, modal, tab aktif).
      hooks.js                # PUBLIC SURFACE. Re-export dari queries.js + store.js.
                              #   Komponen HANYA boleh import dari sini (atau index.js).
      utils.js                 # pure helpers (fmtRp, fmtDate, dst) — pola sama seperti sebelumnya.
      components/
        <Fitur>Page.jsx         # lean orchestrator (≤200 baris, konvensi lama tetap berlaku)
        <Fitur>Card.jsx
        <Fitur>Form.jsx
      index.js                  # barrel export: hooks publik + komponen Page untuk App.jsx
  shared/                     # potongan lintas-fitur milik app ini SENDIRI (bukan business logic)
    components/                #   AppBottomNav, ProtectedRoute, AppHeader, Layout
```

**Contoh konkret** — `apps/admin/src/features/transfer/`:

```
features/transfer/
  api.js        → fetchTransfers(), createTransfer(), approveTransfer(), ...
  queries.js     → useTransfersQuery(statusTab, dateFrom, dateTo),
                   useCreateTransferMutation(), useApproveTransferMutation(), ...
  store.js        → useTransferDraftStore (Zustand + persist → ganti localStorage manual)
  hooks.js          → export { useTransfersQuery, useCreateTransferMutation, ... } from "./queries"
                       export { useTransferDraftStore } from "./store"
  utils.js
  components/
    TransferPage.jsx
    TransferForm.jsx
    TransferCard.jsx
    SuratJalan.jsx
    ConfirmModal.jsx
  index.js
```

`TransferForm.jsx` sebelumnya menyimpan draft ke `localStorage["transfer_draft_v1"]`
manual di dalam komponen. Setelah refactor, draft pindah ke
`useTransferDraftStore` (Zustand + middleware `persist`, key tetap
`transfer_draft_v1` agar draft user yang sedang berjalan tidak hilang saat
deploy). Komponen hanya panggil `const draft = useTransferDraftStore()` —
TIDAK ada `localStorage.setItem` langsung di komponen lagi. Ini SECARA SENGAJA
menggantikan aturan lama di CLAUDE.md §13 "Jangan simpan state ke localStorage
di komponen React" — aturan itu tetap berlaku untuk akses localStorage
*manual*, tapi persistensi lewat Zustand `persist` middleware kini jadi
mekanisme resmi untuk draft autosave.

### 11.3 Konvensi packages/shared

`packages/shared` adalah *shared kernel*, bukan satu app — "vertical
slice"-nya dikelompokkan per domain lintas-app:

```
packages/shared/
  features/
    auth/        { api.js, hooks.js }                     # signIn, signOut, useAuth
    products/    { api.js, queries.js, hooks.js }          # ganti module-level cache → TanStack Query
    transfers/   { api.js, queries.js, hooks.js }
    stok/        { api.js, queries.js, hooks.js }          # useStokByLocation
    theme/       { store.js, hooks.js }                    # Zustand, no server data
    toast/       { store.js, hooks.js }                    # Zustand pub-sub
  lib/
    supabase.js        # client mentah — TIDAK pindah, tetap titik akses tunggal ke Supabase
    queryClient.js       # factory createAppQueryClient()
    constants.js
    marketDay.js
    storeInfo.js
    cloudinary.js
    waFormat.js
    bepUtils.js           # pure calculation, tidak berubah
  components/
    BackToTop.jsx
    ThemeToggle.jsx
    ToastContainer.jsx
```

Import path lama (`@deera/shared/hooks/useProducts`) diganti total ke
`@deera/shared/features/products/hooks` di SEMUA file consumer — tidak ada
shim kompatibilitas, sesuai keputusan "restrukturisasi total sekali jalan".

### 11.4 Konvensi TanStack Query

- Satu `QueryClient` per app, dibuat dari factory `createAppQueryClient()` di
  `packages/shared/lib/queryClient.js`, diinstansiasi di
  `apps/<app>/src/main.jsx`, dibungkus `<QueryClientProvider client={queryClient}>`.
- Default options: `staleTime: 30_000`, `refetchOnWindowFocus: false`,
  `retry: 1` (aplikasi bisnis internal trafik rendah, koneksi kadang lambat
  di pasar — refetch agresif tidak perlu, retry sekali cukup untuk transient
  network blip).
- `queryKeys` per fitur didefinisikan di `queries.js` fitur tersebut, contoh:
  ```js
  export const transferKeys = {
    list: (status, from, to) => ["transfers", status, from, to],
    all: ["transfers"],
  };
  ```
- Mutation WAJIB `invalidateQueries` ke key relevan setelah sukses
  (menggantikan pola `invalidateProducts()` manual yang ada sekarang).
- `api.js` tidak boleh import React/hooks apapun — murni async function yang
  menerima parameter dan mengembalikan data/melempar error.

### 11.5 Konvensi Zustand

- Satu store per fitur, HANYA dibuat kalau memang ada state client asli
  (form multi-step, draft, filter, tab aktif, modal visibility). State
  `useState` lokal sederhana yang tidak dibagi ke komponen lain TETAP
  `useState` biasa — Zustand bukan pengganti `useState` untuk semua kasus.
- Store diekspos lewat `hooks.js` fitur (re-export), bukan diimport langsung
  dari `store.js` oleh komponen — supaya boundary Dependency Inversion
  konsisten: komponen → `hooks.js` (abstraksi) → `store.js`/`queries.js`
  (implementasi).
- Draft yang sebelumnya manual localStorage (`stok_opname_draft_v1`,
  `transfer_draft_v1`) pindah ke Zustand `persist` middleware dengan key
  yang SAMA, supaya draft existing user tidak hilang.

### 11.6 Pengecualian: Inti Offline-Sync POS (TIDAK disentuh)

File berikut tetap seperti sekarang — tidak dipindah, tidak ditulis ulang,
tidak dibungkus (lihat juga Bagian 9–10):

- `apps/pos/src/lib/sync.js`
- `apps/pos/src/lib/db.js`
- `apps/pos/src/hooks/useProducts.js`

Fitur lain di apps/pos (kasir, laporan, pelanggan, riwayat) boleh dipindah ke
`features/` dan boleh memakai Zustand untuk state UI (cart, filter, modal) dan
TanStack Query untuk pembacaan non-kritis (BEP, pelanggan, riwayat) — TAPI
ketika mereka butuh data products/stok yang sinkron offline, mereka tetap
`import { useProducts } from "../../hooks/useProducts"` apa adanya. Ini tidak
melanggar Dependency Inversion karena `useProducts` itu sendiri SUDAH berupa
hook abstraksi yang valid.

### 11.7 Status rollout

| Bagian | Status |
| --- | --- |
| Dependency install (zustand, @tanstack/react-query) | ✅ selesai |
| `packages/shared/lib/queryClient.js` + provider wiring 4 app | ✅ selesai (build hijau: catalog, admin, pos, finance) |
| `packages/shared` → vertical slice (`features/*`) | ✅ selesai (build hijau: catalog, admin, pos, finance) |
| `apps/catalog` → vertical slice | ✅ selesai (build hijau) |
| `apps/admin` → vertical slice | ✅ selesai (build hijau) |
| `apps/pos` (UI state saja, sync core dipertahankan) | ✅ selesai (build hijau) |
| `apps/finance` → vertical slice | ✅ selesai (build hijau) |
| File lama/stub dibersihkan dari seluruh repo | ✅ selesai (80 file dihapus fisik, lihat catatan di bawah) |
| CLAUDE.md diupdate mengikuti konvensi baru | ✅ selesai |

Seluruh 4 app (`catalog`, `admin`, `pos`, `finance`) plus `packages/shared`
sudah 100% berada di struktur vertical-slice yang dijelaskan di §11.2–11.6.
`npm run build:all` lolos bersih untuk keempat app (error
`Missing script: "build"` pada workspace `@deera/shared` yang muncul setelah
itu adalah perilaku lama yang sudah ada sebelum refactor — `packages/shared`
memang tidak punya build step sendiri, dipakai sebagai source langsung oleh
4 app, bukan regresi).

**Catatan lingkungan (koreksi dari draf sebelumnya):** dokumen versi
sebelumnya dari bagian ini menyatakan "sandbox tidak bisa menghapus file
apa pun" dan menyarankan Denny menghapus file stub secara manual lewat
Windows Explorer. **Itu tidak lagi akurat.** Setelah pengujian ulang,
`rm`/`mv` ternyata berhasil dengan normal di environment ini — kemungkinan
masalah sebelumnya bersifat sementara/intermiten, bukan batasan permanen.
Akibatnya, **seluruh file lama (80 file) yang sebelumnya hanya ditimpa
jadi stub `export {}` sudah dihapus secara fisik** dari repo (lihat rincian
per app di bawah) — tidak ada lagi file mati/stub yang tersisa di mana pun
di repo ini per akhir refactor ini. Catatan ini sengaja dipertahankan
sebagai referensi: jika di sesi mendatang sebuah AI assistant menemukan
`rm`/`mv`/`os.remove()` gagal dengan `Operation not permitted`, jangan
langsung asumsikan itu batasan permanen — coba ulang, dan jika tetap gagal,
gunakan pola stub (`export {}` + komentar `DEPRECATED`) sebagai fallback
sampai konfirmasi lebih lanjut.

**Catatan lingkungan kedua (korupsi NUL-byte saat overwrite file panjang →
pendek):** selama proses stubbing (sebelum file-file dihapus permanen),
ditemukan bug environment: jika sebuah file panjang (misal halaman 2000
baris) ditimpa dengan konten jauh lebih pendek (stub 5 baris) lewat tool
Write, kadang-kadang hasil yang terlihat oleh proses build (bukan oleh tool
Read) adalah teks stub yang benar diikuti BYTE NUL (`\x00`) sepanjang sisa
ukuran file lama, bukan file yang benar-benar terpotong pendek. Ini tidak
membuat parser esbuild hang (cuma syntax error instan), tapi diduga kuat
membuat Tailwind's content-scanner (`content: ["./src/**/*.{js,jsx}", ...]`
di `tailwind.config.js` tiap app) hang membaca file yang ~90% byte NUL,
yang bikin `vite build` menggantung tanpa error di tahap "transforming...".
Tanda-tanda: build hang tanpa pesan error sama sekali, padahal isolated
`esbuild.transform()` per file selesai dalam hitungan detik. **Solusi**:
tulis ulang file yang dicurigai lewat heredoc bash (`cat > file << 'EOF'`)
alih-alih tool Write, lalu verifikasi `data.count(0) == 0` lewat Python
sebagai pengecekan akhir. Sekarang isu ini moot karena semua file stub
sudah dihapus permanen, tapi dicatat di sini sebagai referensi debugging
kalau muncul lagi di sesi refactor berikutnya.

**Catatan lingkungan ketiga (truncation baris terakhir lewat tool Edit):**
ditemukan saat verifikasi final pasca-refactor (lihat catatan DI-violation
finance di bawah). Setiap file yang diedit lewat tool `Edit` pada sesi itu
ternyata kehilangan TEPAT baris terakhirnya di sisi yang dibaca oleh proses
build (`mcp__workspace__bash`/Vite), walaupun tool `Read` (sisi Windows)
menampilkan file itu lengkap dan benar. Ini berbeda dari bug NUL-byte di
atas — bukan padding, tapi baris terakhir (kurung tutup `}`, titik koma,
dll) benar-benar hilang dari sisi yang dipakai build. Efeknya nyata: build
`apps/finance` gagal dengan error esbuild "Unexpected end of file" pada
`KaryawanPage.jsx`. **Solusi yang sama seperti bug NUL-byte**: tulis ulang
file yang terdampak lewat heredoc bash (`cat > file << 'EOF' ... EOF`),
lalu verifikasi dua sisi — `Read` tool (sisi Windows, yang dilihat Denny)
DAN `npm run build` di bash (sisi yang benar-benar dieksekusi) — keduanya
harus menunjukkan konten yang identik dan lengkap. Kesimpulan praktis:
**setelah memakai tool `Edit` pada file yang akan langsung dibuild, jangan
percaya hasil `Read` saja — selalu konfirmasi juga lewat build/bash**,
karena dua sisi ini bisa divergen tanpa pesan error apa pun dari tool
`Edit` itu sendiri.

**Catatan migrasi `packages/shared` (selesai):** 6 fitur sudah dipindah ke
`features/{auth,products,stok,transfers,theme,toast}/` dengan pola
`api.js` (Supabase) → `queries.js`/`store.js` (TanStack Query / Zustand) →
`hooks.js` (satu-satunya permukaan yang diimpor UI). Seluruh ~60 file
consumer di 4 app sudah dipindah ke path baru (`@deera/shared/features/*/hooks`)
dan diverifikasi via grep tidak ada lagi referensi ke path lama. File lama
(`hooks/useAuth.js`, `useProducts.js`, `useStokByLocation.js`, `useTheme.js`,
`useTransfers.js`, `lib/auth.js`, `lib/toast.js` — 7 file) **sudah dihapus
fisik**, bukan sekadar di-stub.

**Catatan migrasi `apps/catalog` (selesai):** dipecah jadi 2 fitur —
`features/product-catalog/` (slide scroll, sold-out stamp, modal "Visit Us")
dan `features/product-detail/` (halaman `/code/:kode`). Perubahan paling
signifikan: pengambilan `sold_out_kodes` yang sebelumnya `supabase.rpc(...)`
langsung di komponen `Catalog.jsx` (melanggar Dependency Inversion) sekarang
lewat `features/product-catalog/{api,queries}.js` → `useSoldOutSet()` di
`hooks.js`. Modal "Visit Us" yang sebelumnya pakai `localStorage.getItem/setItem`
manual (key `visit_us_shown_date`) di komponen sekarang pakai
`useVisitUsModalStore` (Zustand + `persist`, key baru `deera-catalog-visit-us`
— key lama TIDAK dipakai ulang supaya tidak ada konflik parsing JSON vs
string mentah; dampaknya cuma modal akan tampil sekali lagi untuk
pengunjung lama setelah deploy, tidak ada risiko data hilang). Ikon WhatsApp
(`svg/WhatsApp.jsx`) dan `hooks/useHeroPreload.js` (catatan: hook ini TIDAK
pernah diimpor di mana pun sebelum refactor — dead code lama, dipindah
verbatim ke `shared/hooks/` tanpa diaktifkan, supaya tidak menambah
perilaku baru di luar scope refactor) pindah ke `apps/catalog/src/shared/`.
6 file lama (`pages/Catalog.jsx`, `pages/ProductDetail.jsx`,
`components/CatalogSlide.jsx`, `components/Modal.jsx`, `svg/WhatsApp.jsx`,
`hooks/useHeroPreload.js`) **sudah dihapus fisik**.

**Catatan migrasi `apps/admin` (selesai):** dipecah jadi 10 fitur —
`auth`, `produk` (CRUD produk: form, image/size/warna/hpp section, push
notification), `stok-opname` (draft autosave pindah ke Zustand `store.js` +
`persist`, key tetap `stok_opname_draft_v1`), `transfer` (draft autosave
Zustand, key tetap `transfer_draft_v1`, surat jalan, approve/reject),
`buku-potongan`, `history` (audit log, diff viewer), dan 4 sub-fitur produksi
— `produksi-bahan` (pembelian, pinjam, stok panel, surat jalan pinjam,
tagihan bulan), `produksi-hpp` (template HPP + kalkulator cepat),
`produksi-record` (batch produksi), `produksi-laporan` (laporan batch +
statistik), `produksi-sampel`. Total 52 file lama (semua isi
`components/admin`, `components/buku`, `components/history`,
`components/produksi/*`, `components/sampel`, `components/transfer`,
`hooks/useHistory.js`, `hooks/usePushNotification.js`, 11 file `pages/*.jsx`,
`components/AdminBottomNav.jsx`, `components/ProtectedRoute.jsx`,
`svg/WhatsApp.jsx`) **sudah dihapus fisik**, dipindah ke
`apps/admin/src/shared/components/` (AdminBottomNav, ProtectedRoute) atau ke
`features/<nama-fitur>/components/` masing-masing.

**Catatan migrasi `apps/pos` (selesai):** dipecah jadi 5 fitur — `kasir`
(cart, input pembeli, panel warna, price editor), `laporan` (14 komponen:
riwayat, keuangan, BEP, pasar, pembeli, stok, ringkasan, retur, edit/delete
modal, dropdown sub-tab), `pelanggan`, `riwayat`, dan `penjualan` (CRUD sale
— **secara sengaja TIDAK** dibungkus `useQuery`/`useMutation`, lihat §11.6
untuk alasan: butuh urutan write yang strict dan logika anti-resurrection
yang dianggap berisiko kalau diserahkan ke model invalidate-and-refetch
generik). Inti offline-sync (`lib/sync.js`, `lib/db.js`,
`hooks/useProducts.js`) **tidak disentuh sama sekali**, persis sesuai
keputusan di §11.6. Shell lintas-fitur (AppHeader, LoginScreen,
NotificationGate, PosBottomNav, Struk, StrukContent, SyncErrorModal) pindah
ke `shared/components/`; hook lintas-fitur (usePasarNotification,
usePushSubscription, useTransactionNotification, useTsplPrinter) pindah ke
`shared/hooks/`. ~38 file lama di apps/pos **sudah dihapus fisik** (proses
ini selesai lebih awal dari app lain dalam sesi refactor ini).

**Catatan migrasi `apps/finance` (selesai):** dipecah jadi 7 fitur — `auth`,
`dashboard` (StatCard, GajianRecentCard, SectionHeader), `karyawan`, `kas`,
`kasbon`, `pengaturan`, `pettycash`, dan yang terbesar `gajian` (18 komponen:
BuatPeriodeModal, 7 tab kalkulasi gaji per tim — Potong/Jahit/CMT/Finishing/
QC/Kreatif — plus tab Ringkasan, ShareModal untuk share PNG/WA, halaman list
+ detail). Total 13 file lama (`pages/*.jsx` ×9, `components/ProtectedRoute.jsx`,
`components/FinanceBottomNav.jsx`, `components/FinanceLayout.jsx`,
`lib/financeUtils.js`) **sudah dihapus fisik**, dipindah ke
`shared/components/` (ProtectedRoute, FinanceBottomNav, FinanceLayout) atau
diredistribusi ke `features/<fitur>/utils.js` masing-masing
(`financeUtils.js` lama dipecah per domain, bukan dipindah 1:1).

**Koreksi DI-violation di `apps/finance` (ditemukan & diperbaiki saat
verifikasi final):** 4 fitur (`karyawan`, `kas`, `pengaturan`, `pettycash`)
sempat meletakkan konstanta murni (`TIM_OPTIONS`/`timLabel`,
`KAS_KATEGORI_OPTIONS`, `TARIF_*`/`DEFAULT_FINANCE_CONFIG`/
`FINANCE_CONFIG_META`, `PETTYCASH_KATEGORI_OPTIONS`) di dalam `api.js`
masing-masing, lalu 6 komponen/halaman mengimpornya langsung dari `api.js`
— melanggar Dependency Inversion (komponen seharusnya tidak pernah tahu
soal `api.js`) dan juga bertentangan dengan komentar header `api.js` itu
sendiri. Diperbaiki dengan memindahkan semua konstanta ke `utils.js` baru
per fitur (pola yang sama seperti `gajian/utils.js`, yang sudah lebih dulu
melakukan ini dengan benar untuk `TABS`/`JAHIT_MARKS`/dll), lalu
memperbarui seluruh titik impor (`api.js` internal jika masih perlu
konstanta itu, `hooks.js`, barrel `index.js`, dan tiap komponen/halaman).
Setelah perbaikan, `npm run build:all` lolos bersih untuk keempat app.

### 11.8 Checklist manual per app

Diisi setelah build hijau untuk tiap app, sebelum lanjut ke app berikutnya.
Tes ini harus dijalankan oleh manusia (Denny) di browser nyata — Claude hanya
memverifikasi build & grep path lama.

#### `apps/catalog` (build hijau — siap dites manual)

- [ ] `/catalog` tampil semua produk yang punya foto, urut dari terbaru.
- [ ] Scroll-snap per produk masih jalan mulus (mobile & desktop).
- [ ] Badge "SOLD OUT" tetap muncul utk kode yang habis (cek dengan kode yang
      diketahui sold-out di `get_sold_out_kodes`).
- [ ] Klik slide produk → masuk ke `/code/{kode}` dan tampil detail (ukuran,
      foto, tombol WhatsApp) dengan benar.
- [ ] Tombol "VISIT US" di pojok kanan bawah membuka modal info pasar.
- [ ] Modal "Visit Us" otomatis muncul sekali di kunjungan pertama hari itu,
      lalu tidak muncul lagi otomatis di reload berikutnya hari yang sama
      (cek DevTools → Application → Local Storage → key
      `deera-catalog-visit-us` muncul setelah modal ditutup).
- [ ] Tombol scroll-to-top muncul setelah scroll > 50% tinggi layar, dan
      berfungsi membawa balik ke atas.
- [ ] Halaman 404 / path asing redirect balik ke `/catalog`.

#### `apps/admin` (build hijau — siap dites manual)

- [ ] Login dengan akun valid berhasil masuk ke `/`; akun salah menampilkan
      pesan error yang jelas; akses langsung ke route lain saat belum login
      redirect ke `/login`.
- [ ] Halaman utama (`/`) menampilkan daftar produk, search/filter masih
      jalan, dan tombol tambah produk membuka `ProductForm`.
- [ ] Tambah produk baru: isi semua section (info dasar, ukuran/variants,
      warna, foto/gambar, HPP) lalu simpan → produk baru muncul di list dan
      tercatat di `/history` dengan action `tambah`.
- [ ] Edit produk existing: ubah harga/ukuran/warna → simpan → perubahan
      tampil di list dan history mencatat `before`/`after` snapshot dengan
      benar (cek diff viewer di `/history`).
- [ ] Hapus produk → konfirmasi modal (bukan `window.confirm`) muncul → 
      produk hilang dari list → tercatat di history.
- [ ] `/stok-opname`: draft yang sedang diisi (belum disimpan) tetap ada
      setelah reload browser (cek localStorage key `stok_opname_draft_v1`
      masih terisi via Zustand persist) → simpan → stok di Supabase terupdate
      dan POS menerima update realtime.
- [ ] `/transfer`: buat transfer baru, draft form tersimpan otomatis saat
      diketik (key `transfer_draft_v1`), generate surat jalan (PDF/print),
      approve dari akun lain → stok berpindah lokasi dengan benar; reject
      transfer pending → status berubah jadi rejected dengan alasan.
- [ ] `/buku-potongan`: list & detail kartu produk per bahan tampil benar.
- [ ] `/produksi/bahan`: tambah pembelian bahan, tambah pinjam bahan
      (termasuk jatuh tempo & status lunas), surat jalan pinjam ter-generate,
      panel stok bahan (`v_stok_bahan`) menampilkan angka masuk/keluar/sisa
      yang benar.
- [ ] `/produksi/hpp`: buat/edit template HPP per produk, kalkulator cepat
      (slider `RangeWithMarks`) menghitung total HPP secara real-time sesuai
      `hpp_config`.
- [ ] `/produksi/record`: buat batch produksi baru → otomatis upsert produk +
      `expected_stok` sesuai size/warna yang diinput.
- [ ] `/produksi/laporan`: filter per bulan (`MonthPicker`) menampilkan batch
      & statistik yang sesuai; detail batch (`BatchDetail`) menampilkan
      breakdown bahan terpakai.
- [ ] `/produksi/sampel`: tambah/edit/hapus data sampel berjalan normal.
- [ ] Navigasi bawah (`AdminBottomNav`) — semua link aktif/highlight sesuai
      route saat ini, dark/light theme toggle tersimpan dan konsisten antar
      halaman.

#### `apps/pos` (build hijau — siap dites manual)

- [ ] Buka app saat offline (matikan koneksi) → produk & stok tetap tampil
      dari IndexedDB (Dexie); tidak ada layar putih/kosong.
- [ ] Login → setelah online, sync produk + stok berjalan otomatis (cek
      stok di kasir berubah sesuai data terbaru dari Supabase).
- [ ] Kasir: tambah produk ke cart, pilih warna/size lewat `WarnaPanel`,
      edit harga manual lewat `PriceEditor`, isi data pembeli lewat
      `BuyerInput`, checkout → stok lokal (Dexie) langsung berkurang
      (immediate), struk muncul dengan opsi print/download PNG/share
      WA/print Bluetooth (kalau printer TSPL terhubung).
- [ ] Checkout saat offline → transaksi tersimpan status `pending` di Dexie,
      lalu otomatis ter-flush ke Supabase begitu online kembali (cek
      `flushPendingSales`).
- [ ] `/laporan`: tab Transaksi/Riwayat menampilkan histori penjualan dengan
      filter benar; tab Keuangan & BEP menghitung angka yang konsisten
      dengan data riwayat (termasuk weekly target — cek tidak ada
      double-counting); tab Pasar & Pembeli menampilkan agregasi yang
      sesuai; tab Stok menampilkan sisa stok per lokasi.
- [ ] Edit transaksi lewat `EditSaleModal` dan hapus lewat `DeleteConfirm` →
      perubahan tersinkron ke server SEBELUM update lokal (urutan
      server-write-first harus tetap terjaga), dan transaksi yang sudah
      dihapus tidak "bangkit" lagi setelah sync ulang (`waitForPendingInsert`/
      `markSaleDeleted`).
- [ ] Retur lewat `ReturModal` → stok kembali bertambah dan tercatat sebagai
      transaksi tipe `retur`.
- [ ] `/pelanggan`: tambah/edit data pelanggan, pencarian/autofill nomor HP
      saat checkout di Kasir berfungsi.
- [ ] Lakukan Stok Opname dari Admin di tab/device lain → POS menerima
      update stok real-time (debounce ~600ms) tanpa perlu refresh manual.
- [ ] Refresh browser di tab `/laporan` atau `/pelanggan` → tetap di halaman
      yang sama (bukan reset ke Kasir), karena navigasi pakai React Router.
- [ ] Notifikasi push (kalau diizinkan browser) muncul untuk transaksi baru
      dan reminder lokasi pasar sesuai hari.

#### `apps/finance` (build hijau — siap dites manual)

- [ ] Login dengan akun finance valid berhasil masuk; akses tanpa login
      redirect ke halaman login.
- [ ] `/` (Dashboard): StatCard menampilkan ringkasan kas/gaji terbaru yang
      benar, `GajianRecentCard` menampilkan periode gajian terakhir dengan
      link ke detail yang tepat.
- [ ] `/karyawan`: tambah/edit/hapus data karyawan tersimpan dengan benar
      dan langsung tersedia di dropdown `KaryawanSelect` pada form gajian.
- [ ] `/gajian`: buat periode baru lewat `BuatPeriodeModal`, lalu di
      halaman detail isi tiap tab tim (Potong, Jahit, CMT, Finishing, QC,
      Kreatif) — `RangeSlider` dan form masing-masing menghitung nilai
      sesuai input; tab Ringkasan (`TabRingkasan`) menjumlahkan total semua
      tim dengan benar; bilah total (`TotalBar`) selalu sinkron saat ganti
      tab.
- [ ] Share ringkasan gajian per karyawan (`ShareModal`/`GajianShareCard`) →
      hasil PNG/teks WA terbentuk dengan data yang benar.
- [ ] `/kas`: catat transaksi kas baru dengan upload foto struk, daftar kas
      menampilkan saldo berjalan yang benar.
- [ ] `/kasbon`: catat kasbon karyawan baru, status lunas/belum lunas
      ter-update dengan benar.
- [ ] `/pettycash`: catat pengeluaran petty cash, saldo ter-update benar.
- [ ] `/pengaturan`: ubah setting yang tersedia (misal config terkait
      gajian) tersimpan dan dipakai kembali di halaman gajian.
- [ ] Navigasi bawah (`FinanceBottomNav`) — semua link/tab aktif sesuai
      halaman, layout (`FinanceLayout`) konsisten di semua halaman.
