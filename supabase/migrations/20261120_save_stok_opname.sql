-- M4 (stok-opname) — port saveStokOpname() dari
-- apps/admin/src/features/stok-opname/api.js jadi RPC atomik, ditemukan
-- saat audit M4 (docs/reports/audit-report-m4-admin.md §6: "tanpa
-- transaction wrapping yang kelihatan di layer JS"). Versi lama memecah
-- upsert jadi 2 panggilan terpisah (baris lama vs baris placeholder
-- baru) -- itu sendiri sengaja (lihat komentar "BUG FIX 2026-09" di
-- api.test.js: PostgREST mengirim `id: null` eksplisit kalau 1 batch
-- array campur ada-id/tanpa-id, nabrak NOT NULL constraint). Di RPC ini
-- masalahnya gak ada sama sekali -- upsert-nya native SQL, konfliknya
-- udah ditarget ke (kode,size,warna) BUKAN id, jadi kolom id gak perlu
-- disebut sama sekali, satu statement cukup utk baris lama+baru
-- sekaligus. logHistory per kode yang dulu fire-and-forget (gak
-- di-await) sekarang ikut dalam transaction yang sama + identitas dari
-- auth.uid() (bukan parameter client).
--
-- SECURITY INVOKER — stok_warna & product_history sudah
-- authenticated:true (dicek pg_policies sebelum nulis ini), gak perlu
-- bypass RLS.
--
-- Perhitungan "before/after" per baris (merge changed value dgn baris
-- existing, fallback ke 0 kalau field gak pernah ada, decode kode/size/
-- warna dari id sintetik kalau baris placeholder) TETAP di JS
-- (api.js) -- itu murni, gak nyentuh DB, gak ada untungnya pindah ke SQL.
-- RPC ini cuma terima hasil akhirnya.

create or replace function public.save_stok_opname(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_kode text;
begin
  if p_rows is null or jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('count', 0);
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  insert into public.stok_warna (kode, size, warna, gudang, cideng, tegalgubug, ngorder, updated_at)
  select
    r ->> 'kode', r ->> 'size', r ->> 'warna',
    coalesce(((r -> 'after') ->> 'gudang')::int, 0),
    coalesce(((r -> 'after') ->> 'cideng')::int, 0),
    coalesce(((r -> 'after') ->> 'tegalgubug')::int, 0),
    coalesce(((r -> 'after') ->> 'ngorder')::int, 0),
    now()
  from jsonb_array_elements(p_rows) r
  on conflict (kode, size, warna) do update set
    gudang = excluded.gudang,
    cideng = excluded.cideng,
    tegalgubug = excluded.tegalgubug,
    ngorder = excluded.ngorder,
    updated_at = excluded.updated_at;

  for v_kode in select distinct r ->> 'kode' from jsonb_array_elements(p_rows) r
  loop
    insert into public.product_history
      (action, category, kode, nama, snapshot, before_snapshot, user_email, user_name)
    select
      'stok-opname', 'stok', v_kode,
      coalesce((select nama from public.products where kode = v_kode), v_kode),
      jsonb_build_object(
        'rows',
        jsonb_agg(
          jsonb_build_object('kode', r ->> 'kode', 'size', r ->> 'size', 'warna', r ->> 'warna')
            || (r -> 'after')
        )
      ),
      jsonb_build_object(
        'rows',
        jsonb_agg(
          jsonb_build_object('kode', r ->> 'kode', 'size', r ->> 'size', 'warna', r ->> 'warna')
            || (r -> 'before')
        )
      ),
      v_user_email, v_user_name
    from jsonb_array_elements(p_rows) r
    where r ->> 'kode' = v_kode;
  end loop;

  return jsonb_build_object('count', jsonb_array_length(p_rows));
end;
$$;
