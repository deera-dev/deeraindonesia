-- get_product_badges(p_days)
-- Lencana produk istimewa (Denny 2026-10-16): SATU kategori = SATU produk,
-- satu produk maksimal satu lencana (urutan prioritas = urutan array `cats`).
-- Semua logika di backend; frontend hanya membaca hasil jsonb {kode: kunci}.
--   terlaris      : penjualan bersih terbanyak (dalam periode)
--   cepat_habis   : >=5 terjual & >=80% dari potongan sudah terjual; skor = terjual / hari sejak produksi pertama
--   paling_untung : total margin riil terbesar (harga - alokasi diskon - HPP) dalam periode
--   margin_tinggi : persentase margin riil tertinggi (min. 3 terjual)
--   hampir_habis  : laku (>=3 terjual) & stok tinggal 1-5
--   terbaru       : produk berfoto dengan produksi pertama paling baru
--   kurang_jalan  : stok ada, umur >=30 hari, terjual paling sedikit
-- p_days NULL = sepanjang waktu. Potongan = expected_stok (buku potongan).
CREATE OR REPLACE FUNCTION public.get_product_badges(p_days integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  stats jsonb;
  result jsonb := '{}'::jsonb;
  taken text[] := '{}';
  cats text[] := ARRAY['terlaris','cepat_habis','paling_untung','margin_tinggi','hampir_habis','terbaru','kurang_jalan'];
  cat text;
  pick text;
BEGIN
  WITH item_rows AS (
    SELECT
      s.id AS sale_id,
      COALESCE(s.discount, 0) AS discount,
      item ->> 'kode' AS kode,
      (p_days IS NULL OR s.date >= current_date - p_days) AS in_period,
      CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END AS sign,
      COALESCE(
        CASE
          WHEN jsonb_typeof(item -> 'warna') = 'array' AND jsonb_array_length(item -> 'warna') > 0
            THEN (SELECT SUM(COALESCE((w ->> 'qty')::numeric, 0)) FROM jsonb_array_elements(item -> 'warna') w)
          ELSE COALESCE((item ->> 'qty')::numeric, 0)
        END, 0) AS q,
      COALESCE((item ->> 'harga')::numeric, 0) AS harga,
      COALESCE(NULLIF((item ->> 'hpp')::numeric, 0), pr.hpp, 0) AS hpp
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
    LEFT JOIN products pr ON pr.kode = item ->> 'kode'
    WHERE s.type IN ('sale', 'retur') AND item ->> 'kode' IS NOT NULL
  ),
  with_disc AS (
    SELECT *,
      q * harga AS rev,
      discount * (q * harga) / NULLIF(SUM(q * harga) OVER (PARTITION BY sale_id), 0) AS disc
    FROM item_rows
  ),
  sold AS (
    SELECT kode,
      SUM(sign * q) AS sold_all,
      COALESCE(SUM(sign * q) FILTER (WHERE in_period), 0) AS sold_p,
      COALESCE(SUM(sign * (rev - COALESCE(disc, 0) - q * hpp)) FILTER (WHERE in_period), 0) AS margin_p,
      COALESCE(SUM(sign * (rev - COALESCE(disc, 0))) FILTER (WHERE in_period), 0) AS rev_p
    FROM with_disc GROUP BY kode
  ),
  stok AS (
    SELECT kode, SUM(COALESCE(gudang,0) + COALESCE(cideng,0) + COALESCE(tegalgubug,0)) AS stock
    FROM stok_warna GROUP BY kode
  ),
  potongan AS (SELECT kode, SUM(expected_qty) AS potong FROM expected_stok GROUP BY kode),
  batch AS (SELECT kode_produk AS kode, MIN(tanggal_produksi) AS first_prod FROM produksi_batch GROUP BY kode_produk),
  base AS (
    SELECT
      p.kode,
      (p.image IS NOT NULL AND p.image <> '') AS has_image,
      COALESCE(so.sold_all, 0) AS sold_all,
      COALESCE(so.sold_p, 0) AS sold_p,
      COALESCE(so.margin_p, 0) AS margin_p,
      COALESCE(so.rev_p, 0) AS rev_p,
      COALESCE(st.stock, 0) AS stock,
      COALESCE(NULLIF(po.potong, 0), COALESCE(so.sold_all, 0) + COALESCE(st.stock, 0)) AS produced,
      COALESCE(b.first_prod, p.created_at::date) AS first_prod
    FROM products p
    LEFT JOIN sold so ON so.kode = p.kode
    LEFT JOIN stok st ON st.kode = p.kode
    LEFT JOIN potongan po ON po.kode = p.kode
    LEFT JOIN batch b ON b.kode = p.kode
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO stats
  FROM (
    SELECT kode, has_image, sold_all, sold_p, margin_p, rev_p, stock,
      sold_all / NULLIF(produced, 0) AS sell_through,
      sold_all / GREATEST(1, current_date - first_prod) AS velocity,
      margin_p / NULLIF(rev_p, 0) AS margin_pct,
      (current_date - first_prod) AS days,
      extract(epoch FROM first_prod::timestamp) AS first_prod_ts
    FROM base
  ) x;

  FOREACH cat IN ARRAY cats LOOP
    SELECT t.kode INTO pick
    FROM jsonb_to_recordset(stats) AS t(
      kode text, has_image boolean, sold_all numeric, sold_p numeric, margin_p numeric, rev_p numeric,
      stock numeric, sell_through numeric, velocity numeric, margin_pct numeric, days numeric, first_prod_ts numeric)
    WHERE NOT (t.kode = ANY(taken))
      AND CASE cat
        WHEN 'terlaris'      THEN t.sold_p >= 1
        WHEN 'cepat_habis'   THEN t.sold_all >= 5 AND COALESCE(t.sell_through, 0) >= 0.8
        WHEN 'paling_untung' THEN t.margin_p > 0
        WHEN 'margin_tinggi' THEN t.sold_p >= 3 AND COALESCE(t.margin_pct, 0) > 0
        WHEN 'hampir_habis'  THEN t.sold_p >= 3 AND t.stock BETWEEN 1 AND 5
        WHEN 'terbaru'       THEN t.has_image
        WHEN 'kurang_jalan'  THEN t.stock > 0 AND t.days >= 30
      END
    ORDER BY CASE cat
        WHEN 'terlaris'      THEN t.sold_p
        WHEN 'cepat_habis'   THEN t.velocity
        WHEN 'paling_untung' THEN t.margin_p
        WHEN 'margin_tinggi' THEN t.margin_pct
        WHEN 'hampir_habis'  THEN t.sold_p - t.stock
        WHEN 'terbaru'       THEN t.first_prod_ts
        WHEN 'kurang_jalan'  THEN -(t.sold_p * 1000) + t.stock
      END DESC NULLS LAST, t.kode
    LIMIT 1;

    IF pick IS NOT NULL THEN
      taken := taken || pick;
      result := result || jsonb_build_object(pick, cat);
    END IF;
    pick := NULL;
  END LOOP;

  RETURN result;
END;
$function$;
