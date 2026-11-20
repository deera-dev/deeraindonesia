-- M4 (produk) — port saveProduct()/deleteProductCascade() dari
-- apps/admin/src/features/produk/api.js jadi RPC atomik, dipanggil lewat
-- Edge Function produk-crud. Sebelumnya ini 4-6 panggilan Supabase JS
-- berurutan dari browser, tanpa transaction — kalau salah satu gagal di
-- tengah jalan (mis. koneksi putus pas lagi hapus stok_warna di
-- deleteProductCascade), sisanya sudah kejadian, data jadi setengah
-- jalan. Perilakunya di-port PERSIS sama (lihat komentar per bagian),
-- cuma dibungkus 1 transaction + identitas audit log diambil dari
-- auth.uid()/profiles server-side (bukan dari parameter client, yang
-- sebelumnya bisa dipalsukan krn RLS product_history cuma authenticated:
-- true, gak ngecek user_email-nya cocok sama caller beneran).
--
-- SECURITY INVOKER (bukan DEFINER) — dicek dulu pg_policies: products,
-- product_history, produksi_batch, expected_stok, hpp_template,
-- stok_warna, profiles semuanya sudah authenticated:true utk command yang
-- dipakai di sini, jadi gak perlu bypass RLS sama sekali.
--
-- TIDAK dikerjakan di sini (pre-existing, bukan regresi): saat finalKode
-- != originalKode (ganti kode produk saat edit), baris stok_warna/
-- expected_stok/produksi_batch/hpp_template TIDAK ikut di-rename ke
-- finalKode (persis seperti kode JS lama — rename_produk_warna cuma
-- urus WARNA, bukan KODE). Jadi dianggap tetap "diketahui", bukan
-- diperbaiki diam-diam.

create or replace function public.save_product(
  p_is_edit boolean,
  p_original_kode text,
  p_final_kode text,
  p_nama text,
  p_image text,
  p_seri_warna text,
  p_video text,
  p_detail jsonb,
  p_bahan text,
  p_variants jsonb,
  p_hpp integer,
  p_warna text[],
  p_warna_renames jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_before jsonb;
  v_row public.products%rowtype;
  v_user_email text;
  v_user_name text;
  v_rename jsonb;
  v_warna_list text[];
  v_active_sizes text[];
  v_existing_pairs text[];
  v_orphan_warna text;
begin
  if p_final_kode is null or btrim(p_final_kode) = '' then
    raise exception 'Kode produk wajib diisi';
  end if;
  if p_nama is null or btrim(p_nama) = '' then
    raise exception 'Nama produk wajib diisi';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  if p_is_edit then
    select to_jsonb(products.*) into v_before
    from public.products where kode = p_original_kode;

    update public.products set
      kode = p_final_kode,
      nama = btrim(p_nama),
      image = p_image,
      seri_warna = p_seri_warna,
      video = p_video,
      detail = p_detail,
      bahan = btrim(p_bahan),
      variants = p_variants,
      hpp = p_hpp,
      warna = p_warna
    where kode = p_original_kode
    returning * into v_row;

    if not found then
      raise exception 'Produk % tidak ditemukan', p_original_kode;
    end if;

    insert into public.product_history
      (action, category, kode, nama, snapshot, before_snapshot, user_email, user_name)
    values
      ('edit', 'produk', p_final_kode, v_row.nama, to_jsonb(v_row), v_before, v_user_email, v_user_name);

    -- Rename warna PAKAI originalKode (sama kayak JS lama) — stok_warna/
    -- expected_stok/produksi_batch/sales masih kekunci di kode LAMA
    -- (belum ada yg rename kode-nya), jadi rename_produk_warna harus
    -- nyari pakai p_original_kode, bukan p_final_kode.
    if jsonb_array_length(coalesce(p_warna_renames, '[]'::jsonb)) > 0 then
      for v_rename in select * from jsonb_array_elements(p_warna_renames)
      loop
        perform public.rename_produk_warna(p_original_kode, v_rename ->> 'from', v_rename ->> 'to');
      end loop;
    end if;
  else
    insert into public.products
      (kode, nama, image, seri_warna, video, detail, bahan, variants, hpp, warna)
    values
      (p_final_kode, btrim(p_nama), p_image, p_seri_warna, p_video, p_detail, btrim(p_bahan), p_variants, p_hpp, p_warna)
    returning * into v_row;

    insert into public.product_history
      (action, category, kode, nama, snapshot, user_email, user_name)
    values
      ('tambah', 'produk', p_final_kode, v_row.nama, to_jsonb(v_row), v_user_email, v_user_name);
  end if;

  v_warna_list := case when coalesce(array_length(p_warna, 1), 0) > 0 then p_warna else array['_'] end;
  select coalesce(array_agg(elem ->> 'size'), '{}')
    into v_active_sizes
  from jsonb_array_elements(p_variants) elem;

  -- Baca state stok_warna LANGSUNG dari tabel (bukan snapshot dari
  -- client yang bisa basi kalau POS sempat ubah stok di antara form
  -- dibuka vs disimpan) — ini perbaikan dibanding JS lama yang percaya
  -- stokWarnaMap yang di-fetch client sebelum user mulai edit.
  select coalesce(array_agg(size || '__' || warna), '{}')
    into v_existing_pairs
  from public.stok_warna where kode = p_final_kode;

  insert into public.stok_warna (kode, size, warna, gudang, cideng, tegalgubug, ngorder, updated_at)
  select p_final_kode, s.size, w.warna, 0, 0, 0, 0, now()
  from unnest(v_active_sizes) as s(size)
  cross join unnest(v_warna_list) as w(warna)
  where not (s.size || '__' || w.warna = any(v_existing_pairs));

  if p_is_edit then
    -- Warna yang dulu ada tapi sekarang gak ada lagi di produk ini ->
    -- bersihkan stok_warna + expected_stok-nya (baris "_" dikecualikan
    -- kecuali qty-nya semua nol, sama kayak JS lama — itu baris stok yg
    -- belum dibagi ke warna spesifik, jangan dibuang kalau masih ada isi).
    for v_orphan_warna in
      select distinct warna from public.stok_warna
      where kode = p_final_kode and warna <> all(v_warna_list)
    loop
      if v_orphan_warna = '_' then
        delete from public.stok_warna
        where kode = p_final_kode and warna = '_'
          and gudang = 0 and cideng = 0 and tegalgubug = 0 and ngorder = 0;
      else
        delete from public.stok_warna where kode = p_final_kode and warna = v_orphan_warna;
      end if;
      delete from public.expected_stok where kode = p_final_kode and warna = v_orphan_warna;
    end loop;
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_product_cascade(p_kode text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_nama text;
  v_user_email text;
  v_user_name text;
begin
  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  select nama into v_nama from public.products where kode = p_kode;

  delete from public.produksi_batch where kode_produk = p_kode;
  delete from public.expected_stok where kode = p_kode;
  delete from public.hpp_template where kode_produk = p_kode;
  delete from public.stok_warna where kode = p_kode;
  delete from public.products where kode = p_kode;

  insert into public.product_history
    (action, category, kode, nama, snapshot, user_email, user_name)
  values
    ('hapus', 'produk', p_kode, coalesce(v_nama, p_kode), null, v_user_email, v_user_name);

  return jsonb_build_object('kode', p_kode, 'nama', coalesce(v_nama, p_kode));
end;
$$;
