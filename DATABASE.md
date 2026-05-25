# DATABASE.md — Panduan Database & Migration
# Deera Indonesia — Supabase (PostgreSQL)

---

## 1. Setup Awal (Fresh Install)

Jalankan SQL berikut secara berurutan di Supabase Dashboard → SQL Editor:

```
1. supabase-migration-sales-table.sql
2. supabase-migration-add-variants.sql
3. supabase-migration-stok-warna.sql
4. supabase-migration-warna-column.sql
5. supabase-migration-pelanggan.sql
6. supabase-migration-add-history.sql
7. supabase-migration-add-user-to-history.sql
8. supabase-migration-history-audit.sql
9. supabase-migration-rls-fix.sql
10. supabase-migration-discount-and-sold-out.sql
11. supabase/migrations/20260522_transfers.sql
12. supabase-migration-push-notifications.sql
13. supabase-migration-realtime-and-history.sql   ← Realtime + history DELETE
14. supabase/migrations/20260525_produksi.sql    ← Modul produksi (bahan, batch, HPP)
```

---

## 2. Skema Tabel Lengkap

### products
```sql
CREATE TABLE products (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kode        text        UNIQUE NOT NULL,
  nama        text        NOT NULL DEFAULT '',
  bahan       text,
  hpp         integer     DEFAULT 0,
  image       text,                              -- URL Cloudinary, nullable
  detail      jsonb       DEFAULT '[]',          -- array URL foto detail
  variants    jsonb       DEFAULT '[]',
  -- variants: [{size, harga, ld, pb}]
  -- size: "Midi" | "Midi Jumbo" | "Gamis" | "Gamis Jumbo"
  warna       jsonb       DEFAULT '[]',          -- array string warna
  position    integer,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read products" ON products FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "auth write products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### stok_warna
```sql
CREATE TABLE stok_warna (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kode        text        NOT NULL REFERENCES products(kode) ON UPDATE CASCADE,
  size        text        NOT NULL,
  warna       text        NOT NULL DEFAULT '_',  -- "_" untuk produk tanpa warna
  gudang      integer     NOT NULL DEFAULT 0,
  cideng      integer     NOT NULL DEFAULT 0,
  tegalgubug  integer     NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kode, size, warna)
);

ALTER TABLE stok_warna ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stok_warna_select" ON stok_warna FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "stok_warna_insert" ON stok_warna FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "stok_warna_update" ON stok_warna FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "stok_warna_delete" ON stok_warna FOR DELETE TO authenticated USING (true);

-- Untuk Supabase Realtime (POS live update)
ALTER TABLE stok_warna REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE stok_warna;
```

### sales
```sql
CREATE TABLE sales (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date             date        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  type             text        NOT NULL DEFAULT 'sale',  -- 'sale' | 'retur'
  location         text,                                 -- 'gudang' | 'cideng' | 'tegalgubug'
  buyer_name       text,
  buyer_hp         text,
  pelanggan_id     uuid        REFERENCES pelanggan(id),
  items            jsonb       NOT NULL DEFAULT '[]',
  -- items: [{kode, nama, size, warna, harga, qty, hpp, warna: [{warna, qty}]}]
  discount         integer     DEFAULT 0,
  total            integer     NOT NULL DEFAULT 0,
  stok_adjustments jsonb       NOT NULL DEFAULT '[]',
  -- stok_adjustments: [{kode, size, warna, location, delta}]
  created_by_email text,
  created_by_name  text
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update sales" ON sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete sales" ON sales FOR DELETE TO authenticated USING (true);
```

### transfers
```sql
CREATE TABLE transfers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  transfer_no     text        NOT NULL,      -- SJ-YYYYMMDD-{rand}
  from_location   text        NOT NULL,
  to_location     text        NOT NULL,
  items           jsonb       NOT NULL DEFAULT '[]',
  -- items: [{kode, size, warna, qty}]
  notes           text,
  status          text        NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_by      text,
  created_by_name text,
  approved_by     text,
  approved_at     timestamptz,
  rejected_by     text,
  rejected_at     timestamptz,
  reject_reason   text
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers_select" ON transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "transfers_insert" ON transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transfers_update" ON transfers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "transfers_delete" ON transfers FOR DELETE TO authenticated USING (true);
```

### product_history
```sql
CREATE TABLE product_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action          text        NOT NULL,
  -- tambah | edit | hapus | transfer-buat | transfer-approve | transfer-reject | stok-opname
  category        text        NOT NULL DEFAULT 'produk',  -- produk | transfer | stok
  kode            text        NOT NULL,
  nama            text,
  snapshot        jsonb,   -- state SETELAH perubahan
  before_snapshot jsonb,   -- state SEBELUM perubahan
  user_email      text,
  user_name       text,
  changed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_history_category  ON product_history (category);
CREATE INDEX idx_product_history_changed_at ON product_history (changed_at DESC);

ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read history" ON product_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert history" ON product_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can delete history" ON product_history FOR DELETE TO authenticated USING (true);
```

### pelanggan
```sql
CREATE TABLE pelanggan (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        text        NOT NULL,
  no_hp       text,
  alamat      text,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE pelanggan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full pelanggan" ON pelanggan FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### expected_stok
```sql
CREATE TABLE expected_stok (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kode         text        NOT NULL,
  size         text        NOT NULL,
  warna        text        NOT NULL DEFAULT '_',
  expected_qty integer     NOT NULL DEFAULT 0,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(kode, size, warna)
);

ALTER TABLE expected_stok ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access" ON expected_stok FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### bahan_pembelian
```sql
CREATE TABLE bahan_pembelian (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal         date        NOT NULL,
  nama_bahan      text        NOT NULL,
  kode_bahan      text,
  motif           text,
  satuan          text        NOT NULL DEFAULT 'meter',  -- meter | yard | cm
  jumlah          numeric     NOT NULL,
  harga_satuan    integer     NOT NULL DEFAULT 0,
  total_harga     integer     NOT NULL DEFAULT 0,
  jatuh_tempo     date        NOT NULL,                  -- 4 bulan setelah tanggal
  status_bayar    text        NOT NULL DEFAULT 'belum',  -- belum | lunas
  catatan         text,
  created_by      text,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### bahan_pinjam
```sql
CREATE TABLE bahan_pinjam (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal         date        NOT NULL,
  dari_siapa      text        NOT NULL,    -- nama supplier / pemberi pinjaman
  nama_bahan      text        NOT NULL,
  kode_bahan      text,
  motif           text,
  satuan          text        NOT NULL DEFAULT 'meter',
  jumlah          numeric     NOT NULL,
  harga_satuan    integer     NOT NULL DEFAULT 0,
  total_harga     integer     NOT NULL DEFAULT 0,
  jatuh_tempo     date        NOT NULL,
  status_bayar    text        NOT NULL DEFAULT 'belum',
  catatan         text,
  created_by      text,
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### produksi_batch
```sql
CREATE TABLE produksi_batch (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_no         text        UNIQUE NOT NULL,      -- format: PROD-YYYYMMDD-XXX
  kode_produk      text        NOT NULL REFERENCES products(kode) ON UPDATE CASCADE,
  nama_produk      text,
  tanggal_produksi date        NOT NULL,
  total_kain       integer     NOT NULL DEFAULT 0,   -- total pakaian diproduksi
  sizes            jsonb       NOT NULL DEFAULT '[]',
  -- sizes: [{size, warna: [{warna, qty}]}]
  bahan_dipakai    jsonb       NOT NULL DEFAULT '[]',
  -- bahan_dipakai: [{nama_bahan, kode_bahan, satuan, jumlah}]
  hpp_snapshot     jsonb,                            -- snapshot komponen HPP saat produksi
  hpp_per_item     integer     DEFAULT 0,            -- HPP per pakaian (IDR)
  stok_ditambah    boolean     NOT NULL DEFAULT false,
  stok_lokasi      text,                             -- gudang | cideng | tegalgubug
  catatan          text,
  created_by       text,
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

### hpp_config
```sql
-- Harga dasar komponen HPP, bisa diubah admin.
-- Perubahan tidak mempengaruhi batch yang sudah tersimpan (snapshot terkunci).
CREATE TABLE hpp_config (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        UNIQUE NOT NULL,
  label      text        NOT NULL,
  nilai      integer     NOT NULL DEFAULT 0,
  keterangan text,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);
-- Keys: bordir, jahit_midi, jahit_gamis, plastik, hangtag, tali_hangtag,
--       merk, pin, kain_keras, kancing_satuan, studio, poin_denny, poin_haikal
```

### v_stok_bahan (View)
```sql
-- Stok bahan dihitung otomatis: masuk (beli + pinjam) - keluar (pemakaian produksi)
CREATE OR REPLACE VIEW v_stok_bahan AS
SELECT nama_bahan, satuan,
  COALESCE(masuk, 0)  AS total_masuk,
  COALESCE(keluar, 0) AS total_keluar,
  COALESCE(masuk, 0) - COALESCE(keluar, 0) AS stok_sisa
FROM (...);
```

---

## 3. Functions & RPC

### get_sold_out_kodes
Dipakai oleh Catalog untuk menandai produk habis tanpa expose data stok detail.

```sql
CREATE OR REPLACE FUNCTION get_sold_out_kodes()
RETURNS TABLE(kode text)
LANGUAGE sql
SECURITY DEFINER   -- bypass RLS, diakses anon
AS $$
  SELECT DISTINCT sw.kode
  FROM stok_warna sw
  GROUP BY sw.kode
  HAVING SUM(sw.gudang + sw.cideng + sw.tegalgubug) = 0;
$$;
```

---

## 4. Index Penting

```sql
-- products
CREATE INDEX products_created_at_idx ON products (created_at DESC);
CREATE INDEX products_position_idx ON products (position ASC);

-- stok_warna
CREATE INDEX stok_warna_kode_idx ON stok_warna (kode);
CREATE INDEX stok_warna_kode_size_idx ON stok_warna (kode, size);

-- sales
CREATE INDEX sales_date_idx ON sales (date DESC);

-- transfers
CREATE INDEX transfers_status_idx ON transfers (status);
CREATE INDEX transfers_created_at_idx ON transfers (created_at DESC);

-- product_history
CREATE INDEX idx_product_history_category ON product_history (category);
CREATE INDEX idx_product_history_changed_at ON product_history (changed_at DESC);
```

---

## 5. Query Umum

### Stok total per produk
```sql
SELECT kode,
       SUM(gudang) as total_gudang,
       SUM(cideng) as total_cideng,
       SUM(tegalgubug) as total_tegalgubug,
       SUM(gudang + cideng + tegalgubug) as total_all
FROM stok_warna
GROUP BY kode
ORDER BY kode;
```

### Produk dengan stok habis
```sql
SELECT p.kode, p.nama
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM stok_warna sw
  WHERE sw.kode = p.kode
    AND (sw.gudang + sw.cideng + sw.tegalgubug) > 0
);
```

### Omset per hari (bulan ini)
```sql
SELECT date,
       COUNT(*) as jumlah_transaksi,
       SUM(total) as omset,
       SUM(total - discount) as omset_net
FROM sales
WHERE type = 'sale'
  AND date >= date_trunc('month', CURRENT_DATE)
GROUP BY date
ORDER BY date DESC;
```

### Audit log perubahan stok
```sql
SELECT kode, nama, user_name, changed_at,
       before_snapshot, snapshot
FROM product_history
WHERE category = 'stok'
ORDER BY changed_at DESC
LIMIT 50;
```

---

## 6. Checklist Setup Supabase Baru

```
□ Jalankan semua migration SQL (urutan di atas)
□ Buat user admin pertama di Supabase Auth → Authentication → Users
□ Set environment variables di tiap app Vercel:
    VITE_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY
    VITE_CLOUDINARY_CLOUD_NAME  (admin & pos)
    VITE_CLOUDINARY_UPLOAD_PRESET (admin & pos)
□ Buat Cloudinary upload preset (unsigned)
□ Verifikasi Realtime aktif:
    SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
    → harus ada: stok_warna
□ Test: stok opname di admin → cek POS update otomatis
□ Test: transfer buat → approve → cek stok berubah
```

---

## 7. Backup & Monitoring

- Supabase Pro: backup otomatis harian (point-in-time recovery)
- Free tier: backup manual via Dashboard → Database → Backups
- Monitor via Supabase Dashboard → Reports → API & Database
- Alert pada tabel `product_history` jika `action = 'hapus'` (data sensitif)
