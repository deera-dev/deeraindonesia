# CLAUDE.md — Panduan Kodebase Deera Indonesia

> File ini dibaca oleh AI assistant (Claude, Copilot, dll) untuk memahami
> struktur, konvensi, dan aturan kerja codebase ini. Baca seluruhnya sebelum
> membuat perubahan apa pun.

> **Update 2026-07:** Seluruh codebase (4 app + `packages/shared`) sudah
> selesai direstrukturisasi total ke **Zustand + TanStack Query + Vertical
> Slice Architecture**. Dokumen ini (§4, §7, §8, §10, §13, §14) sudah
> mencerminkan struktur baru tersebut. Untuk penjelasan arsitektur yang
> lebih dalam (alasan desain, data flow, status migrasi per app, dan
> pengecualian yang disengaja seperti inti offline-sync POS), baca
> `ARCHITECTURE.md` Bagian 11 — dokumen itu adalah sumber kebenaran untuk
> *mengapa* struktur ini dipilih; file ini (CLAUDE.md) adalah panduan
> praktis *bagaimana* menulis kode yang konsisten dengan struktur tersebut.

---

## 1. Gambaran Proyek

**Deera Indonesia** adalah sistem manajemen bisnis fashion (gamis/mukena) berbasis
web yang terdiri dari **4 aplikasi terpisah** dalam satu monorepo npm workspaces:

| App     | Path             | URL                | Deskripsi                            |
| ------- | ---------------- | ------------------ | ------------------------------------ |
| Catalog | `apps/catalog`  | catalog.deera.id   | Katalog publik, snap-scroll, no auth |
| Admin   | `apps/admin`    | admin.deera.id     | Panel manajemen internal             |
| POS     | `apps/pos`      | pos.deera.id       | Point of Sale, offline-first         |
| Finance | `apps/finance`  | finance.deera.id   | Keuangan & penggajian internal       |

Shared code berada di `packages/shared` dan di-import sebagai `@deera/shared`.

---

## 2. Tech Stack

```
Frontend   : React 19 + Vite + Tailwind CSS v3
Routing    : React Router v7 (BrowserRouter, Routes, Route, NavLink)
Data fetch : TanStack Query v5 (satu-satunya mekanisme fetch/cache dari Supabase)
State      : Zustand v5 (satu-satunya mekanisme state client: draft, filter, modal, tab)
Backend    : Supabase (PostgreSQL + Auth + Realtime + RLS)
Storage    : Cloudinary (gambar produk)
Offline    : Dexie (IndexedDB wrapper, khusus POS — TIDAK pakai TanStack Query, lihat §8)
Monorepo   : npm workspaces, Vertical Slice Architecture (lihat §4)
Deploy     : Vercel (per-app)
```

---

## 3. Perintah Development

```bash
# Jalankan satu app
npm run dev:catalog
npm run dev:admin
npm run dev:pos
npm run dev:finance

# Build satu app
npm run build:catalog
npm run build:admin
npm run build:pos

# Build Finance
npm run build:finance

# Build semua
npm run build:all
```

> Tidak ada test runner terpasang secara aktif (Vitest+RTL pernah dikonfigurasi di masa lalu). Tidak ada linter. Tidak ada TypeScript.

---

## 4. Struktur Monorepo

Codebase ini disusun dengan **Vertical Slice Architecture**: kode dikelompokkan
per fitur/use-case (`features/<nama-fitur>/`), bukan per layer teknis. Tidak
ada lagi folder datar `components/`, `hooks/`, `pages/` yang menampung semua
domain dalam satu app — setiap fitur membawa api/query/store/component/page-nya
sendiri dalam satu folder.

```
deeraindonesia/
├── apps/
│   ├── <app>/                      # catalog | admin | pos | finance
│   │   └── src/
│   │       ├── App.jsx             # Routes saja — import hanya dari ./features/*/index.js
│   │       ├── main.jsx            # Entry point: QueryClientProvider + render
│   │       ├── features/
│   │       │   └── <nama-fitur>/
│   │       │       ├── api.js          # Supabase mentah, pure async — "modul level-rendah"
│   │       │       ├── queries.js       # useQuery/useMutation (TanStack Query) membungkus api.js
│   │       │       ├── store.js          # (opsional) Zustand — HANYA jika ada state client asli
│   │       │       ├── hooks.js            # PUBLIC SURFACE — komponen WAJIB import dari sini
│   │       │       ├── utils.js             # (opsional) pure helpers: fmtRp, fmtDate, dll
│   │       │       ├── components/            # <Fitur>Page.jsx, <Fitur>Card.jsx, <Fitur>Form.jsx
│   │       │       └── index.js                # barrel: re-export hooks publik + komponen Page
│   │       └── shared/              # lintas-fitur milik app INI SENDIRI (bukan business logic)
│   │           └── components/        # AppBottomNav, ProtectedRoute, AppHeader, Layout
│   │
│   └── pos/src/                    # struktur sama + 2 folder TAMBAHAN (sengaja TIDAK dipindah):
│       ├── hooks/useProducts.js    # offline-first hook — INTI sync, lihat §8 & ARCHITECTURE.md §9-11
│       └── lib/{db.js,sync.js}     # Dexie schema + syncStok/syncProducts (Promise lock + transaction atomik)
│
├── packages/
│   └── shared/                     # @deera/shared — "shared kernel" lintas-app
│       ├── features/
│       │   ├── auth/        { api.js, hooks.js }              # signIn, signOut, useAuth
│       │   ├── products/    { api.js, queries.js, hooks.js }   # ganti module-level cache lama
│       │   ├── transfers/   { api.js, queries.js, hooks.js }
│       │   ├── stok/        { api.js, queries.js, hooks.js }   # useStokByLocation
│       │   ├── theme/       { store.js, hooks.js }              # Zustand, no server data
│       │   └── toast/       { store.js, hooks.js }               # Zustand pub-sub
│       ├── lib/
│       │   ├── supabase.js       # singleton client — satu-satunya titik akses Supabase mentah
│       │   ├── queryClient.js     # factory createAppQueryClient(), dipakai semua app main.jsx
│       │   ├── constants.js, marketDay.js, storeInfo.js, cloudinary.js, waFormat.js, bepUtils.js
│       └── components/             # BackToTop.jsx, ThemeToggle.jsx, ToastContainer.jsx
│
├── supabase/
└── supabase-migration-*.sql
```

**Contoh isi `features/` nyata per app** (lihat `ARCHITECTURE.md` §11.7 untuk
daftar dan catatan migrasi lengkap):

- `apps/admin/src/features/`: `auth`, `produk`, `stok-opname`, `transfer`,
  `buku-potongan`, `history`, `produksi-bahan`, `produksi-hpp`,
  `produksi-record`, `produksi-laporan`, `produksi-sampel`.
- `apps/pos/src/features/`: `kasir`, `laporan`, `pelanggan`, `riwayat`,
  `penjualan` (CRUD sale — **pengecualian**, tidak dibungkus
  `useQuery`/`useMutation`, lihat §8).
- `apps/finance/src/features/`: `auth`, `dashboard`, `karyawan`, `gajian`,
  `kas`, `kasbon`, `pettycash`, `pengaturan`.
- `apps/catalog/src/features/`: `product-catalog`, `product-detail`.

**Catatan fitur produksi-laporan** (`apps/admin/src/features/produksi-laporan/`):
- `useProduksiBatchesTotal()` — hook all-time stats (total batch, baju, modal).
- `fmtRpShort()` — format angka besar: ≥1M→"Rp X,X jt", ≥1B→"Rp X,X M".
- `hargaJualAvg` dihitung di ProduksiLaporanPage via `useProducts()` + `useMemo` (join batches × product variants).
- StatCard adaptif: `text-lg` jika value > 8 karakter, `text-2xl` jika pendek.

**Dependency Inversion — aturan yang WAJIB dipatuhi di semua fitur:**

```
Komponen UI (Page, Card, Form)
      │  HANYA boleh import dari
      ▼
features/<fitur>/hooks.js  (atau index.js)   ← abstraksi, public surface
      │  yang di dalamnya membungkus
      ▼
features/<fitur>/queries.js  +  store.js     ← implementasi (TanStack Query, Zustand)
      │  yang di dalamnya memanggil
      ▼
features/<fitur>/api.js                      ← Supabase mentah, modul level-rendah
```

Komponen **TIDAK PERNAH** import `supabase`, Zustand store, atau Dexie
langsung — selalu lewat `hooks.js` fitur tersebut. `api.js` boleh diimpor
oleh `api.js` fitur LAIN (komposisi lintas-fitur di layer yang sama, misal
`features/produk/api.js` memanggil `features/history/api.js` untuk audit
log) — itu bukan pelanggaran, karena keduanya sama-sama "modul level-rendah".
Yang dilarang adalah komponen (modul level-tinggi) memanggil `api.js`
(modul level-rendah) secara langsung, melompati `hooks.js`.

---

## 5. Routing

### apps/admin

Route base adalah `/` — **tidak ada prefix `/admin`**. Tiap halaman diimpor
dari barrel `index.js` fiturnya masing-masing (`./features/<fitur>`), bukan
dari folder `pages/` datar lagi.

```jsx
// apps/admin/src/App.jsx
import ProtectedRoute from "./shared/components/ProtectedRoute";
import { LoginPage } from "./features/auth";
import { AdminPage } from "./features/produk";
import { HistoryPage } from "./features/history";
import { TransferPage } from "./features/transfer";
import { StokOpnamePage } from "./features/stok-opname";
import { BukuPotonganPage } from "./features/buku-potongan";
import { ProduksiBahanPage } from "./features/produksi-bahan";
import { ProduksiRecordPage } from "./features/produksi-record";
import { ProduksiHPPPage } from "./features/produksi-hpp";
import { ProduksiLaporanPage } from "./features/produksi-laporan";
import { ProduksiSampelPage } from "./features/produksi-sampel";

<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route index element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
  <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
  <Route path="/transfer" element={<ProtectedRoute><TransferPage /></ProtectedRoute>} />
  <Route path="/stok-opname" element={<ProtectedRoute><StokOpnamePage /></ProtectedRoute>} />
  <Route path="/buku-potongan" element={<ProtectedRoute><BukuPotonganPage /></ProtectedRoute>} />

  {/* Modul Produksi */}
  <Route path="/produksi" element={<Navigate to="/produksi/bahan" replace />} />
  <Route path="/produksi/bahan" element={<ProtectedRoute><ProduksiBahanPage /></ProtectedRoute>} />
  <Route path="/produksi/record" element={<ProtectedRoute><ProduksiRecordPage /></ProtectedRoute>} />
  <Route path="/produksi/hpp" element={<ProtectedRoute><ProduksiHPPPage /></ProtectedRoute>} />
  <Route path="/produksi/laporan" element={<ProtectedRoute><ProduksiLaporanPage /></ProtectedRoute>} />
  <Route path="/produksi/sampel" element={<ProtectedRoute><ProduksiSampelPage /></ProtectedRoute>} />

  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

### apps/pos

Navigasi menggunakan **React Router** (bukan state) agar URL dipertahankan saat refresh.

```jsx
// apps/pos/src/App.jsx
import { KasirPage } from "./features/kasir";
import { LaporanPage } from "./features/laporan";
import { PelangganPage } from "./features/pelanggan";
import { RiwayatPage } from "./features/riwayat";

<Routes>
  <Route index element={<KasirPage location={location} onSaleCreated={...} />} />
  <Route path="/laporan" element={<LaporanPage key={laporanKey} location={location} />} />
  <Route path="/pelanggan" element={<PelangganPage />} />
  <Route path="/riwayat" element={<RiwayatPage />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

`PosBottomNav` (`./shared/components/PosBottomNav.jsx`) menggunakan `NavLink`
dengan `end` prop untuk pencocokan route yang tepat.

### apps/finance

Sama seperti admin — route base `/`, halaman dari barrel fitur. Satu hal
khusus: `/gajian/:id` adalah route dinamis (detail per periode gajian).

```jsx
// apps/finance/src/App.jsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route index element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
  <Route path="/karyawan" element={<ProtectedRoute><KaryawanPage /></ProtectedRoute>} />
  <Route path="/gajian" element={<ProtectedRoute><GajianListPage /></ProtectedRoute>} />
  <Route path="/gajian/:id" element={<ProtectedRoute><GajianDetailPage /></ProtectedRoute>} />
  <Route path="/kas" element={<ProtectedRoute><KasPage /></ProtectedRoute>} />
  <Route path="/kasbon" element={<ProtectedRoute><KasbonPage /></ProtectedRoute>} />
  <Route path="/pettycash" element={<ProtectedRoute><PettycashPage /></ProtectedRoute>} />
  <Route path="/pengaturan" element={<ProtectedRoute><PengaturanPage /></ProtectedRoute>} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

### apps/catalog

Publik, tidak ada `ProtectedRoute`. `/` redirect ke `/catalog`.

```jsx
// apps/catalog/src/App.jsx
<Routes>
  <Route path="/" element={<Navigate to="/catalog" replace />} />
  <Route path="/catalog" element={<CatalogPage />} />
  <Route path="/code/:kode" element={<ProductDetailPage />} />
  <Route path="*" element={<Navigate to="/catalog" replace />} />
</Routes>
```

---

## 6. Database Schema (Supabase)

### Tabel Utama

#### `products`

```sql
id          uuid PK
kode        text UNIQUE  -- format: "D-{angka}-{bahan}", e.g. "D-07-OSK"
nama        text
bahan       text
hpp         integer      -- harga pokok produk
image       text         -- Cloudinary URL (bisa null)
video       text         -- Cloudinary URL video produk (bisa null)
detail      jsonb        -- array URL foto detail
variants    jsonb        -- [{size, harga, ld, pb}]
warna       jsonb        -- array string warna, e.g. ["HITAM","MERAH"]
position    integer      -- urutan tampil di katalog
created_at  timestamptz
```

#### `stok_warna`

```sql
id          uuid PK
kode        text         -- FK ke products.kode
size        text         -- "Midi" | "Midi Jumbo" | "Gamis" | "Gamis Jumbo"
warna       text         -- nama warna atau "_" untuk produk tanpa warna
gudang      integer
cideng      integer
tegalgubug  integer
updated_at  timestamptz
UNIQUE(kode, size, warna)
```

> Stok disimpan per kode × size × warna × lokasi.
> Produk tanpa warna menggunakan warna = `"_"`.

#### `sales`

```sql
id               uuid PK
date             date
created_at       timestamptz
type             text   -- "sale" | "retur"
location         text   -- "gudang" | "cideng" | "tegalgubug"
buyer_name       text
buyer_hp         text
pelanggan_id     uuid   -- FK ke pelanggan (nullable)
items            jsonb  -- [{kode, nama, size, warna, harga, qty, hpp}]
discount         integer
total            integer
stok_adjustments jsonb  -- [{kode, size, warna, location, delta}]
created_by_email text
created_by_name  text
supabase_id      uuid   -- untuk reconcile offline→online
```

#### `transfers`

```sql
id              uuid PK
transfer_no     text         -- format: "SJ-YYYYMMDD-{rand3}"
from_location   text
to_location     text
items           jsonb        -- [{kode, size, warna, qty}]
notes           text
status          text         -- "pending" | "approved" | "rejected"
created_by      text
created_by_name text
approved_by     text
approved_at     timestamptz
rejected_by     text
rejected_at     timestamptz
created_at      timestamptz
```

#### `product_history`

```sql
id              uuid PK
action          text   -- "tambah"|"edit"|"hapus"|"transfer-buat"|"transfer-approve"|
                       --   "transfer-reject"|"stok-opname"|"batch-produksi"|
                       --   "hpp-simpan"|"hpp-hapus"|"bahan-beli"|"bahan-pinjam"|"bahan-hapus"
category        text   -- "produk" | "transfer" | "stok" | "produksi"
kode            text
nama            text
snapshot        jsonb  -- state SETELAH perubahan
before_snapshot jsonb  -- state SEBELUM perubahan
user_email      text
user_name       text
changed_at      timestamptz DEFAULT now()
```

#### `pelanggan`

```sql
id        uuid PK
nama      text
no_hp     text
alamat    text
updated_at timestamptz
```

#### `expected_stok`

```sql
id           uuid PK
kode         text
size         text
warna        text DEFAULT '_'
expected_qty integer DEFAULT 0
updated_at   timestamptz
UNIQUE(kode, size, warna)
```

#### `hpp_template`

```sql
id              uuid PK
kode_produk     text UNIQUE
total_hpp       integer
bahan_items     jsonb   -- [{nama_bahan, kode_bahan, satuan, qty_per_baju, harga_satuan}]
upah_jahit      integer
bordir          integer
biaya_studio    integer
kancing_qty     integer
config_snapshot jsonb
catatan         text
updated_at      timestamptz
updated_by      text
```

#### `hpp_config`

```sql
key         text PK
label       text
nilai       integer
keterangan  text
updated_at  timestamptz
updated_by  text
```

#### `produksi_batch`

```sql
id               uuid PK
batch_no         text
kode_produk      text
nama_produk      text
tanggal_produksi date
total_kain       integer
sizes            jsonb   -- [{size, warna: [{warna, qty}]}]
bahan_dipakai    jsonb   -- [{nama_bahan, kode_bahan, satuan, jumlah}]
hpp_snapshot     jsonb
hpp_per_item     integer
catatan          text
created_at       timestamptz
```

#### Tabel bahan

- `bahan_pembelian` — pembelian bahan dari supplier
- `bahan_pinjam` — pinjam bahan, ada jatuh tempo dan status lunas
- `v_stok_bahan` — VIEW: agregasi masuk/keluar/sisa per bahan

---

## 7. Konvensi Kode

### Arsitektur Fitur (Vertical Slice)

**Page component = lean orchestrator.** `<Fitur>Page.jsx` di
`features/<fitur>/components/` hanya merangkai hook (`useFooQuery`,
`useFooDraftStore`, dst) + handler + render. Logic fetching/caching ada di
`queries.js`, logic state client ada di `store.js`, logic Supabase mentah
ada di `api.js`. Page TIDAK PERNAH memanggil `supabase.from(...)` langsung.

```
features/foo/
  api.js          ← fetchFoo(), createFoo() — pure async, no React, no hooks
  queries.js       ← useFooQuery(), useCreateFooMutation() — bungkus api.js dgn TanStack Query
  store.js          ← useFooDraftStore — Zustand, HANYA kalau ada state client asli
  hooks.js            ← export gabungan queries.js + store.js — SATU-SATUNYA yang diimpor komponen
  utils.js             ← pure helpers (fmtRp, fmtDate, constants) — sama seperti pola lama
  components/
    FooPage.jsx          ← orchestrator: panggil hooks.js, render FooCard/FooForm
    FooCard.jsx           ← tampilan satu item
    FooForm.jsx            ← form input
  index.js                  ← barrel: export Page + hooks publik untuk App.jsx
```

Target maksimum per file: **~200 baris** (tetap berlaku, sekarang lebih
mudah dijaga karena fetching/state sudah keluar dari file Page).

### Dependency Inversion (WAJIB, lihat juga §4)

- Komponen (`components/*.jsx`) **HANYA** boleh `import` dari
  `features/<fitur-sendiri>/hooks.js` atau `index.js` fitur lain.
- Komponen **TIDAK PERNAH** `import` dari `api.js`, `store.js`, atau
  `queries.js` siapa pun (termasuk fiturnya sendiri) — selalu lewat
  `hooks.js`.
- `api.js` BOLEH `import` dari `api.js` fitur lain (komposisi lintas-fitur
  di layer yang sama — contoh nyata: `features/produk/api.js`,
  `features/stok-opname/api.js`, dan `features/produksi-*/api.js` semuanya
  `import { logHistory } from "../history/api"` untuk audit log).
- Fitur boleh TIDAK punya `api.js`/`queries.js` sendiri kalau seluruh
  datanya sudah disediakan fitur lain — contoh nyata:
  `apps/admin/src/features/transfer/hooks.js` tidak punya `api.js` sama
  sekali, isinya cuma membungkus Zustand draft store, sementara data CRUD
  transfer diimpor langsung dari
  `@deera/shared/features/transfers/hooks`. Ini tetap valid karena
  komponen tetap hanya menyentuh `hooks.js` (milik sendiri atau fitur lain)
  — tidak pernah melompat ke `api.js`/Supabase langsung.

### Styling

- Tailwind CSS utility classes. Tidak ada file CSS global selain `index.css`.
- **Skin theme system**: kelas `bg-skin-*`, `text-skin-*`, `border-skin-*`
  di-define di `tailwind.config.js` tiap app. Dark mode via class strategy.
- Warna brand utama: `#CAB170` (gold) dan `#A8925A` (gold dark).
- Font: `font-headline` (serif display) dan `font-editorial` (editorial sans).

### React, Zustand, TanStack Query

- Function components dengan hooks. Tidak ada class components.
- File `.jsx` untuk komponen, `.js` untuk `api`/`queries`/`store`/`hooks`/`utils`.
- `useState` LOKAL (tidak dibagi ke komponen lain, tidak persist) tetap
  `useState` biasa — Zustand bukan pengganti semua `useState`.
- State yang dibagi antar komponen dalam satu fitur, atau yang perlu
  persist (draft form, filter, tab aktif, modal visibility) → Zustand
  `store.js`, diekspos lewat `hooks.js`.
- Draft yang perlu tahan reload (`stok_opname_draft_v1`, `transfer_draft_v1`,
  dst) → Zustand `persist` middleware, BUKAN `localStorage.setItem/getItem`
  manual di komponen.
- Semua data dari Supabase → TanStack Query (`useQuery`/`useMutation` di
  `queries.js`). Tidak ada lagi `useEffect` + `supabase.from(...).select()`
  manual di komponen, dan tidak ada lagi cache module-level manual.
- Mutation WAJIB `invalidateQueries` ke query key terkait setelah sukses.
- **Pengecualian yang disengaja** (jangan "perbaiki" ini — lihat
  `ARCHITECTURE.md` §11.6 untuk alasan lengkap):
  - Inti offline-sync POS (`apps/pos/src/lib/sync.js`, `lib/db.js`,
    `hooks/useProducts.js`) — TIDAK pakai TanStack Query, tetap Dexie +
    Promise lock + transaction atomik seperti sebelumnya.
  - `apps/pos/src/features/penjualan/hooks.js` (CRUD sale) — sengaja TIDAK
    dibungkus `useQuery`/`useMutation` karena butuh urutan write yang
    strict (server-write-harus-sukses-sebelum-local-write) dan logika
    anti-resurrection yang berisiko kalau diserahkan ke model
    invalidate-and-refetch generik.

### Unit Test Mandate (WAJIB)

Setiap perubahan fitur **WAJIB** diikuti dengan update unit test yang terdampak.
Ini bukan opsional — test suite adalah bagian dari definisi "selesai".

- **Tambah fitur baru** → tambah test file baru (`api.test.js`,
  `hooks.test.js`, `utils.test.js`, `components/<Nama>.test.jsx`) di
  dalam folder fitur yang sama.
- **Edit logika** di `api.js`, `queries.js`, `hooks.js`, atau `utils.js`
  → update atau tambah test case yang mencerminkan perilaku baru.
- **Edit komponen** (`*.jsx`) → update test komponen terkait agar mock +
  assertion tetap akurat.
- **Hapus / rename export** → hapus atau rename test yang merujuk export
  tersebut.

Jalankan test suite sebelum dianggap selesai:

```bash
npm run test:admin    # atau test:pos / test:finance / test:catalog / test:shared
npm run test          # semua workspace sekaligus
```

Setiap workspace memiliki vitest config sendiri dengan environment `jsdom`
dan setup `test/setup.js`. Jangan jalankan `vitest run` tanpa `--config` —
hasilnya akan salah environment (node, bukan jsdom).

**Catatan penting saat menulis file test:**
- Selalu tulis file langsung ke path Linux mount
  (`/sessions/.../mnt/deeraindonesia/...`) via bash heredoc atau Python,
  bukan lewat Windows file tool — Windows tool rentan truncation saat
  sync ke Linux mount.
- Setelah menulis file, verifikasi dengan `cat -n <path>` bahwa file
  tidak terpotong di tengah.

### Import Path

```js
// Shared package — selalu lewat hooks.js fitur, bukan path lama
import { useAuth } from "@deera/shared/features/auth/hooks";
import { useProductsQuery } from "@deera/shared/features/products/hooks";
import { supabase } from "@deera/shared/lib/supabase"; // HANYA boleh dari api.js, tidak pernah dari komponen

// Lokal (dalam satu app) — barrel fitur lain
import { ProduksiRecordPage } from "../produksi-record"; // dari App.jsx
import { logHistory } from "../history/hooks";            // dari api.js fitur lain (lihat §7 Dependency Inversion)

// Dalam fitur sendiri
import { useTransferDraftStore } from "./store";          // hanya dari hooks.js, TIDAK dari komponen
```

### Naming

- Komponen: PascalCase (`ProductForm`, `BatchCard`, `TransferPage`)
- Fitur (folder): kebab-case (`produksi-bahan`, `stok-opname`, `product-detail`)
- File layer fitur: selalu nama tetap `api.js`, `queries.js`, `store.js`,
  `hooks.js`, `utils.js`, `index.js` — jangan diberi nama lain supaya
  konsisten dicari di semua fitur.
- Hooks/store export: camelCase dengan prefix `use` (`useProductsQuery`,
  `useTransferDraftStore`, `useCreateTransferMutation`)
- Utils: camelCase dengan suffix `Utils` kalau berdiri sendiri di luar
  fitur (`bepUtils.js`), atau langsung `utils.js` di dalam folder fitur.

---

## 8. Arsitektur Per App

### apps/catalog

- **Publik** — tidak butuh auth. Data diambil langsung dari Supabase anon.
- Full-screen snap-scroll: satu slide per produk, scroll vertikal.
- Dipecah jadi 2 fitur: `features/product-catalog/` (slide, sold-out
  stamp, modal "Visit Us") dan `features/product-detail/` (`/code/:kode`).
- Produk: `useProductsQuery()` dari `@deera/shared/features/products/hooks`
  (TanStack Query, ganti module-level cache lama). Sold-out:
  `useSoldOutSet()` di `features/product-catalog/hooks.js`.
- Modal "Visit Us": `useVisitUsModalStore` (Zustand + `persist`, key
  `deera-catalog-visit-us`) — bukan `localStorage` manual lagi.
- Gambar via Cloudinary dengan auto-format (WebP/AVIF).
- Filter produk: hanya produk dengan `image` yang tampil di katalog.
- Detail produk (`/code/:kode`): tampilkan video (tag `<video>`) jika ada, foto jika tidak.

### apps/admin

- **Auth required** — semua route protected via `ProtectedRoute`
  (`shared/components/ProtectedRoute.jsx`).
- SPA dengan React Router v7. Base route `/` (tanpa prefix `/admin`).
- 11 fitur: `auth`, `produk`, `stok-opname`, `transfer`, `buku-potongan`,
  `history`, `produksi-bahan`, `produksi-hpp`, `produksi-record`,
  `produksi-laporan`, `produksi-sampel`.
- Produk mendukung **upload video** via Cloudinary — field `video` di tabel `products`.
- WA share dari ProductCard (`shareProductViaWA` di `features/produk/utils.js`): coba video dulu, lalu foto, lalu teks-only. BUKAN dari ProductDetailModal.
- HPPShareModal diwire di ProduksiHPPPage via `onShare` prop pada HPPCard — tombol "↑" di setiap HPPCard.
- **Audit log**: setiap perubahan produk, transfer, stok, produksi dicatat
  ke `product_history` lewat `logHistory()` — diekspor dari
  `features/history/api.js` (dipanggil dari `api.js` fitur lain) dan dari
  `features/history/hooks.js` (dipanggil dari komponen, lihat §7).
- Draft autosave (stok opname, transfer) lewat Zustand `persist` di
  `store.js` masing-masing fitur, BUKAN `localStorage` manual.
- Tema gelap/terang via `@deera/shared/features/theme/hooks` (Zustand + persist).
- Navigasi bawah via `shared/components/AdminBottomNav.jsx` (NavLink-based).

### apps/pos

- **Offline-first** — IndexedDB via Dexie sebagai cache lokal. Bagian ini
  **TIDAK** ikut migrasi TanStack Query — lihat §7 "Pengecualian yang
  disengaja" dan `ARCHITECTURE.md` §9–11.6 untuk alasan lengkap.
- Auth required (Supabase Auth).
- 5 fitur: `kasir`, `laporan`, `pelanggan`, `riwayat`, `penjualan` (CRUD
  sale, juga termasuk pengecualian non-TanStack-Query).
- **Routing**: React Router v7, route `/`, `/laporan`, `/pelanggan`,
  `/riwayat`. `PosBottomNav` (`shared/components/`) pakai `NavLink` —
  refresh tidak reset ke tab default.
- Sync strategy (tidak berubah dari sebelum refactor):
  1. Load dari IndexedDB (cache) → tampil segera
  2. Sync dari Supabase → update IndexedDB → re-render
  3. Realtime listener (debounced 600ms) untuk perubahan `stok_warna`
  4. `visibilitychange` listener sebagai backup
- **KRITIS**: `syncStok()` di `lib/sync.js` menggunakan:
  - Shared Promise lock (cegah fetch ganda)
  - Dexie transaction atomik untuk clear+bulkPut (cegah race condition)
- Lokasi pasar otomatis berdasarkan hari (`marketDay.js`).
- Struk (`shared/components/Struk.jsx` + `StrukContent.jsx`): print via
  `window.print`, download PNG via `html-to-image` (toPng, pixelRatio 3),
  share via Web Share API / WA fallback, print Bluetooth via
  `shared/hooks/useTsplPrinter.js`.

### apps/finance

- **Auth required** — `ProtectedRoute` dari `shared/components/`.
- SPA dengan React Router v7. Base route `/`.
- 7 fitur: `auth`, `dashboard`, `karyawan`, `gajian` (terbesar — 18
  komponen: form per tim Potong/Jahit/CMT/Finishing/QC/Kreatif + tab
  Ringkasan + share PNG/WA), `kas`, `kasbon`, `pettycash`, `pengaturan`.
- `/gajian/:id` adalah route dinamis untuk halaman detail satu periode
  gajian (`GajianDetailPage`).
- Navigasi bawah via `shared/components/FinanceBottomNav.jsx`, layout
  konsisten lewat `shared/components/FinanceLayout.jsx`.

---

## 9. Business Logic Penting

### Lokasi Pasar (marketDay.js)

```
Senin (1), Kamis (4) → Cideng
Jumat (5)            → Tegalgubug
Hari lain            → Gudang
```

### Format Kode Produk

```
D-{nomor}-{kode_bahan}
Contoh: D-07-OSK, D-82-SFN
```

### Ukuran Produk (SIZE_PRESETS)

```
Midi        (LD 110, PB 130)
Midi Jumbo  (LD 120, PB 130)
Gamis       (LD 110, PB 140)
Gamis Jumbo (LD 120, PB 140)
```

### Workflow Transfer Stok

```
1. Buat transfer (admin) → status: pending → stok BELUM berubah
2. Generate surat jalan (PDF/print)
3. Approve (admin lain) → stok berpindah atomik → status: approved
4. ATAU Reject → status: rejected, dengan alasan
Edit/hapus hanya untuk status: pending.
```

### Workflow Produksi

```
1. Buat HPP Template di tab "Template HPP" (ProduksiHPP)
2. Buat batch produksi di ProduksiRecord → upsert produk + expected_stok
3. Stok aktual diisi via Stok Opname setelah barang jadi
4. Harga jual diisi via Edit Produk di halaman Admin
```

### Kalkulasi HPP

- Konfigurasi default di tabel `hpp_config` (harga kancing satuan, upah jahit default, dll)
- Template per produk di `hpp_template`, tersimpan dengan snapshot config saat dibuat
- Qty bahan dihitung via konversi satuan: `calcQtyPerBaju()` di `hppUtils.js`
- Satuan ukur bisa berbeda dari satuan beli (cm vs meter, dsb)

### Stok Opname

- Admin menginput nilai stok aktual per size × warna × lokasi.
- Simpan ke `stok_warna` via upsert.
- Setelah simpan, Supabase Realtime mengirim notifikasi ke POS.
- POS menerima event → debounce 600ms → sync stok → update UI.

---

## 10. File-File Kritis

| File                                                              | Keterangan                                              |
| ------------------------------------------------------------------ | -------------------------------------------------------- |
| `apps/pos/src/lib/sync.js`                                        | syncStok() dengan Dexie transaction + Promise lock — **TIDAK disentuh refactor** |
| `apps/pos/src/hooks/useProducts.js`                               | Offline-first hook, debounce realtime — **TIDAK disentuh refactor** |
| `apps/pos/src/lib/db.js`                                          | Dexie schema, stok_warna key: `[kode+size+warna]` — **TIDAK disentuh refactor** |
| `apps/pos/src/features/penjualan/hooks.js`                        | CRUD sale — **sengaja TIDAK** pakai useQuery/useMutation, lihat §7 |
| `apps/pos/src/shared/components/StrukContent.jsx`                 | Konten visual struk (di-capture ke PNG)                 |
| `packages/shared/features/transfers/{api,queries,hooks}.js`        | Transfer CRUD (TanStack Query) — dipakai langsung oleh `apps/admin/src/features/transfer/` |
| `apps/admin/src/features/history/api.js`                            | logHistory() — diimpor `api.js` fitur lain utk audit log  |
| `apps/admin/src/features/history/hooks.js`                          | logHistory() + useHistory() + useDeleteHistory() — public surface utk komponen |
| `apps/admin/src/features/history/utils.js`                          | ACTION_META, getMeta, groupByDate                         |
| `apps/admin/src/features/produksi-hpp/utils.js`                     | calcQtyPerBaju, fetchConfig, calcTotal                     |
| `packages/shared/lib/constants.js`                                 | SIZE_PRESETS, buildKode, formatHarga                       |
| `packages/shared/lib/marketDay.js`                                  | Logika lokasi pasar per hari                                |
| `packages/shared/lib/storeInfo.js`                                  | Info toko (nama, WA, rekening)                               |
| `packages/shared/lib/queryClient.js`                                | Factory `createAppQueryClient()` — dipakai semua `main.jsx`  |
| `apps/finance/src/features/gajian/components/*.jsx`                 | 6+ form tim gajian + tab Ringkasan + share ringkasan PNG/WA   |
| `apps/finance/src/features/kas/api.js`                              | Pencatatan kas + upload foto struk                             |
| `apps/admin/src/features/transfer/components/TransferForm.jsx`      | Seri penuh, accordion ringkasan; draft autosave via `../store.js` |
| `apps/admin/src/features/transfer/store.js`                         | Zustand draft transfer, `persist` key `transfer_draft_v1`        |
| `apps/admin/src/features/stok-opname/store.js`                      | Zustand draft stok opname, `persist` key `stok_opname_draft_v1`    |
| `apps/admin/src/features/produksi-hpp/components/ProduksiHPPPage.jsx` | Template HPP + Kalkulator cepat (slider)                          |
| `apps/admin/src/features/produksi-hpp/components/HPPShareModal.jsx`    | Share HPP sebagai PNG — di-trigger dari HPPCard (onShare)           |
| `apps/admin/src/features/produksi-hpp/components/HPPShareCard.jsx`     | Card HPP untuk di-capture ke PNG (aggregate bahan, no subtotal)     |
| `apps/admin/src/features/produk/utils.js`                               | `shareProductViaWA(product)` — coba video dulu, lalu foto            |
| `apps/admin/src/features/produksi-laporan/utils.js`                     | `fmtRpShort()`, `calcRingkasan()`, `calcBahanUsage()`                |
| `apps/admin/src/features/produksi-laporan/components/StatCard.jsx`      | StatCard adaptif: teks lebih kecil jika value > 8 karakter           |

---

## 11. Environment Variables

Setiap app membutuhkan `.env` dengan:

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Cloudinary (admin & pos saja, untuk upload)
VITE_CLOUDINARY_CLOUD_NAME=deera-cloudname
VITE_CLOUDINARY_UPLOAD_PRESET=deera-preset
```

---

## 12. Supabase Realtime Setup

Agar POS menerima update stok secara realtime, pastikan SQL ini sudah dijalankan:

```sql
ALTER TABLE stok_warna REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE stok_warna;
```

---

## 13. Hal yang JANGAN Dilakukan

- **Jangan** tambah validasi `mainImage` wajib di ProductForm — foto bersifat opsional.
- **Jangan** gunakan `window.confirm` — buat modal konfirmasi sendiri (PWA context).
- **Jangan** panggil `db.stok_warna.clear()` dan `db.stok_warna.bulkPut()` sebagai dua await terpisah — selalu bungkus dalam `db.transaction("rw", ...)`.
- **Jangan** tambah stok langsung di ProductForm — gunakan halaman Stok Opname.
- **Jangan** gunakan CSS grid atau `<table>` untuk konten yang perlu responsif di mobile — gunakan flex wrap.
- **Jangan** simpan state ke `localStorage` MANUAL (`setItem`/`getItem` langsung) di komponen React — kalau perlu persist, gunakan Zustand `store.js` + middleware `persist` fitur tersebut (lihat §7). `useState` murni tanpa persist tetap boleh.
- **Jangan** gunakan prefix route `/admin` di apps/admin — base route sudah `/`.
- **Jangan** gunakan state tab di POS — navigasi halaman via React Router (`/`, `/laporan`, `/pelanggan`, `/riwayat`).
- **Jangan** taruh logika bisnis (fetch Supabase, kalkulasi) di komponen Page — fetch ada di `api.js`/`queries.js`, kalkulasi murni di `utils.js` fitur tersebut.
- **Jangan** import `api.js`, `store.js`, atau `queries.js` siapa pun langsung dari komponen — komponen HANYA boleh import dari `hooks.js` atau `index.js` fitur (Dependency Inversion, lihat §4 & §7).
- **Jangan** bungkus inti offline-sync POS (`lib/sync.js`, `lib/db.js`, `hooks/useProducts.js`) atau `features/penjualan` dengan TanStack Query — ini pengecualian yang disengaja, lihat §7 dan `ARCHITECTURE.md` §11.6.
- **Jangan** gunakan `toISOString()` untuk menyimpan/membandingkan tanggal lokal — gunakan `localDateStr()` (getFullYear/getMonth/getDate).
- **Jangan** simpan `const` di antara import — deklarasikan setelah semua import selesai.
- **Jangan** pre-populate field tambahan manual gajian dari `manual_overrides` — init dengan `useState("")`.
- **Jangan** share produk ke WA dari ProductDetailModal atau ProductShareModal — share dilakukan dari ProductCard (ikon WA) via `shareProductViaWA` di `features/produk/utils.js`.
- **Jangan** hitung subtotal bahan per-item di HPPShareCard — gunakan pendekatan agregat: `biayaBahan = total_hpp − sum(non_bahan_costs)` untuk menghindari inflasi dari motif qty.
- **Jangan** simpan file test (.test.jsx/.test.js) via Windows file tool (Edit/Write) ke path mount — tulis via bash heredoc atau Python ke path Linux `/sessions/.../mnt/deeraindonesia/...`, lalu verifikasi dengan `cat -n`.

---

## 14. Pola yang Harus Diikuti

### Menambah Fitur Baru (Vertical Slice)

```bash
# 1. Buat folder fitur
mkdir -p apps/<app>/src/features/<nama-fitur>/components

# 2. api.js — Supabase mentah, pure async, TIDAK ada import React
# 3. queries.js — bungkus api.js dengan useQuery/useMutation + queryKeys
# 4. store.js  — (opsional) Zustand, HANYA kalau ada state client asli
# 5. hooks.js  — re-export dari queries.js (+ store.js) — public surface
# 6. utils.js  — (opsional) pure helpers
# 7. components/<Fitur>Page.jsx — orchestrator, hanya panggil hooks.js
# 8. index.js  — barrel: export { default as <Fitur>Page } + hooks publik

# 9. Daftarkan route di App.jsx, import HANYA dari index.js fitur:
#    import { <Fitur>Page } from "./features/<nama-fitur>";

# 10. Tambahkan link di shared/components/<App>BottomNav.jsx jika perlu
```

Lihat fitur existing yang representatif sebagai referensi konkret:
`apps/admin/src/features/produksi-bahan/` (fitur lengkap dengan api/queries/
hooks/utils/banyak komponen) atau `apps/admin/src/features/transfer/`
(fitur yang sengaja tanpa `api.js` sendiri karena delegasi ke
`@deera/shared/features/transfers`, lihat §7).

### Menggunakan TanStack Query di `queries.js`

```js
// features/foo/queries.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFoo, createFoo } from "./api";

export const fooKeys = { all: ["foo"], list: (filter) => ["foo", filter] };

export function useFooQuery(filter) {
  return useQuery({ queryKey: fooKeys.list(filter), queryFn: () => fetchFoo(filter) });
}

export function useCreateFooMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFoo,
    onSuccess: () => qc.invalidateQueries({ queryKey: fooKeys.all }),
  });
}
```

### Menggunakan Zustand untuk Draft Autosave di `store.js`

```js
// features/foo/store.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useFooDraftStore = create(
  persist(
    (set) => ({
      draft: {},
      save: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      clear: () => set({ draft: {} }),
    }),
    { name: "foo_draft_v1" } // key localStorage — pertahankan nama lama kalau migrasi dari draft existing
  )
);
```

Komponen TIDAK PERNAH `import { useFooDraftStore } from "./store"` langsung
— wajib lewat `hooks.js` (lihat contoh nyata
`apps/admin/src/features/transfer/hooks.js` dan
`apps/admin/src/features/stok-opname/store.js`).

### Menambah Audit Log

`logHistory` dipanggil dari dua tempat berbeda tergantung pemanggilnya:

```js
// Dari api.js fitur LAIN (layer yang sama — komposisi lintas-fitur):
import { logHistory } from "../history/api";

// Dari KOMPONEN (lewat public surface, Dependency Inversion):
import { logHistory } from "../../history/hooks"; // atau "../../history" (index.js)

await logHistory({
  action: "nama-aksi", // string identifier (lihat ACTION_META di features/history/utils.js)
  category: "produk", // "produk" | "transfer" | "stok" | "produksi"
  kode: produk.kode,
  nama: produk.nama,
  snapshot: payloadSetelah, // state SETELAH
  before: payloadSebelum, // state SEBELUM (opsional)
});
```

### Komponen Modal

Semua modal menggunakan **pola full-screen di mobile** (bottom-sheet, tapi mengisi penuh layar):

```jsx
{/* Outer overlay */}
<div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
  <div className="absolute inset-0" onClick={onClose} />
  {/* Container: h-[100dvh] di mobile, max-h di desktop */}
  <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
    {/* Header — flex-shrink-0 agar tidak ikut scroll */}
    <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
      <h2>...</h2>
      <button onClick={onClose}>×</button>
    </div>
    {/* Body — scrollable */}
    <div className="flex-1 overflow-y-auto p-4">{/* content */}</div>
    {/* Footer actions — flex-shrink-0 */}
    <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">...</div>
  </div>
</div>
```

Aturan:
- **Jangan** gunakan `max-h-[X]` tanpa `h-[100dvh] md:h-auto` di mobile — modal akan terpotong.
- Header & footer: `flex-shrink-0` (tidak ikut scroll).
- Body: `flex-1 overflow-y-auto`.
- Border mobile: `border-t-2` (atas saja); desktop: `md:border-2` (semua sisi).

### BackToTop di Halaman dengan Scroll Internal

```jsx
// Jika scroll di element (bukan window):
const scrollRef = useRef(null);
<div ref={scrollRef} className="overflow-y-auto">...</div>
<BackToTop scrollEl={scrollRef} />

// Jika scroll di window:
<BackToTop />
```

### Menambah Halaman Baru di Admin

```jsx
// 1. Buat fitur baru (lihat "Menambah Fitur Baru" di atas):
//    apps/admin/src/features/nama-halaman/{api,queries,hooks,utils}.js
//    + components/NamaHalamanPage.jsx + index.js

// 2. Daftarkan route di App.jsx, import dari barrel fitur
//    (tanpa prefix /admin):
import { NamaHalamanPage } from "./features/nama-halaman";

<Route
  path="/nama-halaman"
  element={
    <ProtectedRoute>
      <NamaHalamanPage />
    </ProtectedRoute>
  }
/>

// 3. Tambahkan link di apps/admin/src/shared/components/AdminBottomNav.jsx jika perlu
```

### Menambah Sub-Komponen di Fitur Produksi

```
apps/admin/src/features/produksi-<modul>/
  api.js                 ← fetch/insert/update/delete Supabase utk modul ini
  queries.js               ← useQuery/useMutation
  hooks.js                   ← public surface
  utils.js                     ← fmtRp, fmtDate, inputCls, labelCls, dll
  components/
    <Modul>Page.jsx               ← orchestrator
    <Modul>Card.jsx                ← tampilan satu item (expandable)
    <Modul>Form.jsx                 ← form add/edit
  index.js
```
