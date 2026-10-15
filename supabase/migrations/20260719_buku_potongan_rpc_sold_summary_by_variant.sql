-- ============================================================
-- Buku Potongan — RPC get_sold_summary_by_variant()
--
-- Tujuan: memperbaiki logika rekonsiliasi di halaman Buku Potongan
-- (apps/admin/src/features/buku-potongan). Sebelumnya halaman ini
-- membandingkan `expected_stok.expected_qty` (jumlah kumulatif hasil
-- produksi/potong, lihat komentar `expected_stok` di
-- apps/admin/src/features/produksi-record/api.js dan di
-- apps/admin/src/features/analytics/components/tabs/InventoryTab.jsx)
-- HANYA dengan `stok_warna` (stok yang BELUM terjual). Begitu satu unit
-- laku terjual, "stok saat ini" turun tapi "expected" tetap, sehingga
-- selisih akan SELALU menyimpang walau tidak ada kesalahan nyata —
-- laporan Denny (percakapan 2026-07-19).
--
-- Perbaikan: bandingkan expected_qty dengan (stok tersisa + terjual
-- bersih), bukan stok tersisa saja. RPC ini menghitung "terjual bersih"
-- (penjualan dikurangi retur) per kode+size+warna, seluruh histori
-- (sama seperti expected_qty yang juga tidak dibatasi tanggal — itu
-- angka kumulatif sejak produk pertama kali diproduksi).
--
-- Kenapa RPC (bukan tarik tabel `sales` ke client lalu dijumlah di JS):
-- kodebase ini SUDAH PERNAH punya masalah persis ini dan sudah
-- diperbaiki jadi RPC (lihat
-- 20260711_migration_phase1_rpc_sales_summary_by_product.sql — dulu
-- menarik hingga 10.000 baris `sales` ke client untuk 1 angka). RPC
-- itu TIDAK dipakai ulang di sini karena beda kebutuhan: RPC lama
-- group by LOKASI (bukan size/warna) dan SENGAJA tidak mengurangi
-- retur (retur "tidak dihitung" di sana, karena tujuannya riwayat
-- penjualan kotor per produk). Di sini retur JUSTRU HARUS dikurangkan:
-- barang retur kembali ke rak (masuk lagi ke `stok_warna` via delta
-- positif — lihat apps/pos/src/features/penjualan/hooks.js), jadi kalau
-- retur tidak dikurangkan dari "terjual", 1 unit fisik akan terhitung
-- DUA KALI (sekali di "stok saat ini", sekali lagi di "terjual") dan
-- rekonsiliasi jadi salah arah (+1 palsu).
--
-- Bentuk data sales.items (dicek langsung dari data live, lihat juga
-- migration 20260711 di atas untuk kasus serupa):
--   item = {kode, size, harga, hpp, qty, warna}
--   - Produk TANPA breakdown warna: item.warna = null, qty = item.qty
--     (angka flat). Variant dianggap warna = '_' (konsisten dgn
--     stok_warna/expected_stok yang juga pakai '_' utk produk tanpa
--     warna).
--   - Produk DENGAN breakdown warna: item.warna = array
--     [{nama, qty}, ...] (field warna sendiri di dalam elemen array
--     bernama "nama", BUKAN "warna" — dicek dari data live). qty per
--     baris = elemen_warna.qty, warna = elemen_warna.nama.
--
-- Sign: type='sale' -> qty positif (mengurangi stok), type='retur' ->
-- qty NEGATIF (menambah stok balik) — arah berlawanan dari delta
-- stok_adjustments POS (di sana retur = delta positif ke stok_warna;
-- di sini "terjual bersih" = kebalikannya: retur MENGURANGI angka
-- terjual). qty <= 0 / kode / size kosong diabaikan (data rusak),
-- sama seperti validasi di RPC 20260711.
-- Cast angka aman (tidak pernah error): pola karakter numerik dicek
-- eksplisit sebelum di-cast, nilai tidak valid dianggap 0 — setara
-- exception-handler try/catch di RPC 20260711 (dulu ditulis plpgsql
-- dengan BEGIN/EXCEPTION, di sini ditulis SQL murni supaya bisa pakai
-- LATERAL join, lebih ringkas untuk kasus 2 level array bersarang).
--
-- Return shape: { [kode]: { [size]: { [warna]: net_qty } } } — nested
-- map 3 level, konsisten dgn gaya `get_stock_summary()` (migration
-- 20260711_migration_phase1_rpc_stock_summary.sql) yang juga
-- mengembalikan nested jsonb map per kode.
--
-- Idempotent: CREATE OR REPLACE FUNCTION aman dijalankan berkali-kali.
-- Tidak mengubah tabel/kolom/RPC lain yang sudah ada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_sold_summary_by_variant()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH item_rows AS (
    SELECT
      s.type AS sale_type,
      item ->> 'kode' AS kode,
      item ->> 'size' AS size,
      CASE
        WHEN jsonb_typeof(item -> 'warna') = 'array' THEN COALESCE(warna_elem ->> 'nama', '_')
        ELSE '_'
      END AS warna,
      CASE
        WHEN jsonb_typeof(item -> 'warna') = 'array' THEN
          CASE WHEN (warna_elem ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (warna_elem ->> 'qty')::numeric ELSE 0 END
        ELSE
          CASE WHEN (item ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (item ->> 'qty')::numeric ELSE 0 END
      END AS qty
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
    LEFT JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(item -> 'warna') = 'array' THEN item -> 'warna' ELSE '[null]'::jsonb END
    ) AS warna_elem ON true
    WHERE s.type IN ('sale', 'retur')
  ),
  signed AS (
    -- sale -> +qty (keluar dari stok), retur -> -qty (kembali ke stok,
    -- jadi mengurangi angka "terjual bersih")
    SELECT
      kode, size, warna,
      CASE WHEN sale_type = 'sale' THEN qty ELSE -qty END AS signed_qty
    FROM item_rows
    WHERE kode IS NOT NULL AND kode <> '' AND size IS NOT NULL AND size <> '' AND qty > 0
  ),
  per_variant AS (
    SELECT kode, size, warna, SUM(signed_qty)::int AS net_qty
    FROM signed
    GROUP BY kode, size, warna
  ),
  warna_map AS (
    SELECT kode, size, jsonb_object_agg(warna, net_qty) AS warna_obj
    FROM per_variant
    GROUP BY kode, size
  ),
  size_map AS (
    SELECT kode, jsonb_object_agg(size, warna_obj) AS size_obj
    FROM warna_map
    GROUP BY kode
  )
  SELECT COALESCE(jsonb_object_agg(kode, size_obj), '{}'::jsonb)
  FROM size_map;
$$;

-- Halaman Buku Potongan hanya bisa diakses admin yang login — sama
-- seperti RLS SELECT `sales` yang sudah membatasi ke role authenticated.
GRANT EXECUTE ON FUNCTION public.get_sold_summary_by_variant() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_sold_summary_by_variant';
--
-- Cek grant:
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'get_sold_summary_by_variant';
--
-- Lihat hasil utk 1 kode:
-- SELECT public.get_sold_summary_by_variant() -> 'D-01-OSK';
