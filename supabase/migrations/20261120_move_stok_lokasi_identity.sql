-- M4 (pindah-stok-lokasi) — move_stok_lokasi() sudah atomik dari awal
-- (1 fungsi, transaksi implisit tunggal), jadi TIDAK ada bug atomicity
-- di sini seperti produk/stok-opname. Satu-satunya yang diperbaiki:
-- identitas audit log (p_actor_email/p_actor_name) dulu diterima sbg
-- PARAMETER dari client -- sama kategorinya dengan temuan di
-- save_product/save_stok_opname, caller bisa kirim nama/email apa aja
-- krn RLS product_history cuma authenticated:true, gak ngecek identitas
-- parameter cocok sama caller beneran. Sekarang diambil dari
-- auth.uid() -> profiles, konsisten dgn RPC lain yang sudah diporting.
--
-- Password re-confirm (verifyPassword) TETAP di client (hooks.js) --
-- itu soal re-otentikasi sebelum aksi destruktif dijalankan, bukan
-- identitas audit, jadi gak perlu pindah ke sini.

create or replace function public.move_stok_lokasi(p_from text, p_to text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_valid_locations text[] := array['gudang', 'cideng', 'tegalgubug'];
  v_total_moved integer := 0;
  v_rows_affected integer := 0;
  v_user_email text;
  v_user_name text;
begin
  if not (p_from = any(v_valid_locations)) then
    raise exception 'Lokasi asal tidak valid: %', p_from;
  end if;
  if not (p_to = any(v_valid_locations)) then
    raise exception 'Lokasi tujuan tidak valid: %', p_to;
  end if;
  if p_from = p_to then
    raise exception 'Lokasi asal dan tujuan tidak boleh sama.';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  execute format('select coalesce(sum(%I), 0) from stok_warna where coalesce(%I, 0) > 0', p_from, p_from)
  into v_total_moved;

  execute format(
    'update stok_warna set %I = coalesce(%I, 0) + coalesce(%I, 0), %I = 0, updated_at = now() where coalesce(%I, 0) > 0',
    p_to, p_to, p_from, p_from, p_from
  );
  get diagnostics v_rows_affected = row_count;

  begin
    insert into public.product_history (
      action, category, kode, nama, snapshot, before_snapshot, user_email, user_name
    ) values (
      'pindah-stok-lokasi',
      'stok',
      '-',
      p_from || ' → ' || p_to || ' · ' || v_total_moved::text || ' pcs (' || v_rows_affected::text || ' baris)',
      jsonb_build_object('from', p_from, 'to', p_to, 'total_pcs', v_total_moved, 'rows', v_rows_affected),
      null,
      v_user_email,
      v_user_name
    );
  exception when others then
    null;
  end;

  return jsonb_build_object('success', true, 'total_pcs', v_total_moved, 'rows', v_rows_affected);
end;
$function$;
