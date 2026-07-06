# Deera Indonesia — Monorepo

Sistem manajemen bisnis fashion (gamis/mukena) Deera Indonesia — **4 aplikasi** dalam satu monorepo npm workspaces.

| App         | Path             | URL                  | Deskripsi                                    |
| ----------- | ---------------- | -------------------- | -------------------------------------------- |
| **Catalog** | `apps/catalog`   | catalog.deera.id     | Katalog publik, snap-scroll, tanpa login     |
| **Admin**   | `apps/admin`     | admin.deera.id       | Manajemen produk, stok, transfer, produksi   |
| **POS**     | `apps/pos`       | pos.deera.id         | Kasir offline-first, laporan, pelanggan      |
| **Finance** | `apps/finance`   | finance.deera.id     | Gajian, kas, kasbon, pettycash               |

Kode bersama (Supabase client, auth, produk, stok, tema, toast) ada di `packages/shared` dan diimpor sebagai `@deera/shared`.

---

## Cara Menjalankan

```bash
# Install semua dependensi (dari root monorepo)
npm install

# Jalankan satu app (pilih salah satu)
npm run dev:catalog
npm run dev:admin
npm run dev:pos
npm run dev:finance

# Build satu app
npm run build:catalog
npm run build:admin
npm run build:pos
npm run build:finance

# Build semua sekaligus
npm run build:all
```

---

## Teknologi

| Layer     | Teknologi                                              |
| --------- | ------------------------------------------------------ |
| Frontend  | React 19 + Vite + Tailwind CSS v3                      |
| Routing   | React Router v7                                        |
| Data      | TanStack Query v5 (fetch/cache) + Zustand v5 (state)   |
| Backend   | Supabase (PostgreSQL + Auth + Realtime + RLS)           |
| Offline   | Dexie.js (IndexedDB, khusus POS)                       |
| Gambar    | Cloudinary CDN (auto WebP/AVIF)                        |
| Monorepo  | npm workspaces + Vertical Slice Architecture           |
| Deploy    | Vercel (per-app)                                       |

---

## Struktur Folder

```
deeraindonesia/
├── apps/
│   ├── catalog/     # Katalog publik (tanpa login)
│   ├── admin/       # Panel manajemen (butuh login)
│   ├── pos/         # Kasir offline-first (butuh login)
│   └── finance/     # Keuangan & gajian (butuh login)
├── packages/
│   └── shared/      # @deera/shared — auth, produk, stok, tema, toast
├── scripts/
│   └── check-truncation.sh   # Deteksi file JS/JSX yang truncated/rusak
├── .githooks/
│   └── pre-commit            # Blok commit jika ada file truncated
├── supabase-migration-*.sql  # Migration Supabase (jalankan manual)
├── CLAUDE.md                 # Panduan kodebase untuk AI assistant
└── README.md
```

Setiap app menggunakan **Vertical Slice Architecture** — kode dikelompokkan per fitur:

```
apps/<app>/src/features/<nama-fitur>/
  api.js        ← Supabase mentah, pure async
  queries.js    ← TanStack Query (useQuery/useMutation)
  store.js      ← Zustand (state client, opsional)
  hooks.js      ← PUBLIC SURFACE — komponen hanya import dari sini
  utils.js      ← Pure helpers
  components/   ← Page, Card, Form
  index.js      ← Barrel export
```

---

## Database (Supabase)

| Tabel               | Isi                                                                   |
| ------------------- | --------------------------------------------------------------------- |
| `products`          | Produk: kode, nama, bahan, variants (size+harga), gambar, video       |
| `stok_warna`        | Stok per `(kode, size, warna)` × 3 lokasi (gudang/cideng/tegalgubug)  |
| `sales`             | Transaksi & retur + `stok_adjustments` JSONB                          |
| `transfers`         | Mutasi stok antar lokasi (pending → approved/rejected)                |
| `pelanggan`         | Database pembeli                                                      |
| `product_history`   | Audit log semua perubahan produk, stok, transfer, produksi            |
| `produksi_batch`    | Record batch produksi (sizes, bahan, HPP per item)                    |
| `hpp_template`      | Template HPP per produk                                               |
| `expected_stok`     | Target stok setelah batch produksi                                    |

---

## Logika Pasar (Market Day)

Lokasi stok aktif ditentukan otomatis berdasarkan hari transaksi:

| Hari              | Lokasi     |
| ----------------- | ---------- |
| Senin & Kamis     | Cideng     |
| Jumat             | Tegalgubug |
| Hari lain         | Gudang     |

---

## Testing

```bash
# Jalankan test per workspace
npm run test:admin
npm run test:pos
npm run test:finance
npm run test:catalog
npm run test:shared

# Semua workspace sekaligus
npm run test
```

Framework: **Vitest + React Testing Library**, environment jsdom.
Setiap workspace punya `vitest.config.js` dan `test/setup.js` sendiri.

---

## Cek Integritas File (Anti-Truncation)

File JS/JSX yang ditulis via Windows file tool ke Linux mount bisa **silent truncated**.
Gunakan script ini untuk mendeteksi file rusak sebelum deploy:

```bash
# Scan semua file JS/JSX
./scripts/check-truncation.sh

# Scan hanya file yang di-git-add (otomatis dijalankan saat pre-commit)
./scripts/check-truncation.sh --staged
```

Git pre-commit hook sudah dikonfigurasi (`git config core.hooksPath .githooks`) —
commit akan **diblok otomatis** jika ada file yang truncated/broken.

---

## SQL Migrations

Jalankan di **Supabase Dashboard → SQL Editor → Run** sesuai urutan:

```
supabase-migration-rls-fix.sql
supabase-migration-discount-and-sold-out.sql
supabase-migration-push-subscriptions-fix-*.sql
supabase-migration-video-column.sql
```

---

## Design System

| Token          | Nilai                         |
| -------------- | ----------------------------- |
| Primary (gold) | `#CAB170`                     |
| Gold dark      | `#A8925A`                     |
| Background     | `#F9F7F4` (light)             |
| Border         | `#E8E3DC` · 2px               |
| Text utama     | `#1A1918`                     |
| Text sekunder  | `#6B6560`                     |
| Font headline  | Braise (serif display)        |
| Font editorial | TheFabricant (editorial sans) |

Skin theme via Tailwind config (`bg-skin-*`, `text-skin-*`, `border-skin-*`).
Dark mode via `class` strategy — toggle via `@deera/shared/features/theme`.
