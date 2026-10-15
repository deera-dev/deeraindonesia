-- ============================================================
-- MIGRATION: discount column + sold-out RPC
-- Jalankan di Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Tambah kolom discount ke tabel sales
--    (amount Rupiah yang didiskon, default 0)
-- ────────────────────────────────────────────────────────────
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount integer NOT NULL DEFAULT 0;

-- Kalau kolom discount sudah ada tapi tipenya berbeda, skip saja.
-- Cek dengan: SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'sales' AND column_name = 'discount';


-- ────────────────────────────────────────────────────────────
-- 2. RPC function: get_sold_out_kodes()
--    Catalog (anon) bisa tahu kode mana yang stoknya habis
--    tanpa harus punya akses ke seluruh tabel stok_warna.
--    SECURITY DEFINER = fungsi jalan dengan hak pemilik (bypass RLS).
--
--    FIX v2: LEFT JOIN ke products agar produk yang BELUM punya
--    entry di stok_warna (stok belum diisi) juga dianggap habis.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_sold_out_kodes()
RETURNS TABLE(kode text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.kode
  FROM products p
  LEFT JOIN (
    SELECT
      kode,
      SUM(COALESCE(gudang, 0) + COALESCE(cideng, 0) + COALESCE(tegalgubug, 0)) AS total
    FROM stok_warna
    GROUP BY kode
  ) s ON p.kode = s.kode
  WHERE s.total = 0        -- semua stok_warna ada tapi total = 0
     OR s.total IS NULL;   -- tidak ada row di stok_warna sama sekali
$$;

-- Izinkan anon dan authenticated memanggil fungsi ini
GRANT EXECUTE ON FUNCTION public.get_sold_out_kodes() TO anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- VERIFIKASI
-- ────────────────────────────────────────────────────────────

-- Cek kolom discount ada:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'sales' AND column_name = 'discount';

-- Cek fungsi berjalan:
-- SELECT * FROM get_sold_out_kodes();
-- ────────────────────────────────────────────────────────────
