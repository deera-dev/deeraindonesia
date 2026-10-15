-- ============================================================
-- RPC get_sales_detail_by_product()
--
-- Tujuan: permintaan Denny 2026-09 — "ada info juga siapa saja pembeli
-- yang sudah pernah membeli produk tersebut, jadi kalo di klik terjualnya
-- langsung muncul transaksi transaksi dan nama pembeli nya" — Admin
-- ProductDetailModal butuh daftar transaksi PER BARIS (bukan hanya
-- agregat) supaya bisa menampilkan tanggal + nama pembeli per transaksi
-- ketika baris "Total Terjual" di-klik (lazy-loaded, lihat
-- apps/admin/src/features/produk/components/ProductDetailModal.jsx).
--
-- Mereplikasi business logic yang SAMA PERSIS dengan RPC
-- `get_sales_summary_by_product` (lihat migration
-- 20260711_migration_phase1_rpc_sales_summary_by_product.sql):
--   - Hanya baris `sales` dengan type = 'sale' yang dihitung (retur TIDAK
--     dihitung, sama seperti summary).
--   - Dibatasi LIMIT 10000 baris sales yang dipindai (sama seperti summary).
--   - Item dicocokkan dengan (item->>'kode') = p_kode.
--   - Qty per item: kalau item.warna adalah ARRAY jsonb, qty = SUM
--     warna[].qty; kalau bukan array, qty = angka dari item.qty. Defensif
--     terhadap nilai non-numerik (BEGIN/EXCEPTION -> 0), sama seperti
--     `Number(x) || 0` di JS.
--   - qty DIJUMLAHKAN LINTAS SEMUA ITEM yang cocok dalam SATU baris sales
--     (jaga-jaga kalau kode yang sama muncul >1 kali dalam items[] satu
--     transaksi) -> satu baris hasil per transaksi (sales.id), bukan per
--     item.
--   - Baris sales hanya diikutkan kalau qty gabungan > 0 DAN location
--     adalah salah satu dari gudang/cideng/tegalgubug (sama seperti
--     summary, menyaring data location yang rusak/tidak dikenal).
--   - Diurutkan created_at DESC (transaksi terbaru dulu) supaya daftar
--     pembeli di UI langsung menampilkan yang terbaru di atas.
--
-- Beda dari get_sales_summary_by_product: RETURNS TABLE per transaksi
-- (id, created_at, buyer_name, buyer_hp, location, qty), bukan jsonb
-- agregat {gudang,cideng,tegalgubug,total}.
--
-- Idempotent: CREATE OR REPLACE FUNCTION aman dijalankan berkali-kali.
-- Tidak mengubah migration lama, tidak membuat tabel/kolom/constraint/
-- trigger/view baru, tidak mengimplementasikan RPC lain.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_sales_detail_by_product(p_kode text)
RETURNS TABLE (
  id          uuid,
  created_at  timestamptz,
  buyer_name  text,
  buyer_hp    text,
  location    text,
  qty         integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sale        record;
  v_item        jsonb;
  v_warna_elem  jsonb;
  v_item_qty    numeric;
  v_wqty        numeric;
  v_sale_qty    numeric;
BEGIN
  FOR v_sale IN
    SELECT s.id, s.created_at, s.buyer_name, s.buyer_hp, s.location, s.items
    FROM sales s
    WHERE s.type = 'sale'
    ORDER BY s.created_at DESC
    LIMIT 10000
  LOOP
    v_sale_qty := 0;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_sale.items, '[]'::jsonb))
    LOOP
      IF (v_item ->> 'kode') IS DISTINCT FROM p_kode THEN
        CONTINUE;
      END IF;

      IF jsonb_typeof(v_item -> 'warna') = 'array' THEN
        v_item_qty := 0;
        FOR v_warna_elem IN SELECT * FROM jsonb_array_elements(v_item -> 'warna')
        LOOP
          BEGIN
            v_wqty := COALESCE((v_warna_elem ->> 'qty')::numeric, 0);
          EXCEPTION WHEN OTHERS THEN
            v_wqty := 0;
          END;
          v_item_qty := v_item_qty + v_wqty;
        END LOOP;
      ELSE
        BEGIN
          v_item_qty := COALESCE((v_item ->> 'qty')::numeric, 0);
        EXCEPTION WHEN OTHERS THEN
          v_item_qty := 0;
        END;
      END IF;

      v_sale_qty := v_sale_qty + v_item_qty;
    END LOOP;

    IF v_sale_qty > 0 AND v_sale.location IN ('gudang', 'cideng', 'tegalgubug') THEN
      id := v_sale.id;
      created_at := v_sale.created_at;
      buyer_name := v_sale.buyer_name;
      buyer_hp := v_sale.buyer_hp;
      location := v_sale.location;
      qty := v_sale_qty::int;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Sama seperti get_sales_summary_by_product: hanya user login (admin) yang
-- perlu memanggil ini.
GRANT EXECUTE ON FUNCTION public.get_sales_detail_by_product(text) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_sales_detail_by_product';
--
-- Cek grant:
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'get_sales_detail_by_product';
--
-- Bandingkan SUM(qty) hasil fungsi ini dengan field `total` dari
-- get_sales_summary_by_product untuk kode yang sama (harus identik):
-- SELECT SUM(qty) FROM public.get_sales_detail_by_product('D-01-OSK');
-- SELECT public.get_sales_summary_by_product('D-01-OSK');
