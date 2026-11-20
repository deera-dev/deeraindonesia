-- M4 (produksi-sampel) — port saveBatchDecisions()/createPlanning()/
-- approveRepeat()/reorderPlanning() dari
-- apps/admin/src/features/produksi-sampel/api.js jadi RPC atomik.
--
-- saveBatchDecisions dulu Promise.all dari N update independen (approve/
-- tahan/reject per sampel) tanpa transaction — kalau salah satu promise
-- reject, yang lain sudah ter-commit duluan (partial batch: sebagian
-- disetujui, sebagian gagal tanpa jejak jelas). reorderPlanning juga
-- Promise.all serupa (dampaknya lebih ringan — cuma urutan tampil).
--
-- approved_by/rejected_by/ditahan_by/created_by sebelumnya objek `user`/
-- string userEmail dari client, ditulis apa adanya ke kolom — bisa
-- dipalsukan. Sekarang dari auth.uid() -> profiles.
--
-- notify-sampel-status (Edge Function, fire-and-forget) TETAP dipanggil
-- dari JS setelah RPC sukses, bukan ikut masuk transaction — itu cuma
-- notifikasi, bukan state yang perlu atomik bareng write utama.
--
-- SECURITY INVOKER — pg_policies sampel ("authenticated full access")
-- dan product_history/profiles sudah authenticated:true.
create or replace function public.save_batch_decisions_sampel(p_decisions jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_dec jsonb;
  v_id uuid;
  v_choice text;
  v_catatan text;
  v_before_status text;
  v_sampel_nomor text;
  v_sampel_nama text;
  v_now timestamptz := now();
begin
  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  for v_dec in select * from jsonb_array_elements(p_decisions)
  loop
    v_id := (v_dec ->> 'id')::uuid;
    v_choice := v_dec ->> 'choice';
    v_catatan := nullif(v_dec ->> 'catatan', '');

    select status, nomor, nama into v_before_status, v_sampel_nomor, v_sampel_nama
    from public.sampel where id = v_id;

    if not found then
      continue;
    end if;

    if v_choice = 'approve' then
      update public.sampel set
        status = 'approved',
        sesuai_sampel = (v_catatan is null),
        perubahan = v_catatan,
        approved_by = v_user_email,
        approved_at = v_now,
        updated_at = v_now
      where id = v_id;
    elsif v_choice = 'ditahan' then
      update public.sampel set
        status = 'ditahan',
        ditahan_by = v_user_email,
        ditahan_at = v_now,
        ditahan_note = v_catatan,
        updated_at = v_now
      where id = v_id;
    else
      update public.sampel set
        status = 'rejected',
        rejected_by = v_user_email,
        rejected_at = v_now,
        rejection_note = v_dec ->> 'alasan',
        updated_at = v_now
      where id = v_id;
    end if;

    insert into public.product_history
      (action, category, kode, nama, snapshot, before_snapshot, user_email, user_name)
    values
      (case v_choice
         when 'approve' then 'sampel-approve'
         when 'ditahan' then 'sampel-tahan'
         else 'sampel-reject'
       end,
       'produksi', v_sampel_nomor, v_sampel_nama,
       case v_choice
         when 'approve' then jsonb_build_object('status', 'approved', 'perubahan', v_catatan)
         when 'ditahan' then jsonb_build_object('status', 'ditahan', 'ditahan_note', v_catatan)
         else jsonb_build_object('status', 'rejected', 'rejection_note', v_dec ->> 'alasan')
       end,
       jsonb_build_object('status', v_before_status),
       v_user_email, v_user_name);
  end loop;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.create_sampel_planning(
  p_nomor text,
  p_nama text,
  p_tanggal date,
  p_bahan_foto_url text,
  p_model_foto_urls jsonb,
  p_bahan_items jsonb,
  p_urutan integer,
  p_is_repeat boolean,
  p_repeat_dari_id uuid,
  p_repeat_dari_kode text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_row public.sampel%rowtype;
begin
  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  insert into public.sampel
    (nomor, nama, tanggal, foto, bahan_foto, model_foto, bahan_items, urutan, status,
     is_repeat, repeat_dari_id, repeat_dari_kode, created_by, created_by_name)
  values
    (p_nomor, p_nama, p_tanggal, '[]'::jsonb, p_bahan_foto_url,
     coalesce(p_model_foto_urls, '[]'::jsonb), coalesce(p_bahan_items, '[]'::jsonb),
     coalesce(p_urutan, 0), 'planning', coalesce(p_is_repeat, false), p_repeat_dari_id,
     p_repeat_dari_kode, v_user_email, v_user_name)
  returning * into v_row;

  insert into public.product_history
    (action, category, kode, nama, snapshot, user_email, user_name)
  values
    ('sampel-planning-buat', 'produksi', p_nomor, p_nama, to_jsonb(v_row), v_user_email, v_user_name);

  return to_jsonb(v_row);
end;
$$;

create or replace function public.approve_sampel_repeat(
  p_id uuid,
  p_foto jsonb,
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
  v_catatan text;
  v_row public.sampel%rowtype;
begin
  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  v_catatan := nullif(p_catatan, '');

  update public.sampel set
    status = 'approved',
    foto = coalesce(p_foto, '[]'::jsonb),
    sesuai_sampel = (v_catatan is null),
    perubahan = v_catatan,
    approved_by = v_user_email,
    approved_at = now(),
    updated_at = now()
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'Sampel tidak ditemukan.';
  end if;

  insert into public.product_history
    (action, category, kode, nama, snapshot, before_snapshot, user_email, user_name)
  values
    ('sampel-approve-repeat', 'produksi', v_row.nomor, v_row.nama,
     jsonb_build_object('status', 'approved', 'repeat', true, 'perubahan', v_catatan),
     jsonb_build_object('status', 'planning'), v_user_email, v_user_name);

  return to_jsonb(v_row);
end;
$$;

create or replace function public.reorder_sampel_planning(p_updates jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_u jsonb;
begin
  for v_u in select * from jsonb_array_elements(coalesce(p_updates, '[]'::jsonb))
  loop
    update public.sampel
    set urutan = coalesce((v_u ->> 'urutan')::integer, 0)
    where id = (v_u ->> 'id')::uuid;
  end loop;
end;
$$;
