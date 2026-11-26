-- ============================================================
-- Cycle Counting berbasis risiko — tabel cycle_count_checked +
-- RPC get_cycle_count_kategori()
--
-- Konteks: hitung stok manual penuh (stok opname tradisional) terlalu
-- berat utk gudang yang bergerak cepat. Solusi: kode fast-moving
-- dihitung lebih sering (mingguan), kode lambat lebih jarang
-- (triwulan) -- total beban kerja per bulan sama, tapi disebar jadi
-- sedikit kode/hari, bukan numpuk di satu sesi hitung penuh.
--
-- cycle_count_checked: kapan terakhir suatu kode dihitung FISIK di
-- suatu lokasi. Diisi otomatis oleh saveStokOpname()
-- (apps/admin/src/features/stok-opname/api.js) setiap kali admin
-- menyimpan hasil hitung utk kode+lokasi itu -- BUKAN tabel baru yang
-- perlu diisi manual.
--
-- get_cycle_count_kategori(): kategori A/B/C per kode berdasarkan
-- kecepatan jual N hari terakhir (NTILE 3 -- sepertiga tercepat = A,
-- dihitung lebih sering; sepertiga terlambat = C, paling jarang).
-- Logika qty per item (flat vs per-warna, tanda retur) direplikasi
-- identik dari get_product_sold_qty() (20260805), hanya ditambah
-- filter rentang tanggal.
-- ============================================================

create table if not exists public.cycle_count_checked (
  kode       text not null,
  location   text not null check (location in ('gudang', 'cideng', 'tegalgubug', 'ngorder')),
  checked_at timestamptz not null default now(),
  primary key (kode, location)
);

alter table public.cycle_count_checked enable row level security;

create policy "cycle_count_checked authenticated select" on cycle_count_checked for select using (auth.role() = 'authenticated');
create policy "cycle_count_checked authenticated insert" on cycle_count_checked for insert with check (auth.role() = 'authenticated');
create policy "cycle_count_checked authenticated update" on cycle_count_checked for update using (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.get_cycle_count_kategori(p_days integer DEFAULT 90)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH flat AS (
    SELECT
      item ->> 'kode' AS kode,
      (CASE WHEN s.type = 'retur' THEN -1 ELSE 1 END) *
      COALESCE(
        CASE
          WHEN jsonb_typeof(item -> 'warna') = 'array'
               AND jsonb_array_length(item -> 'warna') > 0
            THEN (
              SELECT SUM(COALESCE((w ->> 'qty')::numeric, 0))
              FROM jsonb_array_elements(item -> 'warna') AS w
            )
          ELSE COALESCE((item ->> 'qty')::numeric, 0)
        END,
        0
      ) AS signed_qty
    FROM sales s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
    WHERE item ->> 'kode' IS NOT NULL
      AND s.date >= (current_date - make_interval(days => p_days))
  ),
  agg AS (
    SELECT kode, SUM(signed_qty) AS total_qty
    FROM flat
    GROUP BY kode
    HAVING SUM(signed_qty) > 0
  ),
  ranked AS (
    SELECT kode, NTILE(3) OVER (ORDER BY total_qty DESC) AS tier
    FROM agg
  )
  SELECT COALESCE(
    jsonb_object_agg(kode, CASE tier WHEN 1 THEN 'A' WHEN 2 THEN 'B' ELSE 'C' END),
    '{}'::jsonb
  )
  FROM ranked;
$$;

GRANT EXECUTE ON FUNCTION public.get_cycle_count_kategori(integer) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- SELECT jsonb_pretty(public.get_cycle_count_kategori(90));
-- SELECT * FROM cycle_count_checked ORDER BY checked_at DESC LIMIT 20;
