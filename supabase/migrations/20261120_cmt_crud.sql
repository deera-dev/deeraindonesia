-- M4 (cmt) — port createKirimCmtJahit/setorKirimCmtJahit/
-- batalKirimCmtJahit/createSetoranFull/createCmtFullKirim dari
-- apps/admin/src/features/cmt/api.js jadi RPC atomik.
--
-- Semuanya tadinya multi-tulis berurutan tanpa transaction:
--   createKirimCmtJahit: insert cmt_jahit_kirim (N baris, 1 per grup) lalu
--     loop update jahit_cards.cmt_jahit_kirim_id per grup — kalau sebagian
--     link gagal, kiriman sudah tercatat tapi kartu jahit-nya nyangkut
--     "belum tertaut" (gak kelihatan sudah dikirim ke CMT).
--   setorKirimCmtJahit: loop update per baris kirim_no — sebagian baris
--     bisa jadi "setor" sementara sisanya masih "dikirim" kalau gagal
--     di tengah.
--   batalKirimCmtJahit: update cmt_jahit_kirim (status) lalu update
--     jahit_cards (lepas link) — 2 langkah terpisah, bisa nyangkut status
--     batal tapi kartu masih tertaut.
--   createSetoranFull: insert cmt_setoran_full + loop (increment_stok_gudang
--     RPC + insert stok_masuk_log) — paling berisiko: stok produksi bisa
--     setengah nambah kalau gagal di tengah loop.
--
-- Identitas (created_by/created_by_name) di SEMUA fungsi di atas
-- sebelumnya objek `user` dari client (lewat useAuth() di komponen,
-- diteruskan apa adanya ke kolom created_by) — bisa dipalsukan siapa pun
-- yang panggil export function ini langsung. Sekarang dari
-- auth.uid() -> profiles.
--
-- groupCardsByKodeSizeWarna() (produksi-jahit grouping logic) TETAP di
-- JS (pure function, murni transformasi data, gak nyentuh DB) — RPC
-- cuma terima hasil groupnya sebagai jsonb opaque.
--
-- SECURITY INVOKER — pg_policies cmt_jahit_kirim/cmt_setoran_full/
-- cmt_full_kirim/stok_masuk_log/jahit_cards/stok_warna/product_history/
-- profiles semuanya authenticated:true utk command yang dipakai.
create or replace function public.create_kirim_cmt_jahit(
  p_kirim_no text,
  p_nama_vendor text,
  p_tanggal_kirim date,
  p_estimasi_selesai date,
  p_harga_upah integer,
  p_catatan text,
  p_groups jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_group jsonb;
  v_card_ids uuid[];
  v_inserted_id uuid;
  v_total_qty integer := 0;
begin
  if p_nama_vendor is null or btrim(p_nama_vendor) = '' then
    raise exception 'Nama vendor wajib diisi.';
  end if;
  if coalesce(jsonb_array_length(p_groups), 0) = 0 then
    raise exception 'Tambahkan minimal 1 produk.';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  for v_group in select * from jsonb_array_elements(p_groups)
  loop
    insert into public.cmt_jahit_kirim
      (kirim_no, nama_vendor, kode_produk, nama_produk, size, warna, qty,
       harga_upah, status, tanggal_kirim, estimasi_selesai, catatan,
       created_by, created_by_name)
    values
      (p_kirim_no, btrim(p_nama_vendor), v_group ->> 'kode_produk', v_group ->> 'nama_produk',
       v_group ->> 'size', coalesce(nullif(v_group ->> 'warna', ''), '_'),
       coalesce((v_group ->> 'qty')::integer, 0), coalesce(p_harga_upah, 0), 'dikirim',
       p_tanggal_kirim, p_estimasi_selesai, p_catatan, v_user_email, v_user_name)
    returning id into v_inserted_id;

    v_total_qty := v_total_qty + coalesce((v_group ->> 'qty')::integer, 0);

    select coalesce(array_agg(elem::uuid), '{}')
      into v_card_ids
    from jsonb_array_elements_text(coalesce(v_group -> 'cardIds', '[]'::jsonb)) elem;

    if coalesce(array_length(v_card_ids, 1), 0) > 0 then
      update public.jahit_cards
      set cmt_jahit_kirim_id = v_inserted_id
      where id = any(v_card_ids);
    end if;
  end loop;

  insert into public.product_history
    (action, category, kode, nama, snapshot, user_email, user_name)
  values
    ('cmt-jahit-kirim', 'produksi', p_kirim_no,
     btrim(p_nama_vendor) || ' · ' || v_total_qty::text || ' pcs',
     jsonb_build_object('kirim_no', p_kirim_no, 'nama_vendor', btrim(p_nama_vendor), 'groups', p_groups),
     v_user_email, v_user_name);

  return jsonb_build_object('kirim_no', p_kirim_no, 'total_qty', v_total_qty);
end;
$$;

create or replace function public.setor_kirim_cmt_jahit(
  p_kirim_no text,
  p_tanggal_setor date,
  p_items jsonb,
  p_catatan text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_item jsonb;
begin
  if coalesce(jsonb_array_length(p_items), 0) = 0 then
    raise exception 'Tidak ada baris untuk disetor.';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    update public.cmt_jahit_kirim set
      status = 'setor',
      qty_setor = coalesce((v_item ->> 'qtySetor')::integer, 0),
      tanggal_setor = p_tanggal_setor,
      updated_at = now(),
      catatan = coalesce(nullif(p_catatan, ''), catatan)
    where id = (v_item ->> 'id')::uuid;
  end loop;

  insert into public.product_history
    (action, category, kode, nama, snapshot, user_email, user_name)
  values
    ('cmt-jahit-setor', 'produksi', p_kirim_no,
     'Setor ' || jsonb_array_length(p_items)::text || ' baris',
     jsonb_build_object('kirim_no', p_kirim_no, 'items', p_items),
     v_user_email, v_user_name);
end;
$$;

create or replace function public.batal_kirim_cmt_jahit(
  p_kirim_no text,
  p_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
begin
  if coalesce(array_length(p_ids, 1), 0) = 0 then
    return;
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  update public.cmt_jahit_kirim
  set status = 'batal', updated_at = now()
  where id = any(p_ids);

  update public.jahit_cards
  set cmt_jahit_kirim_id = null
  where cmt_jahit_kirim_id = any(p_ids);

  insert into public.product_history
    (action, category, kode, nama, snapshot, user_email, user_name)
  values
    ('cmt-jahit-batal', 'produksi', p_kirim_no, 'Dibatalkan',
     jsonb_build_object('kirim_no', p_kirim_no, 'ids', p_ids),
     v_user_email, v_user_name);
end;
$$;

create or replace function public.create_setoran_full(
  p_nama_vendor text,
  p_kode_produk text,
  p_nama_produk text,
  p_tanggal_setor date,
  p_items jsonb,
  p_harga_upah integer,
  p_catatan text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_item jsonb;
  v_total_qty integer := 0;
  v_total_upah integer;
  v_setoran_id uuid;
  v_warna text;
  v_qty integer;
begin
  if p_nama_vendor is null or btrim(p_nama_vendor) = '' then
    raise exception 'Nama vendor wajib diisi.';
  end if;
  if p_kode_produk is null or btrim(p_kode_produk) = '' then
    raise exception 'Kode produk wajib diisi.';
  end if;
  if coalesce(jsonb_array_length(p_items), 0) = 0 then
    raise exception 'Isi minimal 1 baris size/warna dengan qty > 0.';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  select coalesce(sum(coalesce((elem ->> 'qty')::integer, 0)), 0)
    into v_total_qty
  from jsonb_array_elements(p_items) elem;

  v_total_upah := v_total_qty * coalesce(p_harga_upah, 0);

  insert into public.cmt_setoran_full
    (nama_vendor, kode_produk, nama_produk, tanggal_setor, items, harga_upah,
     total_upah, catatan, created_by, created_by_name)
  values
    (btrim(p_nama_vendor), btrim(p_kode_produk), p_nama_produk, p_tanggal_setor, p_items,
     coalesce(p_harga_upah, 0), v_total_upah, p_catatan, v_user_email, v_user_name)
  returning id into v_setoran_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_warna := coalesce(nullif(v_item ->> 'warna', ''), '_');
    v_qty := coalesce((v_item ->> 'qty')::integer, 0);

    perform public.increment_stok_gudang(btrim(p_kode_produk), v_item ->> 'size', v_warna, v_qty);

    insert into public.stok_masuk_log
      (kode, size, warna, qty_kartu, stok_sebelum, terjual_sebelum, qty_ditambahkan,
       cmt_setoran_full_id, created_by, created_by_name)
    values
      (btrim(p_kode_produk), v_item ->> 'size', v_warna, v_qty, 0, 0, v_qty,
       v_setoran_id, v_user_email, v_user_name);
  end loop;

  insert into public.product_history
    (action, category, kode, nama, snapshot, user_email, user_name)
  values
    ('cmt-full-setor', 'produksi', btrim(p_kode_produk),
     btrim(p_nama_vendor) || ' · ' || v_total_qty::text || ' pcs',
     jsonb_build_object(
       'nama_vendor', btrim(p_nama_vendor), 'kode_produk', btrim(p_kode_produk),
       'nama_produk', p_nama_produk, 'tanggal_setor', p_tanggal_setor, 'items', p_items,
       'harga_upah', coalesce(p_harga_upah, 0), 'total_upah', v_total_upah, 'catatan', p_catatan
     ),
     v_user_email, v_user_name);

  return jsonb_build_object('id', v_setoran_id, 'total_qty', v_total_qty, 'total_upah', v_total_upah);
end;
$$;

create or replace function public.create_cmt_full_kirim(
  p_nama_vendor text,
  p_tanggal_kirim date,
  p_estimasi_selesai date,
  p_bahan jsonb,
  p_catatan text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_row public.cmt_full_kirim%rowtype;
begin
  if p_nama_vendor is null or btrim(p_nama_vendor) = '' then
    raise exception 'Nama vendor wajib diisi.';
  end if;
  if coalesce(jsonb_array_length(p_bahan), 0) = 0 then
    raise exception 'Isi minimal 1 bahan dengan jumlah > 0.';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  insert into public.cmt_full_kirim
    (nama_vendor, tanggal_kirim, estimasi_selesai, bahan, catatan, created_by, created_by_name)
  values
    (btrim(p_nama_vendor), p_tanggal_kirim, p_estimasi_selesai, p_bahan, p_catatan, v_user_email, v_user_name)
  returning * into v_row;

  insert into public.product_history
    (action, category, kode, nama, snapshot, user_email, user_name)
  values
    ('cmt-full-kirim-bahan', 'produksi', btrim(p_nama_vendor),
     jsonb_array_length(p_bahan)::text || ' bahan dikirim',
     to_jsonb(v_row), v_user_email, v_user_name);

  return to_jsonb(v_row);
end;
$$;
