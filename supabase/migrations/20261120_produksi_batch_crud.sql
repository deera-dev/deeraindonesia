-- M4 (produksi-record) — port saveEntry()/createBatches() dan
-- updateBatch() dari apps/admin/src/features/produksi-record/api.js
-- jadi RPC atomik.
--
-- saveEntry dulu: upsert products -> insert produksi_batch -> upsert
-- expected_stok, 3 tulis berurutan tanpa transaction (plus fire-and-
-- forget createJahitCardsForBatch, yang TETAP di luar transaction —
-- lihat catatan di bawah). updateBatch dulu: ensureProductForKode
-- (select+update/insert products) -> update produksi_batch -> delete+
-- upsert expected_stok, juga tanpa transaction, dan SIAPAPUN step bisa
-- gagal di tengah sambil step sebelumnya sudah kejadian.
--
-- SIZE_PRESETS (dipakai deriveProductFieldsFromSizes() utk default ld/pb
-- waktu insert produk baru) adalah konstanta JS (packages/shared/lib/
-- constants.js), BUKAN data di DB — supaya gak duplikat sumber
-- kebenaran, nilai variants/warna hasil derive itu TETAP dihitung di JS
-- dan dikirim sebagai parameter opaque (p_fallback_variants/
-- p_fallback_warna), bukan dihitung ulang di SQL.
--
-- createJahitCardsForBatch/renameJahitCardsForBatch (tabel jahit_cards,
-- fitur produksi-jahit) SENGAJA TETAP fire-and-forget di luar RPC ini
-- (JS tetap .catch(console.warn) setelah RPC sukses) — itu sudah
-- perilaku yang disengaja di kode lama (gagal jangan blokir save batch
-- utamanya), bukan bug yang perlu diikutkan ke transaction.
--
-- Identitas: insert ke product_history pakai auth.uid() -> profiles,
-- bukan parameter client, konsisten dgn RPC lain di sesi ini.
--
-- SECURITY INVOKER — pg_policies products/produksi_batch/expected_stok/
-- product_history/profiles semuanya authenticated:true.
create or replace function public.create_produksi_batch(
  p_kode text,
  p_nama text,
  p_bahan text,
  p_variants jsonb,
  p_warna text[],
  p_hpp integer,
  p_batch_no text,
  p_tanggal date,
  p_total_kain integer,
  p_sizes jsonb,
  p_bahan_dipakai jsonb,
  p_hpp_snapshot jsonb,
  p_hpp_per_item integer,
  p_catatan text,
  p_upah_jahit integer,
  p_tukang_potong_id uuid,
  p_tukang_potong_nama text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_batch_id uuid;
  v_sz jsonb;
  v_w jsonb;
begin
  if p_kode is null or btrim(p_kode) = '' then
    raise exception 'Kode produk wajib diisi';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  insert into public.products (kode, nama, bahan, hpp, variants, warna)
  values (p_kode, p_nama, p_bahan, p_hpp, p_variants, coalesce(p_warna, array[]::text[]))
  on conflict (kode) do update set
    nama = excluded.nama,
    bahan = excluded.bahan,
    hpp = excluded.hpp,
    variants = excluded.variants,
    warna = excluded.warna;

  insert into public.produksi_batch
    (batch_no, kode_produk, nama_produk, tanggal_produksi, total_kain, sizes,
     bahan_dipakai, hpp_snapshot, hpp_per_item, catatan, upah_jahit,
     tukang_potong_id, tukang_potong_nama)
  values
    (p_batch_no, p_kode, p_nama, p_tanggal, p_total_kain, coalesce(p_sizes, '[]'::jsonb),
     coalesce(p_bahan_dipakai, '[]'::jsonb), p_hpp_snapshot, p_hpp_per_item, p_catatan,
     coalesce(p_upah_jahit, 0), p_tukang_potong_id, p_tukang_potong_nama)
  returning id into v_batch_id;

  for v_sz in select * from jsonb_array_elements(coalesce(p_sizes, '[]'::jsonb))
  loop
    for v_w in select * from jsonb_array_elements(coalesce(v_sz -> 'warna', '[]'::jsonb))
    loop
      insert into public.expected_stok (kode, size, warna, expected_qty)
      values (p_kode, v_sz ->> 'size', v_w ->> 'warna', coalesce((v_w ->> 'qty')::integer, 0))
      on conflict (kode, size, warna) do update set
        expected_qty = excluded.expected_qty,
        updated_at = now();
    end loop;
  end loop;

  insert into public.product_history
    (action, category, kode, nama, snapshot, user_email, user_name)
  values
    ('batch-produksi', 'produksi', p_kode, p_nama,
     jsonb_build_object(
       'batch_no', p_batch_no, 'tanggal', p_tanggal, 'total_kain', p_total_kain,
       'sizes', p_sizes, 'catatan', p_catatan
     ),
     v_user_email, v_user_name);

  return jsonb_build_object('id', v_batch_id, 'kode', p_kode, 'nama', p_nama);
end;
$$;

create or replace function public.update_produksi_batch(
  p_batch_id uuid,
  p_initial_kode text,
  p_kode text,
  p_nama text,
  p_tanggal date,
  p_total_kain integer,
  p_sizes jsonb,
  p_bahan_dipakai jsonb,
  p_batch_no text,
  p_catatan text,
  p_upah_jahit integer,
  p_tukang_potong_id uuid,
  p_tukang_potong_nama text,
  p_fallback_variants jsonb,
  p_fallback_warna text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_kode_changed boolean;
  v_clash text;
  v_renamed_count integer;
  v_existing text;
  v_before public.produksi_batch%rowtype;
  v_sz jsonb;
  v_w jsonb;
begin
  if p_kode is null or btrim(p_kode) = '' then
    raise exception 'Kode produk wajib diisi';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  -- Ambil state SEBELUM diubah dulu, sebelum rename kode products di
  -- bawah (FK produksi_batch.kode_produk/hpp_template.kode_produk
  -- ON UPDATE CASCADE bisa langsung ubah kode_produk baris ini begitu
  -- products.kode di-update, jadi kalau dibaca SETELAH rename, "before"
  -- snapshot-nya sudah salah / sudah jadi kode baru).
  select * into v_before from public.produksi_batch where id = p_batch_id;
  if not found then
    raise exception 'Batch produksi tidak ditemukan.';
  end if;

  v_kode_changed := p_kode <> p_initial_kode;

  if v_kode_changed then
    select kode into v_clash from public.products where kode = p_kode;
    if v_clash is not null then
      raise exception 'Kode produk "%" sudah dipakai produk lain — pilih kode lain.', p_kode;
    end if;

    update public.products set kode = p_kode where kode = p_initial_kode;
    get diagnostics v_renamed_count = row_count;

    if v_renamed_count = 0 then
      insert into public.products (kode, nama, variants, warna)
      values (p_kode, p_nama, p_fallback_variants, coalesce(p_fallback_warna, array[]::text[]))
      on conflict (kode) do nothing;
    end if;
  else
    select kode into v_existing from public.products where kode = p_kode;
    if v_existing is null then
      insert into public.products (kode, nama, variants, warna)
      values (p_kode, p_nama, p_fallback_variants, coalesce(p_fallback_warna, array[]::text[]))
      on conflict (kode) do nothing;
    end if;
  end if;

  update public.produksi_batch set
    batch_no = p_batch_no,
    kode_produk = p_kode,
    nama_produk = p_nama,
    tanggal_produksi = p_tanggal,
    total_kain = p_total_kain,
    sizes = coalesce(p_sizes, '[]'::jsonb),
    bahan_dipakai = coalesce(p_bahan_dipakai, '[]'::jsonb),
    catatan = p_catatan,
    upah_jahit = coalesce(p_upah_jahit, 0),
    tukang_potong_id = p_tukang_potong_id,
    tukang_potong_nama = p_tukang_potong_nama
  where id = p_batch_id;

  if v_kode_changed then
    delete from public.expected_stok where kode = p_initial_kode;
  end if;

  for v_sz in select * from jsonb_array_elements(coalesce(p_sizes, '[]'::jsonb))
  loop
    for v_w in select * from jsonb_array_elements(coalesce(v_sz -> 'warna', '[]'::jsonb))
    loop
      insert into public.expected_stok (kode, size, warna, expected_qty)
      values (p_kode, v_sz ->> 'size', v_w ->> 'warna', coalesce((v_w ->> 'qty')::integer, 0))
      on conflict (kode, size, warna) do update set
        expected_qty = excluded.expected_qty,
        updated_at = now();
    end loop;
  end loop;

  insert into public.product_history
    (action, category, kode, nama, snapshot, before_snapshot, user_email, user_name)
  values
    ('batch-produksi', 'produksi', p_kode, p_nama,
     jsonb_build_object(
       'batch_no', p_batch_no, 'tanggal', p_tanggal, 'total_kain', p_total_kain,
       'sizes', p_sizes, 'catatan', p_catatan, 'edit', true
     ),
     jsonb_build_object(
       'batch_no', v_before.batch_no, 'kode_produk', v_before.kode_produk,
       'tanggal', v_before.tanggal_produksi
     ),
     v_user_email, v_user_name);

  return jsonb_build_object('id', p_batch_id, 'kode', p_kode, 'nama', p_nama);
end;
$$;
