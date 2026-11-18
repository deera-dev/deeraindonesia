-- Keep yang sudah "terkirim" (barang sudah keluar & stok_warna sudah
-- dikurangi via useKeepFulfillment, lihat apps/pos/src/features/keep/
-- hooks.js, TAPI belum dibayar) sebelumnya TIDAK dihitung sbg "terjual" di
-- mana pun — get_sold_summary_by_variant() cuma baca tabel `sales`, dan
-- keep baru masuk `sales` begitu dibayar (usePayKeep). Akibatnya selama
-- keep masih "terkirim" (barang sudah fisik keluar dari rak, tapi belum
-- dibayar pembeli), Buku Potongan (get_buku_potongan(), formula
-- "stok + terjual - expected") kelihatan kurang persis sebesar qty keep
-- itu — admin: "kalau udah dikirim, masuk ke terjual stoknya, karena keep
-- kita yang sebelum dibuat fitur baru ini, angka stoknya jadi ga jelas
-- kemana".
--
-- Fix: get_sold_summary_by_variant() sekarang UNION dari 2 sumber — sales
-- (seperti sebelumnya) + keep_orders yang statusnya PERSIS "terkirim".
-- Keep "lunas" SENGAJA dikecualikan (sudah terhitung lewat baris `sales`
-- yang dibuat usePayKeep() saat dibayar — kalau ikut dihitung di sini juga
-- akan dobel). Keep "batal"/"aktif" juga dikecualikan (stok belum/sudah
-- dikembalikan, belum pernah "terjual"). Dipakai juga oleh
-- check_stok_semua()/plan_overflow_size() (Stok Opname, warning
-- non-blocking "stok+terjual melebihi produksi") TIDAK diubah di migrasi
-- ini — keduanya query `sales` sendiri secara terpisah (bukan lewat RPC
-- ini), dan efek keep terkirim di sana reduced actual stok (bukan sold)
-- cuma mengurangi angka, tidak pernah membuat warning salah nongol
-- (conservative), jadi bukan sumber kebingungan yang sama.
create or replace function public.get_sold_summary_by_variant()
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  with source_rows as (
    select type as sale_type, items from sales where type in ('sale', 'retur')
    union all
    select 'sale'::text as sale_type, items from keep_orders where status = 'terkirim'
  ),
  item_rows AS (
    SELECT
      sr.sale_type,
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
    FROM source_rows sr
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sr.items, '[]'::jsonb)) AS item
    LEFT JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(item -> 'warna') = 'array' THEN item -> 'warna' ELSE '[null]'::jsonb END
    ) AS warna_elem ON true
  ),
  signed AS (
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
$function$;
