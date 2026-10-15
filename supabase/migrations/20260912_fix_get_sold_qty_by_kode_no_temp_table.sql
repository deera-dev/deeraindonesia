-- Fix: STABLE function tidak boleh CREATE TABLE (termasuk TEMP TABLE) —
-- ditulis ulang jadi pure SQL (CTE + LATERAL) tanpa DDL apa pun, defensif
-- terhadap qty non-numerik pakai regex check (pengganti BEGIN/EXCEPTION
-- yang tidak tersedia di LANGUAGE sql).
CREATE OR REPLACE FUNCTION public.get_sold_qty_by_kode(p_kode text)
RETURNS TABLE (size text, warna text, qty integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH matched AS (
    SELECT item
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
    WHERE s.type = 'sale'
      AND (item ->> 'kode') = p_kode
    LIMIT 100000
  ),
  flat_rows AS (
    SELECT
      COALESCE(item ->> 'size', '') AS size,
      COALESCE(item ->> 'warna', '_') AS warna,
      CASE WHEN (item ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item ->> 'qty')::numeric ELSE 0 END AS qty
    FROM matched
    WHERE jsonb_typeof(item -> 'warna') IS DISTINCT FROM 'array'
  ),
  array_rows AS (
    SELECT
      COALESCE(item ->> 'size', '') AS size,
      COALESCE(w ->> 'warna', '_') AS warna,
      CASE WHEN (w ->> 'qty') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (w ->> 'qty')::numeric ELSE 0 END AS qty
    FROM matched
    CROSS JOIN LATERAL jsonb_array_elements(item -> 'warna') AS w
    WHERE jsonb_typeof(item -> 'warna') = 'array'
  ),
  combined AS (
    SELECT * FROM flat_rows
    UNION ALL
    SELECT * FROM array_rows
  )
  SELECT size, warna, SUM(qty)::int AS qty
  FROM combined
  WHERE qty > 0
  GROUP BY size, warna;
$$;

GRANT EXECUTE ON FUNCTION public.get_sold_qty_by_kode(text) TO authenticated;
