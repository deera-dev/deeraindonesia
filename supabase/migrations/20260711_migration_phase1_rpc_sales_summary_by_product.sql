-- ============================================================
-- Migration Phase 1 — RPC get_sales_summary_by_product()
--
-- Tujuan: memindahkan agregasi qty penjualan per produk (yang sebelumnya
-- dilakukan di JavaScript setelah menarik hingga 10.000 baris tabel
-- `sales`) ke PostgreSQL, sehingga hanya hasil agregat (4 angka) yang
-- dikirim ke client, bukan ribuan baris mentah.
--
-- Menggantikan implementasi lama di
-- apps/admin/src/features/produk/api.js (fungsi fetchSalesByKode):
--   1. SELECT location, items FROM sales WHERE type='sale' LIMIT 10000
--   2. loop semua baris -> loop semua item -> filter kode di JS
--   3. hitung qty (flat item.qty ATAU SUM item.warna[].qty)
--   4. SUM per lokasi (gudang/cideng/tegalgubug) + total
--
-- Masalah yang diperbaiki (lihat LAPORAN_AUDIT_READ_LAYER_PHASE1.md,
-- Priority A #1): payload besar (bisa s.d. 10.000 baris berisi data
-- SEMUA produk) ditarik ke client hanya untuk menghitung angka 1 produk.
--
-- Business logic yang direplikasi 1:1 dari versi JS lama:
--   - Hanya baris `sales` dengan type = 'sale' yang dihitung (retur
--     TIDAK dihitung, sama seperti query lama).
--   - Dibatasi `LIMIT 10000` baris sales yang dipindai — SENGAJA
--     dipertahankan walau secara arsitektur RPC ini sudah tidak butuh
--     batas itu (limit lama hanya workaround default 1000-row Supabase,
--     lihat komentar `.limit(10000)` di kode lama). Dipertahankan demi
--     hasil yang identik pada semua ukuran data, lihat laporan §8.
--   - Item dicocokkan dengan `(item->>'kode') = p_kode` — sama seperti
--     `item.kode === kode` (perbandingan string).
--   - Qty per item: kalau `item.warna` adalah ARRAY jsonb, qty = SUM
--     `warna[].qty` (default 0 kalau field tidak ada/tidak valid); kalau
--     bukan array, qty = angka dari `item.qty` (default 0 kalau
--     kosong/tidak valid — TIDAK pernah error, persis seperti
--     `Number(x) || 0` di JS yang selalu menghasilkan angka).
--   - Item hanya diakumulasi kalau qty > 0 DAN location adalah salah
--     satu dari gudang/cideng/tegalgubug (menyaring data location yang
--     rusak/tidak dikenal, sama seperti maksud `sale.location in counts`
--     di kode lama — lihat catatan literal di laporan §8 soal kasus
--     location bernilai string "total" yang secara harfiah juga lolos
--     `in counts` di JS tapi TIDAK PERNAH terjadi pada data nyata karena
--     kolom `sales.location` hanya diisi gudang/cideng/tegalgubug).
--   - Return shape identik: {gudang, cideng, tegalgubug, total} (integer).
--   - Kalau terjadi error di level query, fungsi client TETAP
--     mengembalikan objek nol (lihat perubahan di api.js), bukan
--     melempar exception ke pemanggil — konsisten dengan try/catch lama.
--
-- Idempotent: CREATE OR REPLACE FUNCTION aman dijalankan berkali-kali.
-- Tidak mengubah migration lama, tidak membuat tabel/kolom/constraint/
-- trigger/view baru, tidak mengimplementasikan RPC lain.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_sales_summary_by_product(p_kode text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sale        record;
  v_item        jsonb;
  v_warna_elem  jsonb;
  v_qty         numeric;
  v_wqty        numeric;
  v_gudang      numeric := 0;
  v_cideng      numeric := 0;
  v_tegalgubug  numeric := 0;
  v_total       numeric := 0;
BEGIN
  -- Sama seperti query lama: hanya baris type='sale', dibatasi 10.000
  -- baris (lihat catatan di atas kenapa limit ini dipertahankan).
  FOR v_sale IN
    SELECT location, items
    FROM sales
    WHERE type = 'sale'
    LIMIT 10000
  LOOP
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_sale.items, '[]'::jsonb))
    LOOP
      -- item.kode === kode (kalau item tidak punya field kode, ->> jadi
      -- NULL, IS DISTINCT FROM memastikan itu dianggap tidak cocok,
      -- sama seperti undefined === kode -> false di JS)
      IF (v_item ->> 'kode') IS DISTINCT FROM p_kode THEN
        CONTINUE;
      END IF;

      IF jsonb_typeof(v_item -> 'warna') = 'array' THEN
        -- qty = item.warna.reduce((s,w) => s + (w.qty ?? 0), 0)
        v_qty := 0;
        FOR v_warna_elem IN SELECT * FROM jsonb_array_elements(v_item -> 'warna')
        LOOP
          BEGIN
            v_wqty := COALESCE((v_warna_elem ->> 'qty')::numeric, 0);
          EXCEPTION WHEN OTHERS THEN
            -- Nilai qty tidak bisa dibaca sebagai angka -> anggap 0,
            -- persis seperti `w.qty ?? 0` yang tidak pernah error di JS.
            v_wqty := 0;
          END;
          v_qty := v_qty + v_wqty;
        END LOOP;
      ELSE
        -- qty = Number(item.qty) || 0
        BEGIN
          v_qty := COALESCE((v_item ->> 'qty')::numeric, 0);
        EXCEPTION WHEN OTHERS THEN
          v_qty := 0;
        END;
      END IF;

      IF v_qty > 0 AND v_sale.location IN ('gudang', 'cideng', 'tegalgubug') THEN
        IF v_sale.location = 'gudang' THEN
          v_gudang := v_gudang + v_qty;
        ELSIF v_sale.location = 'cideng' THEN
          v_cideng := v_cideng + v_qty;
        ELSIF v_sale.location = 'tegalgubug' THEN
          v_tegalgubug := v_tegalgubug + v_qty;
        END IF;
        v_total := v_total + v_qty;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'gudang', v_gudang::int,
    'cideng', v_cideng::int,
    'tegalgubug', v_tegalgubug::int,
    'total', v_total::int
  );
END;
$$;

-- Hanya user yang sudah login (admin) yang membutuhkan/berhak memanggil
-- ini — sama seperti RLS SELECT `sales` yang sudah membatasi ke role
-- authenticated (anon tidak punya akses SELECT ke sales sama sekali).
GRANT EXECUTE ON FUNCTION public.get_sales_summary_by_product(text) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_sales_summary_by_product';
--
-- Cek grant:
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'get_sales_summary_by_product';
--
-- Bandingkan manual dengan hasil lama untuk satu kode produk:
-- SELECT public.get_sales_summary_by_product('D-01-OSK');
