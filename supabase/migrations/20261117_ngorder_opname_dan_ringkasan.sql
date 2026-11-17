-- Ngorder jadi lokasi ke-4 yang bisa diisi LANGSUNG via Stok Opname
-- (persis seperti Gudang — tidak ada auto-ambil dari lokasi lain,
-- berdiri sendiri, "stok gudang ya stok gudang"). Fungsi di bawah ini
-- cuma memastikan ngorder ikut terhitung di ringkasan stok per produk
-- (get_stock_summary) — tidak ada perubahan skema/kolom lagi di sini
-- (kolom stok_warna.ngorder sudah dibuat di 20261117_stok_ngorder.sql).

create or replace function public.get_stock_summary()
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  WITH per_size AS (
    SELECT
      kode,
      size,
      COALESCE(SUM(gudang), 0)::int AS gudang,
      COALESCE(SUM(cideng), 0)::int AS cideng,
      COALESCE(SUM(tegalgubug), 0)::int AS tegalgubug,
      COALESCE(SUM(ngorder), 0)::int AS ngorder
    FROM stok_warna
    GROUP BY kode, size
  ),
  per_kode AS (
    SELECT
      kode,
      COALESCE(SUM(gudang), 0)::int AS gudang,
      COALESCE(SUM(cideng), 0)::int AS cideng,
      COALESCE(SUM(tegalgubug), 0)::int AS tegalgubug,
      COALESCE(SUM(ngorder), 0)::int AS ngorder
    FROM stok_warna
    GROUP BY kode
  ),
  size_map AS (
    SELECT
      kode,
      jsonb_object_agg(
        size,
        jsonb_build_object('gudang', gudang, 'cideng', cideng, 'tegalgubug', tegalgubug, 'ngorder', ngorder)
      ) AS sizes
    FROM per_size
    GROUP BY kode
  )
  SELECT COALESCE(
    jsonb_object_agg(
      pk.kode,
      jsonb_build_object(
        'gudang', pk.gudang,
        'cideng', pk.cideng,
        'tegalgubug', pk.tegalgubug,
        'ngorder', pk.ngorder,
        'sizes', COALESCE(sm.sizes, '{}'::jsonb)
      )
    ),
    '{}'::jsonb
  )
  FROM per_kode pk
  LEFT JOIN size_map sm ON sm.kode = pk.kode;
$function$;
