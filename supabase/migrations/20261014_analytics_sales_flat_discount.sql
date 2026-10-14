-- Analytics: sales_flat() sekarang memperhitungkan DISKON tingkat transaksi.
--
-- Sebelumnya revenue = qty * harga (harga penuh) sehingga total Analytics
-- LEBIH BESAR dari Laporan POS (yang memakai sales.total = subtotal - diskon).
-- Sekarang diskon (sales.discount, hanya type='sale') dibagi proporsional ke
-- tiap baris item menurut porsi harga-penuhnya, jadi SUM(revenue) per transaksi
-- == sales.total dan profit ikut turun sebesar diskon.
-- Retur tidak diubah: ReturModal sudah menyimpan harga retur NET diskon.
-- Kolom `harga` tetap harga satuan penuh (dipakai ranking/min/max harga jual).
-- Signature fungsi tidak berubah -> semua RPC analytics turunan otomatis benar.

CREATE OR REPLACE FUNCTION public.sales_flat(p_from date, p_to date)
RETURNS TABLE (
  sale_id      uuid,
  tanggal      date,
  location     text,
  type         text,
  pelanggan_id uuid,
  kode         text,
  warna        text,
  qty          numeric,
  harga        numeric,
  hpp          numeric,
  revenue      numeric,
  profit       numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH rows AS (
    SELECT
      s.id AS sale_id,
      s.date AS tanggal,
      s.location,
      s.type,
      s.pelanggan_id,
      item ->> 'kode' AS kode,
      w.warna,
      (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END)::numeric AS sign,
      w.qty AS qty_abs,
      COALESCE((item ->> 'harga')::numeric, 0) AS harga,
      COALESCE((item ->> 'hpp')::numeric, 0) AS hpp,
      CASE WHEN s.type = 'sale' THEN COALESCE(s.discount, 0) ELSE 0 END AS discount
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
    CROSS JOIN LATERAL (
      SELECT
        welem ->> 'nama' AS warna,
        COALESCE((welem ->> 'qty')::numeric, 0) AS qty
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(item -> 'warna') = 'array'
               AND jsonb_array_length(item -> 'warna') > 0
            THEN item -> 'warna'
          ELSE jsonb_build_array(jsonb_build_object('nama', NULL, 'qty', item -> 'qty'))
        END
      ) AS welem
    ) w
    WHERE s.date BETWEEN p_from AND p_to
  ),
  scaled AS (
    SELECT r.*,
      SUM(r.qty_abs * r.harga) OVER (PARTITION BY r.sale_id) AS sale_gross
    FROM rows r
  )
  SELECT
    sale_id, tanggal, location, type, pelanggan_id, kode, warna,
    sign * qty_abs,
    harga,
    hpp,
    sign * qty_abs * harga
      * (1 - CASE WHEN sale_gross > 0 THEN LEAST(1, discount / sale_gross) ELSE 0 END),
    sign * qty_abs * harga
      * (1 - CASE WHEN sale_gross > 0 THEN LEAST(1, discount / sale_gross) ELSE 0 END)
      - sign * qty_abs * hpp
  FROM scaled;
$$;

GRANT EXECUTE ON FUNCTION public.sales_flat(date, date) TO authenticated;
