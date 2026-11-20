-- M4 (ngorder, ngorder-jadwal) — port createTrip/markTokoVisitedInActiveTrips
-- (ngorder-jadwal) dan createKiriman/addRencana/removeRencana/
-- updateKunjungan/markTokoVisitedViaTrip (ngorder) jadi RPC atomik.
--
-- Ringkasan masalah tiap fungsi:
--   createTrip: created_by_email dulu dari objek `user` client (bisa
--     dipalsukan) — single insert, atomic, identity-only fix.
--   markTokoVisitedInActiveTrips: loop update N baris ngorder_trip tanpa
--     transaction — sekarang 1 UPDATE statement (pakai EXISTS + jsonb_agg,
--     bukan loop plpgsql sama sekali), otomatis atomik.
--   createKiriman: insert sampel_kiriman lalu insert bulk
--     sampel_kiriman_item, 2 tabel tanpa transaction — kalau items gagal,
--     kiriman jadi "hantu" (0 item). created_by_email/name juga dari
--     client.
--   addRencana: loop insert satu-satu dengan try/catch per-row utk
--     unique violation (toko_kunjungan_aktif_uniq) — sekarang 1 bulk
--     insert dgn ON CONFLICT (toko_id) WHERE aktif DO NOTHING, sekalian
--     atomik & lebih sederhana. dipilih_oleh_email/nama dari client.
--   removeRencana: delete batch + update batch, 2 operasi terpisah tanpa
--     transaction bersama.
--   updateKunjungan: update toko_kunjungan, lalu (kalau status jadi
--     selesai) update toko TANPA try/catch — kalau step kedua gagal,
--     seluruh function throw padahal step pertama SUDAH ter-commit
--     (state nyangkut: kunjungan selesai tapi toko.status_approach belum
--     ikut). diubah_oleh_email/nama dari client.
--   markTokoVisitedViaTrip (jalur insert-baru, toko belum pernah ada
--     kunjungan aktif): insert toko_kunjungan lalu update toko, sama
--     persis masalahnya dgn updateKunjungan di atas — sekarang RPC
--     terpisah (create_kunjungan_selesai) yg disatukan transactionnya.
--
-- markTokoVisitedInActiveTrips tetap dipanggil fire-and-forget dari JS
-- setelah update_kunjungan/create_kunjungan_selesai sukses (best-effort,
-- sudah didokumentasikan sengaja di kode lama — "jangan gagalkan update
-- kunjungan cuma karena sinkron checklist trip gagal").
--
-- SECURITY INVOKER — pg_policies toko/toko_kunjungan/sampel_kiriman/
-- sampel_kiriman_item/ngorder_trip/profiles semuanya
-- authenticated:true.
create or replace function public.create_ngorder_trip(
  p_nama text,
  p_tanggal_mulai date,
  p_tanggal_selesai date,
  p_daerah text[],
  p_peserta text[],
  p_modal_awal bigint,
  p_status text,
  p_catatan text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_row public.ngorder_trip%rowtype;
begin
  select email into v_user_email from public.profiles where id = auth.uid();

  insert into public.ngorder_trip
    (nama, tanggal_mulai, tanggal_selesai, daerah, peserta, modal_awal, status, catatan, created_by_email)
  values
    (btrim(p_nama), p_tanggal_mulai, p_tanggal_selesai,
     to_jsonb(coalesce(p_daerah, array[]::text[])), to_jsonb(coalesce(p_peserta, array[]::text[])),
     coalesce(p_modal_awal, 0), coalesce(p_status, 'rencana'), p_catatan, v_user_email)
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.mark_toko_visited_in_active_trips(p_toko_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_toko_id is null then
    return;
  end if;

  update public.ngorder_trip t
  set
    toko = (
      select jsonb_agg(
        case when (elem ->> 'toko_id') = p_toko_id::text
          then elem || jsonb_build_object('dikunjungi', true)
          else elem
        end
      )
      from jsonb_array_elements(t.toko) elem
    ),
    updated_at = now()
  where t.status in ('rencana', 'berjalan')
    and exists (
      select 1 from jsonb_array_elements(t.toko) e
      where (e ->> 'toko_id') = p_toko_id::text
        and coalesce((e ->> 'dikunjungi')::boolean, false) = false
    );
end;
$$;

create or replace function public.create_kiriman(
  p_toko_id uuid,
  p_tanggal date,
  p_catatan text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_kiriman public.sampel_kiriman%rowtype;
  v_item jsonb;
begin
  if p_toko_id is null then
    raise exception 'Toko wajib dipilih.';
  end if;
  if coalesce(jsonb_array_length(p_items), 0) = 0 then
    raise exception 'Pilih minimal satu produk untuk dikirim.';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  insert into public.sampel_kiriman (toko_id, tanggal, catatan, created_by_email, created_by_name)
  values (p_toko_id, coalesce(p_tanggal, current_date), p_catatan, v_user_email, v_user_name)
  returning * into v_kiriman;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.sampel_kiriman_item (kiriman_id, toko_id, kode, nama, status)
    values (v_kiriman.id, p_toko_id, v_item ->> 'kode', v_item ->> 'nama', 'pending');
  end loop;

  return to_jsonb(v_kiriman);
end;
$$;

create or replace function public.add_rencana_kunjungan(p_toko_ids uuid[])
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_rows jsonb;
begin
  if coalesce(array_length(p_toko_ids, 1), 0) = 0 then
    return '[]'::jsonb;
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  with ins as (
    insert into public.toko_kunjungan (toko_id, dipilih_oleh_email, dipilih_oleh_nama)
    select distinct t, v_user_email, v_user_name
    from unnest(p_toko_ids) as t
    on conflict (toko_id) where aktif do nothing
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(ins.*)), '[]'::jsonb) into v_rows from ins;

  return v_rows;
end;
$$;

create or replace function public.remove_rencana_kunjungan(p_blank_ids uuid[], p_keep_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(array_length(p_blank_ids, 1), 0) > 0 then
    delete from public.toko_kunjungan where id = any(p_blank_ids);
  end if;
  if coalesce(array_length(p_keep_ids, 1), 0) > 0 then
    update public.toko_kunjungan set aktif = false, updated_at = now() where id = any(p_keep_ids);
  end if;
end;
$$;

create or replace function public.update_kunjungan(p_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_now timestamptz := now();
  v_row public.toko_kunjungan%rowtype;
begin
  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  update public.toko_kunjungan set
    updated_at = v_now,
    diubah_oleh_email = v_user_email,
    diubah_oleh_nama = v_user_name,
    hasil = case when p_patch ? 'hasil' then nullif(btrim(p_patch ->> 'hasil'), '') else hasil end,
    request = case when p_patch ? 'request' then nullif(btrim(p_patch ->> 'request'), '') else request end,
    kesan = case when p_patch ? 'kesan' then nullif(p_patch ->> 'kesan', '') else kesan end,
    status = case when p_patch ? 'status' then p_patch ->> 'status' else status end,
    mulai_at = case
      when p_patch ? 'status' and p_patch ->> 'status' = 'rencana' then null
      when p_patch ? 'status' and p_patch ->> 'status' in ('berlangsung', 'selesai') and mulai_at is null then v_now
      else mulai_at
    end,
    selesai_at = case
      when p_patch ? 'status' and p_patch ->> 'status' = 'rencana' then null
      when p_patch ? 'status' and p_patch ->> 'status' = 'selesai' then v_now
      else selesai_at
    end
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'Kunjungan tidak ditemukan.';
  end if;

  if v_row.status = 'selesai' then
    update public.toko set
      status_approach = 'sudah',
      kesan = case when v_row.kesan is not null then v_row.kesan else kesan end,
      updated_at = v_now
    where id = v_row.toko_id;
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.create_kunjungan_selesai(p_toko_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_now timestamptz := now();
  v_row public.toko_kunjungan%rowtype;
begin
  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  insert into public.toko_kunjungan
    (toko_id, status, aktif, dipilih_oleh_email, dipilih_oleh_nama,
     diubah_oleh_email, diubah_oleh_nama, mulai_at, selesai_at)
  values
    (p_toko_id, 'selesai', true, v_user_email, v_user_name,
     v_user_email, v_user_name, v_now, v_now)
  returning * into v_row;

  update public.toko set status_approach = 'sudah', updated_at = v_now where id = p_toko_id;

  return to_jsonb(v_row);
end;
$$;
