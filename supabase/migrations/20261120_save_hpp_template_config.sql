-- M4 (produksi-hpp) — port saveHppTemplates()/saveHppConfigValue() dari
-- apps/admin/src/features/produksi-hpp/api.js jadi RPC atomik.
--
-- save_hpp_template: dulu 2 tulis berurutan tanpa transaction per
-- payload (upsert hpp_template, lalu update products.hpp kalau
-- total_hpp>0) — kalau koneksi putus di antara 2 langkah itu, hpp
-- produk di tabel products jadi gak sinkron sama template-nya. Lookup
-- "existing row by kode_produk" juga dipindah ke server (baca live dari
-- DB), bukan percaya array `templates` yang di-fetch client sebelum
-- form dibuka (bisa basi, sama alasan kayak save_product untuk
-- stok_warna).
--
-- Identitas (userEmail) di KEDUA fungsi sebelumnya parameter client
-- biasa yang ditulis langsung ke kolom updated_by — bisa dipalsukan
-- siapa pun yang panggil fungsi ini dari console. Sekarang diambil dari
-- auth.uid() -> profiles, sama seperti RPC lain di sesi ini.
--
-- SECURITY INVOKER — pg_policies dicek dulu: hpp_template, hpp_config,
-- products, product_history, profiles semuanya authenticated:true utk
-- command yang dipakai, gak perlu bypass RLS.
create or replace function public.save_hpp_template(
  p_kode_produk text,
  p_bahan_items jsonb,
  p_upah_jahit integer,
  p_bordir integer,
  p_biaya_studio integer,
  p_jumlah_baju_studio integer,
  p_kancing_qty integer,
  p_kancing_extra jsonb,
  p_catatan text,
  p_config_snapshot jsonb,
  p_total_hpp integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_existing public.hpp_template%rowtype;
  v_row public.hpp_template%rowtype;
begin
  if p_kode_produk is null or btrim(p_kode_produk) = '' then
    raise exception 'Kode produk wajib diisi';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  select * into v_existing from public.hpp_template
  where kode_produk = p_kode_produk
  order by id
  limit 1;

  if found then
    update public.hpp_template set
      bahan_items = p_bahan_items,
      upah_jahit = p_upah_jahit,
      bordir = p_bordir,
      biaya_studio = p_biaya_studio,
      jumlah_baju_studio = p_jumlah_baju_studio,
      kancing_qty = p_kancing_qty,
      kancing_extra = p_kancing_extra,
      catatan = p_catatan,
      config_snapshot = p_config_snapshot,
      total_hpp = p_total_hpp,
      updated_at = now(),
      updated_by = v_user_email
    where id = v_existing.id
    returning * into v_row;
  else
    insert into public.hpp_template
      (kode_produk, bahan_items, upah_jahit, bordir, biaya_studio, jumlah_baju_studio,
       kancing_qty, kancing_extra, catatan, config_snapshot, total_hpp, updated_at, updated_by)
    values
      (p_kode_produk, p_bahan_items, p_upah_jahit, p_bordir, p_biaya_studio, p_jumlah_baju_studio,
       p_kancing_qty, p_kancing_extra, p_catatan, p_config_snapshot, p_total_hpp, now(), v_user_email)
    returning * into v_row;
  end if;

  if p_total_hpp > 0 then
    update public.products set hpp = p_total_hpp where kode = p_kode_produk;
  end if;

  insert into public.product_history
    (action, category, kode, nama, snapshot, before_snapshot, user_email, user_name)
  values
    ('hpp-simpan', 'produksi', p_kode_produk, p_kode_produk,
     jsonb_build_object('total_hpp', p_total_hpp, 'bahan_items', p_bahan_items),
     case when v_existing.id is not null
       then jsonb_build_object('total_hpp', v_existing.total_hpp, 'bahan_items', v_existing.bahan_items)
       else null end,
     v_user_email, v_user_name);

  return to_jsonb(v_row);
end;
$$;

create or replace function public.save_hpp_config_value(
  p_key text,
  p_nilai integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
begin
  select email into v_user_email from public.profiles where id = auth.uid();

  update public.hpp_config
  set nilai = p_nilai, updated_at = now(), updated_by = v_user_email
  where key = p_key;
end;
$$;
