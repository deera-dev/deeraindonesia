# CLAUDE.md — Panduan Kodebase Deera Indonesia

> File ini dibaca oleh AI assistant (Claude, Copilot, dll) untuk memahami
> struktur, konvensi, dan aturan kerja codebase ini. Baca seluruhnya sebelum
> membuat perubahan apa pun.

---

## 1. Gambaran Proyek

**Deera Indonesia** adalah sistem manajemen bisnis fashion (gamis/mukena) berbasis
web yang terdiri dari **3 aplikasi terpisah** dalam satu monorepo npm workspaces:

| App | Path | URL | Deskripsi |
|-----|------|-----|-----------|
| Catalog | `apps/catalog` | catalog.deera.id | Katalog publik, snap-scroll, no auth |
| Admin | `apps/admin` | admin.deera.id | Panel manajemen internal |
| POS | `apps/pos` | pos.deera.id | Point of Sale, offline-first |

Shared code berada di `packages/shared` dan di-import sebagai `@deera/shared`.

---

## 2. Tech Stack

```
Frontend   : React 19 + Vite + Tailwind CSS v3
Routing    : React Router v7 (BrowserRouter, Routes, Route, NavLink)
Backend    : Supabase (PostgreSQL + Auth + Realtime + RLS)
Storage    : Cloudinary (gambar produk)
Offline    : Dexie (IndexedDB wrapper, khusus POS)
Monorepo   : npm workspaces
Deploy     : Vercel (per-app)
```

---

## 3. Perintah Development

```bash
# Jalankan satu app
npm run dev:catalog
npm run dev:admin
npm run dev:pos

# Build satu app
npm run build:catalog
npm run build:admin
npm run build:pos

# Build semua
npm run build:all
```

> Tidak ada test runner. Tidak ada linter yang dikonfigurasi. Tidak ada TypeScript.

---

## 4. Struktur Monorepo

```
deeraindonesia/
├── apps/
│   ├── admin/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── admin/           # ProductForm, SizeSection, ImageSection,
│   │       │   │                    #   WarnaSection, HppSection
│   │       │   ├── buku/            # ProductBukuCard, bukuUtils.js
│   │       │   ├── history/         # HistoryDetailModal, HistoryDiffs, historyUtils.js
│   │       │   └── produksi/
│   │       │       ├── bahan/       # BahanForm, BahanCard, BahanPickerModal,
│   │       │       │                #   PembelianBulkForm, PinjamBulkForm,
│   │       │       │                #   StokPanel, SuratJalanPinjamModal, bahanUtils.js
│   │       │       ├── hpp/         # HPPForm, HPPCard, BahanPickerModal,
│   │       │       │                #   RangeWithMarks, hppUtils.js
│   │       │       └── record/      # BatchForm, BatchCard, recordUtils.js
│   │       ├── hooks/               # useHistory.js
│   │       └── pages/               # Satu file per halaman (lean orchestrators)
│   ├── catalog/
│   └── pos/
│       └── src/
│           ├── components/
│           │   ├── Struk.jsx        # Modal struk (aksi: print, download, share, BLE)
│           │   ├── StrukContent.jsx # Konten visual struk (di-render ke PNG)
│           │   └── PosBottomNav.jsx # NavLink-based bottom nav
│           └── hooks/
│               └── useTsplPrinter.js
├── packages/
│   └── shared/
│       ├── components/  # BackToTop, ThemeToggle
│       ├── hooks/       # useAuth, useProducts, useTransfers, useTheme, dll
│       └── lib/         # supabase.js, cloudinary.js, constants.js,
│                        #   marketDay.js, storeInfo.js, toast.js
├── supabase/
└── supabase-migration-*.sql
```

---

## 5. Routing

### apps/admin
Route base adalah `/` — **tidak ada prefix `/admin`**.

```jsx
// apps/admin/src/App.jsx
<Routes>
  <Route path="/login"            element={<Login />} />
  <Route index                    element={<ProtectedRoute><Admin /></ProtectedRoute>} />
  <Route path="/history"          element={<ProtectedRoute><History /></ProtectedRoute>} />
  <Route path="/transfer"         element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
  <Route path="/stok-opname"      element={<ProtectedRoute><StokOpname /></ProtectedRoute>} />
  <Route path="/buku-potongan"    element={<ProtectedRoute><BukuPotongan /></ProtectedRoute>} />
  <Route path="/produksi/bahan"   element={<ProtectedRoute><ProduksiBahan /></ProtectedRoute>} />
  <Route path="/produksi/record"  element={<ProtectedRoute><ProduksiRecord /></ProtectedRoute>} />
  <Route path="/produksi/hpp"     element={<ProtectedRoute><ProduksiHPP /></ProtectedRoute>} />
  <Route path="/produksi/laporan" element={<ProtectedRoute><ProduksiLaporan /></ProtectedRoute>} />
  <Route path="*"                 element={<Navigate to="/" replace />} />
</Routes>
```

### apps/pos
Navigasi menggunakan **React Router** (bukan state) agar URL dipertahankan saat refresh.

```jsx
// apps/pos/src/App.jsx
<Routes>
  <Route index        element={<Kasir ... />} />
  <Route path="/laporan"   element={<Laporan key={laporanKey} ... />} />
  <Route path="/pelanggan" element={<Pelanggan />} />
  <Route path="*"          element={<Navigate to="/" replace />} />
</Routes>
```

`PosBottomNav` menggunakan `NavLink` dengan `end` prop untuk pencocokan route yang tepat.

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

### Arsitektur Komponen
**Halaman = lean orchestrator.** Halaman hanya mengelola state & data fetching.
Sub-komponen UI diekstrak ke folder `components/[domain]/`.

```
pages/Foo.jsx               ← state, data fetch, handlers, modal state
components/foo/FooCard.jsx  ← tampilan satu item
components/foo/FooForm.jsx  ← form input
components/foo/fooUtils.js  ← pure helpers (fmtRp, fmtDate, constants)
```

Target maksimum per file: **~200 baris**.

### Styling
- Tailwind CSS utility classes. Tidak ada file CSS global selain `index.css`.
- **Skin theme system**: kelas `bg-skin-*`, `text-skin-*`, `border-skin-*`
  di-define di `tailwind.config.js` tiap app. Dark mode via class strategy.
- Warna brand utama: `#CAB170` (gold) dan `#A8925A` (gold dark).
- Font: `font-headline` (serif display) dan `font-editorial` (editorial sans).

### React
- Function components dengan hooks. Tidak ada class components.
- File `.jsx` untuk komponen, `.js` untuk hooks dan utilities.
- State lokal dengan `useState`, side effects dengan `useEffect`.
- Tidak ada global state manager — state di-lift ke parent atau hook.
- Custom hooks di `hooks/`, pure utils di `*Utils.js` dalam folder komponen.

### Import Path
```js
// Shared package
import { useAuth } from "@deera/shared/hooks/useAuth";
import { supabase } from "@deera/shared/lib/supabase";

// Local (dalam satu app)
import BatchCard from "../components/produksi/record/BatchCard";
import { fmtRp }  from "../components/produksi/record/recordUtils";
```

### Naming
- Komponen: PascalCase (`ProductForm`, `BatchCard`)
- Hooks: camelCase dengan prefix `use` (`useProducts`, `useHistory`)
- Utils: camelCase dengan suffix `Utils` (`hppUtils.js`, `bahanUtils.js`)
- Files: camelCase untuk hooks/lib, PascalCase untuk komponen

---

## 8. Arsitektur Per App

### apps/catalog
- **Publik** — tidak butuh auth. Data diambil langsung dari Supabase anon.
- Full-screen snap-scroll: satu slide per produk, scroll vertikal.
- `useProducts` dari `@deera/shared` dengan module-level cache.
- Gambar via Cloudinary dengan auto-format (WebP/AVIF).
- Filter produk: hanya produk dengan `image` yang tampil di katalog.

### apps/admin
- **Auth required** — semua route protected via `ProtectedRoute`.
- SPA dengan React Router v7. Base route `/` (tanpa prefix `/admin`).
- Halaman utama: Admin, StokOpname, Transfer, BukuPotongan, History, Login,
  ProduksiBahan, ProduksiRecord, ProduksiHPP, ProduksiLaporan.
- **Audit log**: setiap perubahan produk, transfer, stok, produksi dicatat ke `product_history`.
- Tema gelap/terang via `useTheme` hook (localStorage).
- Navigasi bawah via `AdminBottomNav` (NavLink-based).

### apps/pos
- **Offline-first** — IndexedDB via Dexie sebagai cache lokal.
- Auth required (Supabase Auth).
- **Routing**: React Router v7, route `/`, `/laporan`, `/pelanggan`.
  PosBottomNav menggunakan `NavLink` — refresh tidak reset ke tab default.
- Sync strategy:
  1. Load dari IndexedDB (cache) → tampil segera
  2. Sync dari Supabase → update IndexedDB → re-render
  3. Realtime listener (debounced 600ms) untuk perubahan `stok_warna`
  4. `visibilitychange` listener sebagai backup
- **KRITIS**: `syncStok()` di `lib/sync.js` menggunakan:
  - Shared Promise lock (cegah fetch ganda)
  - Dexie transaction atomik untuk clear+bulkPut (cegah race condition)
- Lokasi pasar otomatis berdasarkan hari (`marketDay.js`).
- Struk: print via `window.print`, download PNG via `html-to-image` (toPng, pixelRatio 3),
  share via Web Share API / WA fallback, print Bluetooth via `useTsplPrinter`.

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

| File | Keterangan |
|------|-----------|
| `apps/pos/src/lib/sync.js` | syncStok() dengan Dexie transaction + Promise lock |
| `apps/pos/src/hooks/useProducts.js` | Offline-first hook, debounce realtime |
| `apps/pos/src/lib/db.js` | Dexie schema, stok_warna key: `[kode+size+warna]` |
| `apps/pos/src/components/StrukContent.jsx` | Konten visual struk (di-capture ke PNG) |
| `packages/shared/hooks/useTransfers.js` | Transfer CRUD + audit log |
| `apps/admin/src/hooks/useHistory.js` | logHistory() + deleteHistory() |
| `apps/admin/src/components/history/historyUtils.js` | ACTION_META, getMeta, groupByDate |
| `apps/admin/src/components/produksi/hpp/hppUtils.js` | calcQtyPerBaju, fetchConfig, calcTotal |
| `packages/shared/lib/constants.js` | SIZE_PRESETS, buildKode, formatHarga |
| `packages/shared/lib/marketDay.js` | Logika lokasi pasar per hari |
| `packages/shared/lib/storeInfo.js` | Info toko (nama, WA, rekening) |

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
- **Jangan** simpan state ke localStorage di komponen React — semua state di useState/Dexie.
- **Jangan** gunakan prefix route `/admin` di apps/admin — base route sudah `/`.
- **Jangan** gunakan state tab di POS — navigasi halaman via React Router (`/`, `/laporan`, `/pelanggan`).
- **Jangan** taruh logika bisnis di halaman (page file) — ekstrak ke utils atau komponen tersendiri.

---

## 14. Pola yang Harus Diikuti

### Menambah Audit Log
```js
import { logHistory } from "../hooks/useHistory";

await logHistory({
  action: "nama-aksi",        // string identifier (lihat ACTION_META di historyUtils.js)
  category: "produk",         // "produk" | "transfer" | "stok" | "produksi"
  kode: produk.kode,
  nama: produk.nama,
  snapshot: payloadSetelah,   // state SETELAH
  before: payloadSebelum,     // state SEBELUM (opsional)
});
```

### Komponen Modal
Semua modal menggunakan pola:
```jsx
<div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
  <div className="absolute inset-0" onClick={onClose} />
  <div className="relative bg-skin-card w-full max-w-lg ...">
    {/* content */}
  </div>
</div>
```

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
// 1. Buat page file di apps/admin/src/pages/NamaHalaman.jsx
//    — hanya state, data fetch, handler, render tipis

// 2. Ekstrak sub-komponen ke apps/admin/src/components/[domain]/

// 3. Daftarkan route di App.jsx (tanpa prefix /admin):
<Route path="/nama-halaman" element={<ProtectedRoute><NamaHalaman /></ProtectedRoute>} />

// 4. Tambahkan link di AdminBottomNav jika perlu
```

### Menambah Sub-Komponen Produksi
```
components/produksi/
  [modul]/
    [Modul]Card.jsx     ← tampilan satu item (expandable)
    [Modul]Form.jsx     ← form add/edit
    [modul]Utils.js     ← fmtRp, fmtDate, inputCls, labelCls, dll
```
