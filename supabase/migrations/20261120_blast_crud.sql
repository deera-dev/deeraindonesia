-- M4 (blast) — port createCampaign() dari
-- apps/admin/src/features/blast/api.js jadi RPC atomik.
--
-- Dulu insert blast_campaign (1 baris) lalu insert blast_target (bulk)
-- sbg 2 tulis terpisah tanpa transaction — kalau insert target gagal,
-- campaign jadi "hantu" (status "berjalan" tapi 0 target, gak kelihatan
-- gagal dari sisi campaign-nya). created_by_email/created_by_name juga
-- dulu dari objek `user` client (bisa dipalsukan).
--
-- SECURITY INVOKER — pg_policies blast_campaign/blast_target/profiles
-- semuanya authenticated:true.
create or replace function public.create_blast_campaign(
  p_nama text,
  p_product_kodes jsonb,
  p_message text,
  p_targets jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_campaign public.blast_campaign%rowtype;
  v_target jsonb;
begin
  if p_nama is null or btrim(p_nama) = '' then
    raise exception 'Nama blast wajib diisi.';
  end if;
  if coalesce(jsonb_array_length(p_targets), 0) = 0 then
    raise exception 'Pilih minimal satu target.';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  insert into public.blast_campaign
    (nama, product_kodes, message, status, created_by_email, created_by_name)
  values
    (btrim(p_nama), coalesce(p_product_kodes, '[]'::jsonb), coalesce(p_message, ''),
     'berjalan', v_user_email, v_user_name)
  returning * into v_campaign;

  for v_target in select * from jsonb_array_elements(p_targets)
  loop
    insert into public.blast_target (campaign_id, source, contact_id, nama, no_hp, status)
    values
      (v_campaign.id, v_target ->> 'source', nullif(v_target ->> 'contactId', '')::uuid,
       v_target ->> 'nama', v_target ->> 'noHp', 'pending');
  end loop;

  return to_jsonb(v_campaign);
end;
$$;
