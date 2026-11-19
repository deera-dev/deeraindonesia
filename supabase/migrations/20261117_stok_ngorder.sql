alter table stok_warna add column if not exists ngorder integer not null default 0;
comment on column stok_warna.ngorder is 'Stok yang sedang dibawa ngorder (keliling toko) — terpisah dari gudang/cideng/tegalgubug, cuma berubah lewat Transfer (dari/ke lokasi mana pun), bukan stok opname.';

create or replace function public.approve_transfer(p_transfer_id uuid, p_approver_email text, p_approver_name text)
 returns jsonb
 language plpgsql
 set search_path to 'public'
as $function$
DECLARE
  v_transfer        transfers%ROWTYPE;
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
  v_valid_locations text[] := ARRAY['gudang', 'cideng', 'tegalgubug', 'ngorder'];
BEGIN
  SELECT * INTO v_transfer FROM transfers WHERE id = p_transfer_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer tidak ditemukan.';
  END IF;

  IF v_transfer.status <> 'pending' THEN
    RAISE EXCEPTION 'Transfer sudah tidak bisa di-approve.';
  END IF;

  v_before := to_jsonb(v_transfer);
  v_from := v_transfer.from_location;
  v_to := v_transfer.to_location;

  IF NOT (v_from = ANY(v_valid_locations)) THEN
    RAISE EXCEPTION 'from_location tidak valid: %', v_from;
  END IF;

  SELECT COALESCE(SUM(COALESCE((elem ->> 'qty')::integer, 0)), 0)
  INTO v_total_qty
  FROM jsonb_array_elements(v_transfer.items) elem;

  UPDATE transfers
  SET status = 'approved',
      approved_by = p_approver_email,
      approved_at = now()
  WHERE id = p_transfer_id
    AND status = 'pending';

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  IF v_updated_rows = 0 THEN
    RAISE EXCEPTION 'Transfer sudah tidak bisa di-approve.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_transfer.items)
  LOOP
    v_kode := v_item ->> 'kode';
    v_size := v_item ->> 'size';
    v_warna := NULLIF(v_item ->> 'warna', '');
    v_qty := COALESCE((v_item ->> 'qty')::integer, 0);

    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_row_id
    FROM stok_warna
    WHERE kode = v_kode
      AND size = v_size
      AND ((v_warna IS NULL AND warna IS NULL) OR warna = v_warna)
    LIMIT 1;

    IF v_row_id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_to = ANY(v_valid_locations) THEN
      EXECUTE format(
        'UPDATE stok_warna SET %I = GREATEST(0, COALESCE(%I, 0) - $1), %I = COALESCE(%I, 0) + $1, updated_at = now() WHERE id = $2',
        v_from, v_from, v_to, v_to
      ) USING v_qty, v_row_id;
    ELSE
      EXECUTE format(
        'UPDATE stok_warna SET %I = GREATEST(0, COALESCE(%I, 0) - $1), updated_at = now() WHERE id = $2',
        v_from, v_from
      ) USING v_qty, v_row_id;
    END IF;
  END LOOP;

  BEGIN
    INSERT INTO product_history (
      action, category, kode, nama, snapshot, before_snapshot, user_email, user_name
    ) VALUES (
      'transfer-approve',
      'transfer',
      v_transfer.transfer_no,
      v_from || ' → ' || v_to || ' · ' || v_total_qty::text || ' pcs',
      v_before || jsonb_build_object('status', 'approved', 'approved_by', p_approver_email),
      v_before,
      p_approver_email,
      p_approver_name
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id);
END;
$function$;

create or replace function public.check_stok_semua(p_kode text, p_rows jsonb)
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  with prod as (
    select lower(sz ->> 'size') as sk, sum(coalesce((w ->> 'qty')::numeric, 0)) as p
    from produksi_batch b, jsonb_array_elements(coalesce(b.sizes, '[]'::jsonb)) sz, jsonb_array_elements(coalesce(sz -> 'warna', '[]'::jsonb)) w
    where b.kode_produk = p_kode group by 1
  ), sold as (
    select lower(i ->> 'size') as sk,
           sum((case when s.type = 'retur' then -1 else 1 end) * coalesce(case when jsonb_typeof(i -> 'warna') = 'array' and jsonb_array_length(i -> 'warna') > 0
             then (select sum(coalesce((w ->> 'qty')::numeric, 0)) from jsonb_array_elements(i -> 'warna') w)
             else (i ->> 'qty')::numeric end, 0)) as q
    from sales s, jsonb_array_elements(coalesce(s.items, '[]'::jsonb)) i
    where s.type in ('sale', 'retur') and i ->> 'kode' = p_kode group by 1
  ), cur as (
    select z.size, z.warna, z.gudang, z.cideng, z.tegalgubug, z.ngorder from stok_warna z where z.kode = p_kode
  ), merged as (
    select coalesce(c.size, n.size) as size, coalesce(c.warna, n.warna) as warna,
           coalesce(n.gudang, c.gudang, 0) + coalesce(n.cideng, c.cideng, 0) + coalesce(n.tegalgubug, c.tegalgubug, 0) + coalesce(n.ngorder, c.ngorder, 0) as tot
    from cur c full join jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as n(size text, warna text, gudang int, cideng int, tegalgubug int, ngorder int)
      on lower(c.size) = lower(n.size) and c.warna = n.warna
  ), per as (
    select lower(size) as sk, min(size) as size, sum(tot) as total_after from merged group by 1
  )
  select jsonb_build_object('over', coalesce(jsonb_agg(jsonb_build_object(
      'size', per.size, 'produced', prod.p, 'sold', coalesce(sold.q, 0), 'total_after', per.total_after,
      'excess', per.total_after + coalesce(sold.q, 0) - prod.p) order by per.size), '[]'::jsonb))
  from per join prod using (sk) left join sold using (sk)
  where prod.p > 0 and per.total_after + coalesce(sold.q, 0) > prod.p;
$function$;

create or replace function public.plan_overflow_size(p_kode text, p_size text, p_loc text, p_changes jsonb, p_cap boolean)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'public'
as $function$
declare
  r record; rows_j jsonb; sold_w jsonb; prod_w jsonb;
  prod_qty numeric; sold_size numeric; total_after numeric; inc_total numeric; excess numeric; need numeric; t numeric;
  takes jsonb := '{}'::jsonb; adj jsonb;
begin
  select coalesce(sum(coalesce((w ->> 'qty')::numeric, 0)), 0) into prod_qty
  from produksi_batch b, jsonb_array_elements(coalesce(b.sizes, '[]'::jsonb)) sz, jsonb_array_elements(coalesce(sz -> 'warna', '[]'::jsonb)) w
  where b.kode_produk = p_kode and lower(sz ->> 'size') = lower(p_size);
  if prod_qty <= 0 then return null; end if;

  select coalesce(jsonb_object_agg(upper(w ->> 'warna'), q), '{}'::jsonb) into prod_w from (
    select w, coalesce((w ->> 'qty')::numeric, 0) as q
    from produksi_batch b, jsonb_array_elements(coalesce(b.sizes, '[]'::jsonb)) sz, jsonb_array_elements(coalesce(sz -> 'warna', '[]'::jsonb)) w
    where b.kode_produk = p_kode and lower(sz ->> 'size') = lower(p_size) and (w ->> 'warna') is not null) x;
  -- jsonb_object_agg menimpa key sama -> jumlahkan dulu
  select coalesce(jsonb_object_agg(wn, q), '{}'::jsonb) into prod_w from (
    select upper(w ->> 'warna') as wn, sum(coalesce((w ->> 'qty')::numeric, 0)) as q
    from produksi_batch b, jsonb_array_elements(coalesce(b.sizes, '[]'::jsonb)) sz, jsonb_array_elements(coalesce(sz -> 'warna', '[]'::jsonb)) w
    where b.kode_produk = p_kode and lower(sz ->> 'size') = lower(p_size) and (w ->> 'warna') is not null group by 1) x;

  select coalesce(sum(sgn * q), 0) into sold_size from (
    select (case when s.type = 'retur' then -1 else 1 end) as sgn,
           coalesce(case when jsonb_typeof(i -> 'warna') = 'array' and jsonb_array_length(i -> 'warna') > 0
             then (select sum(coalesce((w ->> 'qty')::numeric, 0)) from jsonb_array_elements(i -> 'warna') w)
             else (i ->> 'qty')::numeric end, 0) as q
    from sales s, jsonb_array_elements(coalesce(s.items, '[]'::jsonb)) i
    where s.type in ('sale', 'retur') and i ->> 'kode' = p_kode and lower(i ->> 'size') = lower(p_size)) y;

  select coalesce(jsonb_object_agg(wn, q), '{}'::jsonb) into sold_w from (
    select upper(w ->> 'warna') as wn, sum((case when s.type = 'retur' then -1 else 1 end) * coalesce((w ->> 'qty')::numeric, 0)) as q
    from sales s, jsonb_array_elements(coalesce(s.items, '[]'::jsonb)) i, jsonb_array_elements(
      case when jsonb_typeof(i -> 'warna') = 'array' then i -> 'warna' else '[]'::jsonb end) w
    where s.type in ('sale', 'retur') and i ->> 'kode' = p_kode and lower(i ->> 'size') = lower(p_size) and (w ->> 'warna') is not null group by 1) z;

  select coalesce(jsonb_agg(jsonb_build_object(
           'warna', coalesce(z.warna, c.warna),
           'gudang', coalesce(z.gudang, 0),
           'other', case p_loc when 'cideng' then coalesce(z.tegalgubug, 0) else coalesce(z.cideng, 0) end,
           'cur_m', case p_loc when 'cideng' then coalesce(z.cideng, 0) else coalesce(z.tegalgubug, 0) end,
           'new_m', coalesce(c.next, case p_loc when 'cideng' then coalesce(z.cideng, 0) else coalesce(z.tegalgubug, 0) end),
           'ngorder', coalesce(z.ngorder, 0))), '[]'::jsonb)
    into rows_j
  from (select * from stok_warna where kode = p_kode and lower(size) = lower(p_size)) z
  full join (select * from jsonb_to_recordset(coalesce(p_changes, '[]'::jsonb)) as x(size text, warna text, next int) where lower(size) = lower(p_size)) c
    on z.warna = c.warna;

  select coalesce(sum(gudang + other + new_m + ngorder), 0), coalesce(sum(greatest(new_m - cur_m, 0)), 0) into total_after, inc_total
  from jsonb_to_recordset(rows_j) as x(warna text, gudang numeric, other numeric, cur_m numeric, new_m numeric, ngorder numeric);
  excess := total_after + sold_size - prod_qty;
  need := case when p_cap then least(greatest(excess, 0), inc_total) else greatest(excess, 0) end;
  if need <= 0 then return null; end if;

  -- 0) warna yang sendiri melebihi produksinya (stok + terjual > produksi warna itu)
  for r in select x.warna, x.gudang,
                  (x.gudang + x.other + x.new_m) + coalesce((sold_w ->> upper(x.warna))::numeric, 0) - (prod_w ->> upper(x.warna))::numeric as over_w
           from jsonb_to_recordset(rows_j) as x(warna text, gudang numeric, other numeric, cur_m numeric, new_m numeric)
           where prod_w ? upper(x.warna) and x.gudang > 0
           order by 3 desc, x.warna loop
    exit when need <= 0;
    continue when r.over_w <= 0;
    t := least(need, r.over_w, r.gudang - coalesce((takes ->> r.warna)::numeric, 0));
    if t > 0 then
      takes := takes || jsonb_build_object(r.warna, coalesce((takes ->> r.warna)::numeric, 0) + t);
      need := need - t;
    end if;
  end loop;
  -- 1) gudang warna yang sama dengan penambahan di pasar
  for r in select x.warna, x.gudang, greatest(x.new_m - x.cur_m, 0) as inc
           from jsonb_to_recordset(rows_j) as x(warna text, gudang numeric, other numeric, cur_m numeric, new_m numeric)
           where x.new_m > x.cur_m and x.gudang > 0 order by 3 desc, x.warna loop
    exit when need <= 0;
    t := least(need, r.inc, r.gudang - coalesce((takes ->> r.warna)::numeric, 0));
    if t > 0 then
      takes := takes || jsonb_build_object(r.warna, coalesce((takes ->> r.warna)::numeric, 0) + t);
      need := need - t;
    end if;
  end loop;
  -- 2) sisanya dari gudang warna lain (terbanyak dulu)
  for r in select x.warna, x.gudang - coalesce((takes ->> x.warna)::numeric, 0) as sisa
           from jsonb_to_recordset(rows_j) as x(warna text, gudang numeric, other numeric, cur_m numeric, new_m numeric)
           where x.gudang - coalesce((takes ->> x.warna)::numeric, 0) > 0 order by 2 desc, x.warna loop
    exit when need <= 0;
    t := least(need, r.sisa);
    takes := takes || jsonb_build_object(r.warna, coalesce((takes ->> r.warna)::numeric, 0) + t);
    need := need - t;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object('warna', o.warna, 'gudang_from', o.gudang,
           'gudang_to', o.gudang - (takes ->> o.warna)::numeric, 'take', (takes ->> o.warna)::numeric) order by o.warna), '[]'::jsonb)
    into adj
  from jsonb_to_recordset(rows_j) as o(warna text, gudang numeric, other numeric, cur_m numeric, new_m numeric)
  where takes ? o.warna;

  return jsonb_build_object('size', p_size, 'produced', prod_qty, 'sold', sold_size, 'total_after', total_after,
    'excess', excess, 'take_total', (select coalesce(sum(value::numeric), 0) from jsonb_each_text(takes)),
    'unresolved', need, 'adjustments', adj);
end $function$;
