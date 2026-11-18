-- Admin: "seharusnya itu saat ini kan untuk semua lokasi, ini agak
-- bingung... bisa ga seharusnya ada di cideng sekian, seharusnya ada di
-- tg sekian, seharusnya ada di gudang sekian".
--
-- REVISI (segera setelah itu, admin: "untuk saat ini, 'seharusnya' karena
-- sudah dilakukan SO dan sedang freeze stok, buat seharusnya di cideng
-- dan tg bikin dari situ dulu ya, nanti nextnya baru dari transfer
-- seperti sekarang"): draft pertama migrasi ini sempat replay SELURUH
-- histori transfer approved dari kapanpun sebagai dasar "seharusnya"
-- cideng/tegalgubug -- ketahuan di validasi kalau histori lama (sebelum
-- fitur transfer-tracking ini ada) bisa bikin satu lokasi "negatif" lalu
-- di-clamp 0 (lihat D-060-ZUR TAUPE). Karena Stok Opname BARU SAJA selesai
-- (ground truth, stok lagi "freeze"), lebih benar kalau tiap kode/size/
-- warna di-ANCHOR ke stok aktual SAAT INI per lokasi (expected_stok.
-- baseline_*), dicatat kapan (baseline_at) -- mulai sekarang "seharusnya"
-- = baseline + transfer/terjual/dikirim yang terjadi SETELAH baseline_at
-- saja, BUKAN replay dari awal waktu lagi. Baris yang belum pernah
-- di-anchor (baseline_at null, mis. produk baru sesudah migrasi ini)
-- fallback ke model lama (gudang dapat penuh `expected`, lainnya 0).

alter table expected_stok
  add column if not exists baseline_gudang integer,
  add column if not exists baseline_cideng integer,
  add column if not exists baseline_tegalgubug integer,
  add column if not exists baseline_ngorder integer,
  add column if not exists baseline_at timestamptz;

comment on column expected_stok.baseline_at is 'Kapan baseline_* di-"freeze" dari stok aktual (biasanya tepat setelah Stok Opname) -- seharusnya per lokasi dihitung dari sini + delta transfer/terjual/dikirim SETELAH tanggal ini, bukan replay histori dari awal waktu.';

-- Anchor SEKALI untuk semua kode/size/warna yang ada di stok_warna saat
-- migrasi ini dijalankan, ke nilai aktualnya sekarang (SO baru saja
-- selesai) -- expected_qty (combined, dari input manual admin di Buku
-- Potongan) TIDAK disentuh.
insert into expected_stok (kode, size, warna, expected_qty, baseline_gudang, baseline_cideng, baseline_tegalgubug, baseline_ngorder, baseline_at, updated_at)
select kode, size, warna, 0, gudang, cideng, tegalgubug, ngorder, now(), now()
from stok_warna
on conflict (kode, size, warna) do update
set baseline_gudang = excluded.baseline_gudang,
    baseline_cideng = excluded.baseline_cideng,
    baseline_tegalgubug = excluded.baseline_tegalgubug,
    baseline_ngorder = excluded.baseline_ngorder,
    baseline_at = excluded.baseline_at,
    updated_at = now();

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
    SELECT kode, size, COALESCE(warna, '_') AS warna, COALESCE(expected_qty, 0) AS expected,
           baseline_gudang, baseline_cideng, baseline_tegalgubug, baseline_ngorder, baseline_at
    FROM expected_stok
  ),
  sold_loc_items AS (
    SELECT s.created_at AS at, s.location AS loc, item ->> 'kode' AS kode, item ->> 'size' AS size,
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
  dikirim_loc_items AS (
    SELECT k.updated_at AS at, k.location AS loc, item ->> 'kode' AS kode, item ->> 'size' AS size,
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
  transfer_flow AS (
    SELECT t.approved_at AS at, t.from_location AS loc, item ->> 'kode' AS kode, item ->> 'size' AS size,
           COALESCE(item ->> 'warna', '_') AS warna,
           -COALESCE((item ->> 'qty')::numeric, 0) AS signed_qty
    FROM transfers t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) AS item
    WHERE t.status = 'approved'
    UNION ALL
    SELECT t.approved_at, t.to_location, item ->> 'kode', item ->> 'size', COALESCE(item ->> 'warna', '_'),
           COALESCE((item ->> 'qty')::numeric, 0)
    FROM transfers t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.items, '[]'::jsonb)) AS item
    WHERE t.status = 'approved'
  ),
  locs AS (
    SELECT unnest(ARRAY['gudang', 'cideng', 'tegalgubug', 'ngorder']) AS loc
  ),
  per_row_loc AS (
    SELECT e.kode, e.size, e.warna, l.loc,
      CASE WHEN e.baseline_at IS NOT NULL THEN
        GREATEST(0,
          (CASE l.loc
             WHEN 'gudang' THEN COALESCE(e.baseline_gudang, 0)
             WHEN 'cideng' THEN COALESCE(e.baseline_cideng, 0)
             WHEN 'tegalgubug' THEN COALESCE(e.baseline_tegalgubug, 0)
             WHEN 'ngorder' THEN COALESCE(e.baseline_ngorder, 0)
           END)
          + COALESCE((SELECT SUM(tf.signed_qty) FROM transfer_flow tf
                      WHERE tf.kode = e.kode AND tf.size = e.size AND tf.warna = e.warna AND tf.loc = l.loc
                        AND tf.at > e.baseline_at), 0)
          - COALESCE((SELECT SUM(si.signed_qty) FROM sold_loc_items si
                      WHERE si.kode = e.kode AND si.size = e.size AND si.warna = e.warna AND si.loc = l.loc
                        AND si.at > e.baseline_at), 0)
          - COALESCE((SELECT SUM(di.qty) FROM dikirim_loc_items di
                      WHERE di.kode = e.kode AND di.size = e.size AND di.warna = e.warna AND di.loc = l.loc
                        AND di.at > e.baseline_at), 0)
        )
      ELSE
        GREATEST(0,
          (CASE WHEN l.loc = 'gudang' THEN e.expected ELSE 0 END)
          + COALESCE((SELECT SUM(tf.signed_qty) FROM transfer_flow tf
                      WHERE tf.kode = e.kode AND tf.size = e.size AND tf.warna = e.warna AND tf.loc = l.loc), 0)
          - COALESCE((SELECT SUM(si.signed_qty) FROM sold_loc_items si
                      WHERE si.kode = e.kode AND si.size = e.size AND si.warna = e.warna AND si.loc = l.loc), 0)
          - COALESCE((SELECT SUM(di.qty) FROM dikirim_loc_items di
                      WHERE di.kode = e.kode AND di.size = e.size AND di.warna = e.warna AND di.loc = l.loc), 0)
        )
      END AS seharusnya
    FROM e
    CROSS JOIN locs l
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
