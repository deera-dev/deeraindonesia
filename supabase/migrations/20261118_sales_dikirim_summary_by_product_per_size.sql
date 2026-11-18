-- Admin: "1 kode ada beberapa yang punya lebih dari 1 ukuran, nah itu
-- juga jangan digabung ya, terpisah stoknya" -- get_sales_summary_by_product
-- & get_keep_terkirim_summary_by_product (dipakai ProductDetailModal utk
-- kartu Stok/Terjual/Dikirim/Produksi) sebelumnya menjumlahkan SEMUA
-- ukuran suatu kode jadi 1 angka, padahal 1 kode bisa punya >1 ukuran
-- (mis. Midi + Gamis) dgn stok/produksi yang sama sekali independen.
-- Sekarang dikelompokkan per ukuran juga: {size: {gudang, cideng,
-- tegalgubug, total}}. stok.sizes (get_stock_summary) & producedBySize
-- (get_produced_by_kode, kalau ada) sudah lama per-size -- ini
-- menyusulkan sales & dikirim biar konsisten.
create or replace function public.get_sales_summary_by_product(p_kode text)
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  WITH item_rows AS (
    SELECT s.location AS loc, item ->> 'size' AS size,
      CASE
        WHEN jsonb_typeof(item -> 'warna') = 'array' THEN
          (SELECT COALESCE(SUM(COALESCE((w ->> 'qty')::numeric, 0)), 0)
           FROM jsonb_array_elements(item -> 'warna') w)
        ELSE COALESCE((item ->> 'qty')::numeric, 0)
      END AS qty
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
    WHERE s.type = 'sale' AND (item ->> 'kode') = p_kode
  ),
  per_size_loc AS (
    SELECT size, loc, SUM(qty)::int AS qty
    FROM item_rows
    WHERE loc IN ('gudang', 'cideng', 'tegalgubug') AND qty > 0 AND size IS NOT NULL
    GROUP BY size, loc
  ),
  per_size AS (
    SELECT size,
      COALESCE(SUM(qty) FILTER (WHERE loc = 'gudang'), 0)::int AS gudang,
      COALESCE(SUM(qty) FILTER (WHERE loc = 'cideng'), 0)::int AS cideng,
      COALESCE(SUM(qty) FILTER (WHERE loc = 'tegalgubug'), 0)::int AS tegalgubug,
      SUM(qty)::int AS total
    FROM per_size_loc
    GROUP BY size
  )
  SELECT COALESCE(jsonb_object_agg(size, jsonb_build_object(
      'gudang', gudang, 'cideng', cideng, 'tegalgubug', tegalgubug, 'total', total
    )), '{}'::jsonb)
  FROM per_size;
$function$;

create or replace function public.get_keep_terkirim_summary_by_product(p_kode text)
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  WITH item_rows AS (
    SELECT k.location AS loc, item ->> 'size' AS size,
      CASE
        WHEN jsonb_typeof(item -> 'warna') = 'array' THEN
          (SELECT COALESCE(SUM(COALESCE((w ->> 'qty')::numeric, 0)), 0)
           FROM jsonb_array_elements(item -> 'warna') w)
        ELSE COALESCE((item ->> 'qty')::numeric, 0)
      END AS qty
    FROM keep_orders k
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(k.items, '[]'::jsonb)) AS item
    WHERE k.status = 'terkirim' AND (item ->> 'kode') = p_kode
  ),
  per_size_loc AS (
    SELECT size, loc, SUM(qty)::int AS qty
    FROM item_rows
    WHERE loc IN ('gudang', 'cideng', 'tegalgubug') AND qty > 0 AND size IS NOT NULL
    GROUP BY size, loc
  ),
  per_size AS (
    SELECT size,
      COALESCE(SUM(qty) FILTER (WHERE loc = 'gudang'), 0)::int AS gudang,
      COALESCE(SUM(qty) FILTER (WHERE loc = 'cideng'), 0)::int AS cideng,
      COALESCE(SUM(qty) FILTER (WHERE loc = 'tegalgubug'), 0)::int AS tegalgubug,
      SUM(qty)::int AS total
    FROM per_size_loc
    GROUP BY size
  )
  SELECT COALESCE(jsonb_object_agg(size, jsonb_build_object(
      'gudang', gudang, 'cideng', cideng, 'tegalgubug', tegalgubug, 'total', total
    )), '{}'::jsonb)
  FROM per_size;
$function$;
