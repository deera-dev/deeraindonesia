# Deera Indonesia — Monorepo

Sistem manajemen toko busana grosir Deera Indonesia terdiri dari **3 aplikasi** dalam satu monorepo:

| App | Jalur | Fungsi |
|---|---|---|
| **POS** | `apps/pos` | Kasir — transaksi, laporan harian, pelanggan |
| **Admin** | `apps/admin` | Manajemen produk & stok per warna/ukuran |
| **Catalog** | `apps/catalog` | Katalog publik gaya Instagram (scroll vertikal) |

Kode bersama (supabase, auth, hooks, konstanta) ada di `packages/shared`.

---

## Cara Menjalankan

```bash
# Install semua dependensi (dari root)
npm install

# Jalankan satu app (pilih salah satu)
npm run dev --workspace=apps/pos
npm run dev --workspace=apps/admin
npm run dev --workspace=apps/catalog

# Build production
npm run build --workspace=apps/pos
```

---

## Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v3 |
| Backend | Supabase (PostgreSQL + RLS + Auth) |
| Offline | Dexie.js (IndexedDB wrapper) |
| Gambar | Cloudinary CDN |
| Monorepo | npm workspaces |

---

## Struktur Folder

```
deera-indonesia/
├── apps/
│   ├── pos/          # Kasir — offline-first, transaksi cepat
│   ├── admin/        # Admin produk & stok (butuh login)
│   └── catalog/      # Katalog publik (tanpa login)
├── packages/
│   └── shared/       # Kode bersama: supabase, auth, hooks, format
├── supabase-migration-*.sql   # Migration Supabase (jalankan manual)
└── README.md
```

---

## Database (Supabase)

### Tabel Utama

| Tabel | Isi |
|---|---|
| `products` | Katalog produk: kode, nama, bahan, variants (size+harga), gambar |
| `stok_warna` | Stok per `(kode, size, warna)` × 3 lokasi |
| `sales` | Transaksi + retur, dengan `stok_adjustments` JSONB |
| `pelanggan` | Database pembeli |

> ⚠ Kolom `stok_gudang/cideng/tegalgubug` di tabel `products` sudah **dihapus**.
> Satu-satunya sumber stok yang valid adalah tabel `stok_warna`.

### Struktur `stok_warna`

```
id, kode, size, warna, gudang, cideng, tegalgubug, updated_at
UNIQUE(kode, size, warna)
```

---

## Logika Pasar (Market Day)

Stok dikurangi dari lokasi yang aktif berdasarkan hari transaksi:

| Hari | Lokasi |
|---|---|
| Senin & Kamis | Cideng |
| Jumat | Tegalgubug |
| Hari lain | Gudang |

Kasir bisa override lokasi secara manual dari header POS.

---

## SQL Migrations

Jalankan di **Supabase Dashboard → SQL Editor → Run**:

1. `supabase-migration-rls-fix.sql` — fix RLS policies + hapus kolom stok legacy
2. `supabase-migration-discount-and-sold-out.sql` — kolom discount + RPC `get_sold_out_kodes()`

---

## Design System

| Token | Nilai |
|---|---|
| Primary (gold) | `#CAB170` |
| Background | `#F9F7F4` |
| Border | `#E8E3DC` (2px) |
| Text utama | `#1A1918` |
| Text sekunder | `#6B6560` |
| Font headline | Braise (serif) |
| Font body | TheFabricant (editorial) |
