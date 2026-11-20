-- M4 (transfer) — approve_transfer() sudah atomik dan di-scope per
-- transfer (FOR UPDATE row lock di transfers, update stok_warna per
-- item.id spesifik, BUKAN global seperti move_stok_lokasi) — jadi TIDAK
-- ada bug atomicity/blast-radius di sini. Satu-satunya yang diperbaiki:
-- identitas audit (p_approver_email/p_approver_name) dulu diterima sbg
-- PARAMETER client, sama kategorinya dengan temuan di
-- save_product/save_stok_opname/move_stok_lokasi. Sekarang diambil dari
-- auth.uid() -> profiles.

drop function if exists public.approve_transfer(uuid, text, text);

create or replace function public.approve_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_transfer        transfers%rowtype;
  v_before          jsonb;
  v_item            jsonb;
  v_kode            text;
  v_size            text;
  v_warna           text;
  v_qty             integer;
  v_row_id          uuid;
  v_from            text;
  v_to              text;
  v_total_qty       integer := 0;
  v_updated_rows    integer;
  v_valid_locations text[] := array['gudang', 'cideng', 'tegalgubug', 'ngorder'];
  v_approver_email  text;
  v_approver_name   text;
begin
  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_approver_email, v_approver_name
  from public.profiles where id = auth.uid();

  select * into v_transfer from transfers where id = p_transfer_id for update;

  if not found then
    raise exception 'Transfer tidak ditemukan.';
  end if;

  if v_transfer.status <> 'pending' then
    raise exception 'Transfer sudah tidak bisa di-approve.';
  end if;

  v_before := to_jsonb(v_transfer);
  v_from := v_transfer.from_location;
  v_to := v_transfer.to_location;

  if not (v_from = any(v_valid_locations)) then
    raise exception 'from_location tidak valid: %', v_from;
  end if;

  select coalesce(sum(coalesce((elem ->> 'qty')::integer, 0)), 0)
  into v_total_qty
  from jsonb_array_elements(v_transfer.items) elem;

  update transfers
  set status = 'approved',
      approved_by = v_approver_email,
      approved_at = now()
  where id = p_transfer_id
    and status = 'pending';

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then
    raise exception 'Transfer sudah tidak bisa di-approve.';
  end if;

  for v_item in select * from jsonb_array_elements(v_transfer.items)
  loop
    v_kode := v_item ->> 'kode';
    v_size := v_item ->> 'size';
    v_warna := nullif(v_item ->> 'warna', '');
    v_qty := coalesce((v_item ->> 'qty')::integer, 0);

    if v_qty <= 0 then
      continue;
    end if;

    select id into v_row_id
    from stok_warna
    where kode = v_kode
      and size = v_size
      and ((v_warna is null and warna is null) or warna = v_warna)
    limit 1;

    if v_row_id is null then
      continue;
    end if;

    if v_to = any(v_valid_locations) then
      execute format(
        'update stok_warna set %I = greatest(0, coalesce(%I, 0) - $1), %I = coalesce(%I, 0) + $1, updated_at = now() where id = $2',
        v_from, v_from, v_to, v_to
      ) using v_qty, v_row_id;
    else
      execute format(
        'update stok_warna set %I = greatest(0, coalesce(%I, 0) - $1), updated_at = now() where id = $2',
        v_from, v_from
      ) using v_qty, v_row_id;
    end if;
  end loop;

  begin
    insert into product_history (
      action, category, kode, nama, snapshot, before_snapshot, user_email, user_name
    ) values (
      'transfer-approve',
      'transfer',
      v_transfer.transfer_no,
      v_from || ' → ' || v_to || ' · ' || v_total_qty::text || ' pcs',
      v_before || jsonb_build_object('status', 'approved', 'approved_by', v_approver_email),
      v_before,
      v_approver_email,
      v_approver_name
    );
  exception when others then
    null;
  end;

  return jsonb_build_object('success', true, 'transfer_id', p_transfer_id);
end;
$function$;
