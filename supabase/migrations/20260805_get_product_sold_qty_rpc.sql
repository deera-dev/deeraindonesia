-- ============================================================
-- Filter "Terlaris" di Admin Page — get_product_sold_qty()
--
-- Dibutuhkan untuk sort "Paling Banyak Laku" di modal filter grid produk
-- (apps/admin/src/features/produk). Dibedakan SENGAJA dari
-- analytics_products().leaderboard.terlaris (Phase 2 Analytics RPC):
--   - analytics_products() dibatasi rentang tanggal (p_from/p_to) DAN
--     LIMIT 10 per list — cocok untuk dashboard leaderboard, TIDAK cocok
--     untuk sort seluruh katalog produk (butuh angka utk SEMUA kode, bukan
--     cuma top 10, dan scope-nya harus ALL-TIME, bukan periode filter).
--   - Fungsi ini sebaliknya: TANPA parameter, TANPA limit, ALL-TIME —
--     mengembalikan jsonb map {kode: total_qty_terjual_bersih} untuk
--     SEMUA kode yang punya net qty > 0 (retur mengurangi, sama seperti
--     seluruh RPC penjualan lain di repo ini).
--
-- Business logic qty per item (flat vs per-warna, tanda retur) DIREPLIKASI
-- identik dari sales_flat() (20260712_analytics_phase1_rpc.sql) dan
-- get_sales_summary_by_product() — TIDAK menulis ulang logika baru, hanya
-- versi ALL-TIME (tanpa filter tanggal) yang query langsung ke `sales`
-- mentah, pola yang sama seperti CTE `ever_sold`/`tidak_pernah_terjual`
-- di analytics_products() (20260712_analytics_phase2_products_rpc.sql).
--
-- Return: jsonb object, contoh { "D-07-OSK": 42, "D-82-SFN": 5 }. Kode
-- dengan net qty <= 0 (retur lebih besar dari sale, atau tidak pernah
-- terjual) TIDAK muncul sebagai key sama sekali — konsumen (frontend)
-- WAJIB treat kode yang tidak ada sebagai qty 0.
--
-- Idempotent: CREATE OR REPLACE FUNCTION. Tidak mengubah tabel/index/
-- fungsi lain yang sudah ada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_product_sold_qty()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH flat AS (
    SELECT
      item ->> 'kode' AS kode,
      (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END) *
      COALESCE(
        CASE
          WHEN jsonb_typeof(item -> 'warna') = 'array'
               AND jsonb_array_length(item -> 'warna') > 0
            THEN (
              SELECT SUM(COALESCE((w ->> 'qty')::numeric, 0))
              FROM jsonb_array_elements(item -> 'warna') AS w
            )
          ELSE COALESCE((item ->> 'qty')::numeric, 0)
        END,
        0
      ) AS signed_qty
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
    WHERE item ->> 'kode' IS NOT NULL
  ),
  agg AS (
    SELECT kode, SUM(signed_qty) AS total_qty
    FROM flat
    GROUP BY kode
  )
  SELECT COALESCE(jsonb_object_agg(kode, total_qty), '{}'::jsonb)
  FROM agg
  WHERE total_qty > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_sold_qty() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- SELECT jsonb_pretty(public.get_product_sold_qty());
-- Bandingkan 1 kode manual:
-- SELECT public.get_product_sold_qty() -> 'D-07-OSK';
-- ────────────────────────────────────────────────────────────
