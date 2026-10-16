-- Buku potongan dihitung di backend: dipotong (expected_stok) − terjual (get_sold_summary_by_variant).
-- Level gabungan (ukuran / kode) = total dipotong − total terjual (tidak menjumlah angka per warna yang di-clamp 0).
create or replace function public.get_buku_potongan()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with sold as (
    select a.key1 as kode, b.key2 as size, c.key3 as warna, c.v::int as sold
    from jsonb_each(public.get_sold_summary_by_variant()) a(key1, val1),
         jsonb_each(a.val1) b(key2, val2),
         jsonb_each_text(b.val2) c(key3, v)
  ),
  e as (
    select kode, size, coalesce(warna, '_') as warna, coalesce(expected_qty, 0) as expected
    from expected_stok
  ),
  per_row as (
    select e.kode, e.size, e.warna, e.expected, coalesce(s.sold, 0) as sold
    from e left join sold s on s.kode = e.kode and s.size = e.size and s.warna = e.warna
  ),
  per_size as (
    select e.kode, e.size,
           sum(e.expected)::int as expected,
           coalesce((select sum(s.sold) from sold s where s.kode = e.kode and s.size = e.size), 0)::int as sold
    from (select kode, size, sum(expected) as expected from e group by kode, size) e
    group by e.kode, e.size, e.expected
  ),
  per_kode as (
    select kode, sum(expected)::int as expected, sum(sold)::int as sold
    from per_size group by kode
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_object_agg(kode || '__' || size || '__' || warna,
        jsonb_build_object('expected', expected, 'sold', sold, 'seharusnya', greatest(0, expected - sold))) from per_row), '{}'::jsonb),
    'sizes', coalesce((select jsonb_object_agg(kode || '__' || size,
        jsonb_build_object('expected', expected, 'sold', sold, 'seharusnya', greatest(0, expected - sold))) from per_size), '{}'::jsonb),
    'kodes', coalesce((select jsonb_object_agg(kode,
        jsonb_build_object('expected', expected, 'sold', sold, 'seharusnya', greatest(0, expected - sold))) from per_kode), '{}'::jsonb)
  );
$$;

grant execute on function public.get_buku_potongan() to authenticated;
revoke execute on function public.get_buku_potongan() from anon, public;
