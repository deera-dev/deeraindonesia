# DEPLOYMENT.md — Panduan Deploy & Operasional

# Deera Indonesia

---

## 1. Stack Deployment

```
Hosting    : Vercel (3 project terpisah)
Database   : Supabase (1 project, shared semua app)
CDN Gambar : Cloudinary
```

---

## 2. Setup Vercel

### Langkah per App

1. Buka https://vercel.com → New Project
2. Import repository `deeraindonesia` dari GitHub
3. **Root Directory:** sesuaikan per app:
   - Catalog: `apps/catalog`
   - Admin: `apps/admin`
   - POS: `apps/pos`
4. **Framework Preset:** Vite
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`
7. Set **Environment Variables** (lihat bagian 3)
8. Deploy

### Domain Custom

- Catalog: `catalog.deera.id` (atau domain sesuai preferensi)
- Admin: `admin.deera.id`
- POS: `pos.deera.id`

---

## 3. Environment Variables

Set di Vercel → Project Settings → Environment Variables.

### Semua App

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Admin + POS (untuk upload gambar)

```env
VITE_CLOUDINARY_CLOUD_NAME=nama-cloud-kalian
VITE_CLOUDINARY_UPLOAD_PRESET=nama-preset-unsigned
```

> **Cara dapat nilai ini:**
>
> - Supabase: Dashboard → Settings → API
> - Cloudinary: Dashboard → Settings → Upload Presets (buat "Unsigned" preset baru)

---

## 4. Cloudinary Setup

1. Daftar di cloudinary.com (free tier cukup untuk awal)
2. Dashboard → Settings → Upload Presets
3. Klik "Add upload preset"
4. Set **Signing Mode** = Unsigned
5. (Opsional) Set folder default, transformasi default
6. Salin Preset Name → pakai di `VITE_CLOUDINARY_UPLOAD_PRESET`
7. Salin Cloud Name dari dashboard → pakai di `VITE_CLOUDINARY_CLOUD_NAME`

---

## 5. Supabase Setup

### Project Baru

1. Buka app.supabase.com → New Project
2. Pilih region terdekat (Singapore/ap-southeast-1)
3. Set database password (simpan di tempat aman)
4. Setelah project siap → ikuti urutan migration di `DATABASE.md`

### Auth Settings

1. Authentication → Providers → Email: Enable
2. Authentication → Settings:
   - Site URL: set ke domain utama
   - Redirect URLs: tambahkan semua domain app
3. Buat user pertama: Authentication → Users → Invite

### API Keys

- Settings → API → Project URL → `VITE_SUPABASE_URL`
- Settings → API → anon/public key → `VITE_SUPABASE_ANON_KEY`

---

## 6. Deploy Ulang Setelah Update Kode

```bash
# Push ke GitHub → Vercel otomatis deploy

# Atau manual via Vercel CLI:
vercel --cwd apps/catalog
vercel --cwd apps/admin
vercel --cwd apps/pos
```

Vercel sudah dikonfigurasi untuk auto-deploy dari branch `main`.

---

## 7. Update Database (Migration)

Saat ada perubahan schema:

1. Buat file SQL baru: `supabase-migration-{nama-fitur}.sql`
2. Jalankan di Supabase Dashboard → SQL Editor → Run
3. Commit file SQL ke repository (sebagai dokumentasi)

> Tidak ada automated migration runner. Semua dijalankan manual.

---

## 8. Environment per Branch (Opsional)

Untuk development yang aman, bisa buat 2 Supabase project:

- `deera-production` → untuk production
- `deera-staging` → untuk testing

Dan di Vercel, set environment berbeda untuk Preview vs Production.

---

## 9. Monitoring & Troubleshooting

### Cek Status

- Supabase: https://status.supabase.com
- Vercel: https://www.vercel-status.com

### Log

- Vercel: Project → Functions → Logs (untuk serverless, jika ada)
- Supabase: Dashboard → Logs → API logs, Database logs

### Issue Umum

| Masalah                        | Penyebab                     | Solusi                                                 |
| ------------------------------ | ---------------------------- | ------------------------------------------------------ |
| POS stok tidak update          | Realtime tidak dikonfigurasi | Jalankan `supabase-migration-realtime-and-history.sql` |
| Upload gambar gagal            | Cloudinary env tidak di-set  | Cek `VITE_CLOUDINARY_*` di Vercel                      |
| Login gagal di admin           | Supabase URL/key salah       | Cek `VITE_SUPABASE_*` di Vercel                        |
| Produk tidak muncul di catalog | Produk tidak punya foto      | Tambah foto via admin                                  |
| POS offline tidak sync         | Transaksi pending stuck      | Tap ↻ Sync di header POS                               |
| Hapus riwayat gagal            | RLS DELETE policy belum ada  | Jalankan migration realtime-and-history                |

---

## 10. Backup Data

### Manual Backup Database

1. Supabase Dashboard → Database → Backups
2. Download backup terbaru
3. Simpan di Google Drive / penyimpanan aman

### Export Data Penting

```sql
-- Export semua transaksi sebagai CSV:
COPY (SELECT * FROM sales ORDER BY date DESC) TO STDOUT WITH CSV HEADER;

-- Export stok saat ini:
COPY (SELECT * FROM stok_warna ORDER BY kode, size, warna) TO STDOUT WITH CSV HEADER;

-- Export produk:
COPY (SELECT kode, nama, bahan, hpp FROM products ORDER BY kode) TO STDOUT WITH CSV HEADER;
```

---

## 11. Kontak & Akses

| Resource   | URL / Info                                  |
| ---------- | ------------------------------------------- |
| Supabase   | app.supabase.com (login dengan akun owner)  |
| Vercel     | vercel.com (login dengan akun GitHub owner) |
| Cloudinary | cloudinary.com (login dengan akun owner)    |
| GitHub     | repository deeraindonesia                   |
| WA Toko    | +62811947254                                |
