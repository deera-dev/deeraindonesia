-- Admin minta kategori "Dikirim" dipisah jelas dari "Terjual" di Buku
-- Potongan, bukan digabung diam-diam (lihat migrasi sebelumnya,
-- get_sold_summary_by_variant_include_keep_terkirim) — supaya diferensiasi
-- antara "sudah lunas" vs "sudah keluar tapi belum lunas" tetap kelihatan.
-- Rumus baru: stok + dikirim + terjual - expected = selisih (sebelumnya
-- stok + terjual - expected, dengan terjual sempat ikut menghitung keep
-- terkirim).

-- 1) Kembalikan get_sold_summary_by_variant() ke definisi ASLI (sales
-- saja) -- "terjual" sekarang murni dari tabel sales lagi.
create or replace function public.get_sold_summary_by_variant()
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
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

-- 2) RPC baru -- total keep yang "terkirim" (sudah keluar, belum lunas)
-- per kode/size/warna, bentuk jsonb sama persis dgn
-- get_sold_summary_by_variant() supaya gampang dipasangkan di get_buku_potongan().
-- Keep "lunas" TIDAK dihitung di sini (sudah masuk tabel sales lewat
-- usePayKeep saat dibayar, terhitung lewat get_sold_summary_by_variant
-- di atas) -- kalau ikut dihitung juga di sini jadi dobel. "batal"/"aktif"
-- juga tidak dihitung (stok belum/sudah dikembalikan, belum pernah keluar
-- scr permanen).
create or replace function public.get_keep_terkirim_summary_by_variant()
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  WITH item_rows AS (
    SELECT
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
    FROM keep_orders k
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(k.items, '[]'::jsonb)) AS item
    LEFT JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(item -> 'warna') = 'array' THEN item -> 'warna' ELSE '[null]'::jsonb END
    ) AS warna_elem ON true
    WHERE k.status = 'terkirim'
  ),
  per_variant AS (
    SELECT kode, size, warna, SUM(qty)::int AS net_qty
    FROM item_rows
    WHERE kode IS NOT NULL AND kode <> '' AND size IS NOT NULL AND size <> '' AND qty > 0
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

-- 3) get_buku_potongan() -- tambah "dikirim" di tiap level (rows/sizes/kodes),
-- "seharusnya" sekarang expected - sold - dikirim.
create or replace function public.get_buku_potongan()
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  WITH sold AS (
    SELECT a.key1 AS kode, b.key2 AS size, c.key3 AS warna, c.v::int AS sold
    FROM jsonb_each(public.get_sold_summary_by_variant()) a(key1, val1),
         jsonb_each(a.val1) b(key2, val2),
         jsonb_each_text(b.val2) c(key3, v)
  ),
  dikirim AS (
    SELECT a.key1 AS kode, b.key2 AS size, c.key3 AS warna, c.v::int AS dikirim
    FROM jsonb_each(public.get_keep_terkirim_summary_by_variant()) a(key1, val1),
         jsonb_each(a.val1) b(key2, val2),
         jsonb_each_text(b.val2) c(key3, v)
  ),
  e AS (
    SELECT kode, size, COALESCE(warna, '_') AS warna, COALESCE(expected_qty, 0) AS expected
    FROM expected_stok
  ),
  per_row AS (
    SELECT e.kode, e.size, e.warna, e.expected,
           COALESCE(s.sold, 0) AS sold,
           COALESCE(d.dikirim, 0) AS dikirim
    FROM e
    LEFT JOIN sold s ON s.kode = e.kode AND s.size = e.size AND s.warna = e.warna
    LEFT JOIN dikirim d ON d.kode = e.kode AND d.size = e.size AND d.warna = e.warna
  ),
  per_size AS (
    SELECT e.kode, e.size,
           SUM(e.expected)::int AS expected,
           COALESCE((SELECT SUM(s.sold) FROM sold s WHERE s.kode = e.kode AND s.size = e.size), 0)::int AS sold,
           COALESCE((SELECT SUM(d.dikirim) FROM dikirim d WHERE d.kode = e.kode AND d.size = e.size), 0)::int AS dikirim
    FROM (SELECT kode, size, SUM(expected) AS expected FROM e GROUP BY kode, size) e
    GROUP BY e.kode, e.size, e.expected
  ),
  per_kode AS (
    SELECT kode, SUM(expected)::int AS expected, SUM(sold)::int AS sold, SUM(dikirim)::int AS dikirim
    FROM per_size GROUP BY kode
  )
  SELECT jsonb_build_object(
    'rows', COALESCE((SELECT jsonb_object_agg(kode || '__' || size || '__' || warna,
        jsonb_build_object('expected', expected, 'sold', sold, 'dikirim', dikirim, 'seharusnya', GREATEST(0, expected - sold - dikirim))) FROM per_row), '{}'::jsonb),
    'sizes', COALESCE((SELECT jsonb_object_agg(kode || '__' || size,
        jsonb_build_object('expected', expected, 'sold', sold, 'dikirim', dikirim, 'seharusnya', GREATEST(0, expected - sold - dikirim))) FROM per_size), '{}'::jsonb),
    'kodes', COALESCE((SELECT jsonb_object_agg(kode,
        jsonb_build_object('expected', expected, 'sold', sold, 'dikirim', dikirim, 'seharusnya', GREATEST(0, expected - sold - dikirim))) FROM per_kode), '{}'::jsonb)
  );
$function$;
