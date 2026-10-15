-- ============================================================
-- Migration Phase 1 — RPC get_stock_summary()
--
-- Tujuan: memindahkan agregasi stok per produk (yang sebelumnya
-- dilakukan di JavaScript setelah menarik SELURUH tabel `stok_warna`
-- tanpa filter) ke PostgreSQL, sehingga hanya hasil agregat siap-pakai
-- yang dikirim ke client.
--
-- Menggantikan implementasi lama di
-- apps/admin/src/features/produk/api.js (fungsi fetchStokMap):
--   1. SELECT kode, size, gudang, cideng, tegalgubug FROM stok_warna
--      (TANPA filter — seluruh baris, seluruh produk)
--   2. loop semua baris di JS:
--      - GROUP BY kode -> SUM gudang/cideng/tegalgubug (total per produk)
--      - GROUP BY kode+size -> SUM gudang/cideng/tegalgubug (breakdown per size)
--   3. return object map { [kode]: {gudang,cideng,tegalgubug,sizes:{[size]:{...}}} }
--
-- Masalah yang diperbaiki (lihat LAPORAN_AUDIT_READ_LAYER_PHASE1.md,
-- Priority A #2): full-table scan dikirim ke client hanya untuk
-- dijumlahkan — payload bertambah besar seiring jumlah kode x size x
-- warna bertambah, walau hasil akhirnya cuma sejumlah kecil angka per
-- produk.
--
-- Business logic yang direplikasi 1:1 dari versi JS lama:
--   - TIDAK ADA filter pada query dasar — seluruh baris stok_warna
--     dipindai, sama seperti `.select(...)` tanpa `.eq()`/`.filter()`
--     apa pun di kode lama.
--   - Agregasi per kode: SUM gudang/cideng/tegalgubug lintas SEMUA
--     size+warna milik kode tsb (sama seperti `map[row.kode].gudang +=
--     row.gudang ?? 0` dst di loop lama).
--   - Agregasi per kode+size: SUM gudang/cideng/tegalgubug lintas semua
--     warna untuk kombinasi kode+size tsb (sama seperti
--     `map[row.kode].sizes[row.size].gudang += ...` dst).
--   - Fallback nilai NULL -> 0 (`row.gudang ?? 0` di JS) direplikasi via
--     COALESCE — walau kolom gudang/cideng/tegalgubug di stok_warna
--     sudah NOT NULL DEFAULT 0 di skema saat ini (jadi secara praktik
--     SUM tidak akan pernah bertemu NULL), COALESCE dipertahankan
--     sebagai jaring pengaman yang setara dengan `?? 0` di kode lama.
--   - Kalau tabel stok_warna kosong -> return objek kosong `{}`, sama
--     seperti `data=[]` -> loop tidak jalan -> `map={}` di kode lama.
--   - Bentuk output PERSIS sama dengan yang dipakai UI:
--     { [kode]: { gudang, cideng, tegalgubug, sizes: { [size]: { gudang, cideng, tegalgubug } } } }
--     — tidak ada field tambahan (mis. tidak ada "total" gabungan
--     lintas lokasi), sama seperti kode lama yang memang tidak
--     menghitung total gabungan tersebut.
--
-- Idempotent: CREATE OR REPLACE FUNCTION aman dijalankan berkali-kali.
-- Tidak mengubah migration lama, tidak membuat tabel/kolom/constraint/
-- trigger/view/generated column baru, tidak mengimplementasikan RPC lain.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_stock_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH per_size AS (
    -- GROUP BY kode+size -> SUM per lokasi (breakdown "sizes" per kode)
    SELECT
      kode,
      size,
      COALESCE(SUM(gudang), 0)::int AS gudang,
      COALESCE(SUM(cideng), 0)::int AS cideng,
      COALESCE(SUM(tegalgubug), 0)::int AS tegalgubug
    FROM stok_warna
    GROUP BY kode, size
  ),
  per_kode AS (
    -- GROUP BY kode -> SUM per lokasi (total per produk, lintas semua size+warna)
    SELECT
      kode,
      COALESCE(SUM(gudang), 0)::int AS gudang,
      COALESCE(SUM(cideng), 0)::int AS cideng,
      COALESCE(SUM(tegalgubug), 0)::int AS tegalgubug
    FROM stok_warna
    GROUP BY kode
  ),
  size_map AS (
    -- Satukan breakdown per size jadi 1 objek jsonb per kode:
    -- { [size]: {gudang,cideng,tegalgubug} }
    SELECT
      kode,
      jsonb_object_agg(
        size,
        jsonb_build_object('gudang', gudang, 'cideng', cideng, 'tegalgubug', tegalgubug)
      ) AS sizes
    FROM per_size
    GROUP BY kode
  )
  -- Satukan semua kode jadi 1 objek jsonb map:
  -- { [kode]: {gudang,cideng,tegalgubug,sizes:{...}} }
  -- COALESCE(..., '{}'::jsonb) supaya tabel kosong -> {} (bukan NULL),
  -- sama seperti `map = {}` di kode lama saat data kosong.
  SELECT COALESCE(
    jsonb_object_agg(
      pk.kode,
      jsonb_build_object(
        'gudang', pk.gudang,
        'cideng', pk.cideng,
        'tegalgubug', pk.tegalgubug,
        'sizes', COALESCE(sm.sizes, '{}'::jsonb)
      )
    ),
    '{}'::jsonb
  )
  FROM per_kode pk
  LEFT JOIN size_map sm ON sm.kode = pk.kode;
$$;

-- Sama seperti RLS SELECT `stok_warna` yang sudah mengizinkan role
-- authenticated (dan anon, untuk katalog publik) membaca stok_warna —
-- RPC ini dipakai halaman Admin (authenticated), grant dibatasi ke situ.
GRANT EXECUTE ON FUNCTION public.get_stock_summary() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_stock_summary';
--
-- Cek grant:
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'get_stock_summary';
--
-- Bandingkan manual hasil RPC vs agregasi manual untuk 1 kode:
-- SELECT public.get_stock_summary() -> 'D-01-OSK';
-- SELECT kode, size, SUM(gudang) gudang, SUM(cideng) cideng, SUM(tegalgubug) tegalgubug
-- FROM stok_warna WHERE kode = 'D-01-OSK' GROUP BY kode, size;
