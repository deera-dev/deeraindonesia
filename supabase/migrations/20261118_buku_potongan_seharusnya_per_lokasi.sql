-- Admin: "seharusnya itu saat ini kan untuk semua lokasi, ini agak
-- bingung... bisa ga seharusnya ada di cideng sekian, seharusnya ada di
-- tg sekian, seharusnya ada di gudang sekian". Buku potongan fisik cuma
-- angka total (tidak dipecah per lokasi saat motong) -- pembagian ke
-- lokasi terjadi belakangan lewat Transfer. Jadi "seharusnya per lokasi"
-- dihitung dari ledger: expected (dipotong) dianggap mendarat di GUDANG
-- dulu (itu tempat barang jadi pertama kali masuk, lihat alur produksi di
-- CLAUDE.md §9), lalu tiap lokasi (termasuk gudang sendiri) bergerak lewat
-- net transfer approved (masuk +, keluar -), dikurangi terjual & dikirim
-- DI LOKASI ITU SENDIRI (bukan total gabungan). ngorder tidak pernah
-- kena sold/dikirim (bukan lokasi POS/keep, lihat marketDay.js
-- TRANSFER_LOCATIONS vs LOCATIONS) jadi cuma kena net transfer.
--
-- Invariant yang dijaga (SELAMA data historis lengkap -- bisa sedikit
-- meleset kalau ada stok lama dari sebelum fitur transfer/tracking ini
-- ada, karena tiap lokasi di-clamp GREATEST(0,...) sendiri-sendiri, lihat
-- catatan di PR): sum(seharusnya per lokasi) == seharusnya gabungan
-- (expected - sold - dikirim) KARENA net transfer selalu zero-sum lintas
-- lokasi.
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
  sold_loc_items AS (
    SELECT s.location AS loc, item ->> 'kode' AS kode, item ->> 'size' AS size,
      CASE WHEN jsonb_typeof(item -> 'warna') = 'array' THEN COALESCE(warna_elem ->> 'nama', '_') ELSE '_' END AS warna,
      (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END) *
      CASE
        WHEN jsonb_typeof(item -> 'warna') = 'array' THEN
          CASE WHEN (warna_elem ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (warna_elem ->> 'qty')::numeric ELSE 0 END
        ELSE
          CASE WHEN (item ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item ->> 'qty')::numeric ELSE 0 END
      END AS signed_qty
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
    LEFT JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(item -> 'warna') = 'array' THEN item -> 'warna' ELSE '[null]'::jsonb END
    ) AS warna_elem ON true
    WHERE s.type IN ('sale', 'retur')
  ),
  sold_loc AS (
    SELECT kode, size, warna, loc, SUM(signed_qty)::int AS sold
    FROM sold_loc_items
    WHERE kode IS NOT NULL AND kode <> '' AND size IS NOT NULL AND size <> ''
    GROUP BY kode, size, warna, loc
  ),
  dikirim_loc_items AS (
    SELECT k.location AS loc, item ->> 'kode' AS kode, item ->> 'size' AS size,
      CASE WHEN jsonb_typeof(item -> 'warna') = 'array' THEN COALESCE(warna_elem ->> 'nama', '_') ELSE '_' END AS warna,
      CASE
        WHEN jsonb_typeof(item -> 'warna') = 'array' THEN
          CASE WHEN (warna_elem ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (warna_elem ->> 'qty')::numeric ELSE 0 END
        ELSE
          CASE WHEN (item ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item ->> 'qty')::numeric ELSE 0 END
      END AS qty
    FROM keep_orders k
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(k.items, '[]'::jsonb)) AS item
    LEFT JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(item -> 'warna') = 'array' THEN item -> 'warna' ELSE '[null]'::jsonb END
    ) AS warna_elem ON true
    WHERE k.status = 'terkirim'
  ),
  dikirim_loc AS (
    SELECT kode, size, warna, loc, SUM(qty)::int AS dikirim
    FROM dikirim_loc_items
    WHERE kode IS NOT NULL AND kode <> '' AND size IS NOT NULL AND size <> ''
    GROUP BY kode, size, warna, loc
  ),
  transfer_flow AS (
    SELECT t.from_location AS loc, item ->> 'kode' AS kode, item ->> 'size' AS size,
           COALESCE(item ->> 'warna', '_') AS warna,
           -COALESCE((item ->> 'qty')::numeric, 0) AS signed_qty
    FROM transfers t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) AS item
    WHERE t.status = 'approved'
    UNION ALL
    SELECT t.to_location AS loc, item ->> 'kode', item ->> 'size', COALESCE(item ->> 'warna', '_'),
           COALESCE((item ->> 'qty')::numeric, 0)
    FROM transfers t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) AS item
    WHERE t.status = 'approved'
  ),
  transfer_loc AS (
    SELECT kode, size, warna, loc, SUM(signed_qty)::int AS net_transfer
    FROM transfer_flow
    WHERE kode IS NOT NULL AND kode <> '' AND size IS NOT NULL AND size <> ''
    GROUP BY kode, size, warna, loc
  ),
  locs AS (
    SELECT unnest(ARRAY['gudang', 'cideng', 'tegalgubug', 'ngorder']) AS loc
  ),
  per_row_loc AS (
    SELECT e.kode, e.size, e.warna, l.loc,
      GREATEST(0,
        (CASE WHEN l.loc = 'gudang' THEN e.expected ELSE 0 END)
        + COALESCE(tl.net_transfer, 0)
        - COALESCE(sl.sold, 0)
        - COALESCE(dl.dikirim, 0)
      ) AS seharusnya
    FROM e
    CROSS JOIN locs l
    LEFT JOIN sold_loc sl ON sl.kode = e.kode AND sl.size = e.size AND sl.warna = e.warna AND sl.loc = l.loc
    LEFT JOIN dikirim_loc dl ON dl.kode = e.kode AND dl.size = e.size AND dl.warna = e.warna AND dl.loc = l.loc
    LEFT JOIN transfer_loc tl ON tl.kode = e.kode AND tl.size = e.size AND tl.warna = e.warna AND tl.loc = l.loc
  ),
  row_loc_json AS (
    SELECT kode, size, warna, jsonb_object_agg(loc, jsonb_build_object('seharusnya', seharusnya)) AS by_location
    FROM per_row_loc
    GROUP BY kode, size, warna
  ),
  per_row AS (
    SELECT e.kode, e.size, e.warna, e.expected,
           COALESCE(s.sold, 0) AS sold,
           COALESCE(d.dikirim, 0) AS dikirim
    FROM e
    LEFT JOIN sold s ON s.kode = e.kode AND s.size = e.size AND s.warna = e.warna
    LEFT JOIN dikirim d ON d.kode = e.kode AND d.size = e.size AND d.warna = e.warna
  ),
  per_size_loc AS (
    SELECT kode, size, loc, SUM(seharusnya)::int AS seharusnya
    FROM per_row_loc
    GROUP BY kode, size, loc
  ),
  size_loc_json AS (
    SELECT kode, size, jsonb_object_agg(loc, jsonb_build_object('seharusnya', seharusnya)) AS by_location
    FROM per_size_loc
    GROUP BY kode, size
  ),
  per_size AS (
    SELECT e.kode, e.size,
           SUM(e.expected)::int AS expected,
           COALESCE((SELECT SUM(s.sold) FROM sold s WHERE s.kode = e.kode AND s.size = e.size), 0)::int AS sold,
           COALESCE((SELECT SUM(d.dikirim) FROM dikirim d WHERE d.kode = e.kode AND d.size = e.size), 0)::int AS dikirim
    FROM (SELECT kode, size, SUM(expected) AS expected FROM e GROUP BY kode, size) e
    GROUP BY e.kode, e.size, e.expected
  ),
  per_kode_loc AS (
    SELECT kode, loc, SUM(seharusnya)::int AS seharusnya
    FROM per_row_loc
    GROUP BY kode, loc
  ),
  kode_loc_json AS (
    SELECT kode, jsonb_object_agg(loc, jsonb_build_object('seharusnya', seharusnya)) AS by_location
    FROM per_kode_loc
    GROUP BY kode
  ),
  per_kode AS (
    SELECT kode, SUM(expected)::int AS expected, SUM(sold)::int AS sold, SUM(dikirim)::int AS dikirim
    FROM per_size GROUP BY kode
  )
  SELECT jsonb_build_object(
    'rows', COALESCE((
      SELECT jsonb_object_agg(pr.kode || '__' || pr.size || '__' || pr.warna,
        jsonb_build_object('expected', pr.expected, 'sold', pr.sold, 'dikirim', pr.dikirim,
          'seharusnya', GREATEST(0, pr.expected - pr.sold - pr.dikirim),
          'byLocation', COALESCE(rl.by_location, '{}'::jsonb)))
      FROM per_row pr
      LEFT JOIN row_loc_json rl ON rl.kode = pr.kode AND rl.size = pr.size AND rl.warna = pr.warna
    ), '{}'::jsonb),
    'sizes', COALESCE((
      SELECT jsonb_object_agg(ps.kode || '__' || ps.size,
        jsonb_build_object('expected', ps.expected, 'sold', ps.sold, 'dikirim', ps.dikirim,
          'seharusnya', GREATEST(0, ps.expected - ps.sold - ps.dikirim),
          'byLocation', COALESCE(sl.by_location, '{}'::jsonb)))
      FROM per_size ps
      LEFT JOIN size_loc_json sl ON sl.kode = ps.kode AND sl.size = ps.size
    ), '{}'::jsonb),
    'kodes', COALESCE((
      SELECT jsonb_object_agg(pk.kode,
        jsonb_build_object('expected', pk.expected, 'sold', pk.sold, 'dikirim', pk.dikirim,
          'seharusnya', GREATEST(0, pk.expected - pk.sold - pk.dikirim),
          'byLocation', COALESCE(kl.by_location, '{}'::jsonb)))
      FROM per_kode pk
      LEFT JOIN kode_loc_json kl ON kl.kode = pk.kode
    ), '{}'::jsonb)
  );
$function$;
