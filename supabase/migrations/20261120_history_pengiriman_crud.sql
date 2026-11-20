-- log_history: identitas sebelumnya dari getCurrentUser() di JS lalu
-- dikirim sbg payload insert client -> spoofable lewat REST langsung.
-- Sekarang identitas dari auth.uid() -> profiles, bukan parameter client.
create or replace function public.log_history(
  p_action text,
  p_category text,
  p_kode text,
  p_nama text,
  p_snapshot jsonb,
  p_before jsonb default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
begin
  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
    from public.profiles where id = auth.uid();

  insert into public.product_history (
    action, category, kode, nama, snapshot, before_snapshot, user_email, user_name
  ) values (
    p_action, p_category, p_kode, p_nama, p_snapshot, p_before, v_user_email, v_user_name
  );
end;
$$;

-- create_pengiriman: dulu resolvePelangganLink (insert/update pelanggan)
-- lalu insert pengiriman terpisah, 2 network call non-atomik. created_by
-- dikirim dari client (useAuth()) -> spoofable. Sekarang 1 RPC, identitas
-- dari auth.uid() -> profiles. Kegagalan auto-link pelanggan tetap
-- non-fatal (persis perilaku try/catch JS lama).
create or replace function public.create_pengiriman(
  p_tanggal date,
  p_nama_penerima text,
  p_no_telp_penerima text,
  p_alamat text,
  p_pelanggan_id uuid,
  p_jumlah_karung integer,
  p_isi_karung text,
  p_nama_ekspedisi text,
  p_nama_pengirim text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_email text;
  v_user_name text;
  v_pelanggan_id uuid := p_pelanggan_id;
  v_no_hp text := nullif(trim(p_no_telp_penerima), '');
  v_alamat text := nullif(trim(p_alamat), '');
  v_ekspedisi text := nullif(trim(p_nama_ekspedisi), '');
  v_row pengiriman%rowtype;
begin
  if p_tanggal is null then
    raise exception 'Tanggal wajib diisi.';
  end if;
  if coalesce(trim(p_nama_penerima), '') = '' then
    raise exception 'Nama penerima wajib diisi.';
  end if;
  if p_jumlah_karung is null or p_jumlah_karung <= 0 then
    raise exception 'Jumlah karung harus lebih dari 0.';
  end if;
  if v_ekspedisi is null then
    raise exception 'Nama ekspedisi wajib diisi.';
  end if;
  if coalesce(trim(p_nama_pengirim), '') = '' then
    raise exception 'Nama pengirim wajib diisi.';
  end if;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
    from public.profiles where id = auth.uid();

  begin
    if v_pelanggan_id is not null then
      update public.pelanggan
        set no_hp = coalesce(v_no_hp, no_hp),
            alamat = coalesce(v_alamat, alamat),
            ekspedisi_biasa = coalesce(v_ekspedisi, ekspedisi_biasa),
            updated_at = now()
        where id = v_pelanggan_id;
    else
      select id into v_pelanggan_id
        from public.pelanggan where nama ilike trim(p_nama_penerima) limit 1;

      if v_pelanggan_id is not null then
        update public.pelanggan
          set no_hp = coalesce(v_no_hp, no_hp),
              alamat = coalesce(v_alamat, alamat),
              ekspedisi_biasa = coalesce(v_ekspedisi, ekspedisi_biasa),
              updated_at = now()
          where id = v_pelanggan_id;
      else
        insert into public.pelanggan (nama, no_hp, alamat, ekspedisi_biasa, updated_at)
        values (trim(p_nama_penerima), v_no_hp, v_alamat, v_ekspedisi, now())
        returning id into v_pelanggan_id;
      end if;
    end if;
  exception when others then
    v_pelanggan_id := p_pelanggan_id;
  end;

  insert into public.pengiriman (
    pengiriman_no, tanggal, nama_penerima, no_telp_penerima, alamat,
    pelanggan_id, jumlah_karung, isi_karung, nama_ekspedisi, nama_pengirim,
    created_by, created_by_name
  ) values (
    'KRM-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 900 + 100)::text, 3, '0'),
    p_tanggal, trim(p_nama_penerima), v_no_hp, v_alamat,
    v_pelanggan_id, p_jumlah_karung, nullif(trim(p_isi_karung), ''),
    v_ekspedisi, trim(p_nama_pengirim),
    v_user_email, v_user_name
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- update_pengiriman: sama, resolvePelangganLink + update pengiriman jadi
-- 1 RPC atomik. Tidak ada kolom identitas di update (created_by tetap
-- punya pembuat asli), jadi tidak ada isu spoofing di sini -- cuma
-- non-atomicity yang dibereskan.
create or replace function public.update_pengiriman(
  p_id uuid,
  p_tanggal date,
  p_nama_penerima text,
  p_no_telp_penerima text,
  p_alamat text,
  p_pelanggan_id uuid,
  p_jumlah_karung integer,
  p_isi_karung text,
  p_nama_ekspedisi text,
  p_nama_pengirim text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pelanggan_id uuid := p_pelanggan_id;
  v_no_hp text := nullif(trim(p_no_telp_penerima), '');
  v_alamat text := nullif(trim(p_alamat), '');
  v_ekspedisi text := nullif(trim(p_nama_ekspedisi), '');
  v_row pengiriman%rowtype;
begin
  if p_id is null then
    raise exception 'id pengiriman wajib diisi.';
  end if;
  if p_tanggal is null then
    raise exception 'Tanggal wajib diisi.';
  end if;
  if coalesce(trim(p_nama_penerima), '') = '' then
    raise exception 'Nama penerima wajib diisi.';
  end if;
  if p_jumlah_karung is null or p_jumlah_karung <= 0 then
    raise exception 'Jumlah karung harus lebih dari 0.';
  end if;
  if v_ekspedisi is null then
    raise exception 'Nama ekspedisi wajib diisi.';
  end if;
  if coalesce(trim(p_nama_pengirim), '') = '' then
    raise exception 'Nama pengirim wajib diisi.';
  end if;

  begin
    if v_pelanggan_id is not null then
      update public.pelanggan
        set no_hp = coalesce(v_no_hp, no_hp),
            alamat = coalesce(v_alamat, alamat),
            ekspedisi_biasa = coalesce(v_ekspedisi, ekspedisi_biasa),
            updated_at = now()
        where id = v_pelanggan_id;
    else
      select id into v_pelanggan_id
        from public.pelanggan where nama ilike trim(p_nama_penerima) limit 1;

      if v_pelanggan_id is not null then
        update public.pelanggan
          set no_hp = coalesce(v_no_hp, no_hp),
              alamat = coalesce(v_alamat, alamat),
              ekspedisi_biasa = coalesce(v_ekspedisi, ekspedisi_biasa),
              updated_at = now()
          where id = v_pelanggan_id;
      else
        insert into public.pelanggan (nama, no_hp, alamat, ekspedisi_biasa, updated_at)
        values (trim(p_nama_penerima), v_no_hp, v_alamat, v_ekspedisi, now())
        returning id into v_pelanggan_id;
      end if;
    end if;
  exception when others then
    v_pelanggan_id := p_pelanggan_id;
  end;

  update public.pengiriman set
    tanggal = p_tanggal,
    nama_penerima = trim(p_nama_penerima),
    no_telp_penerima = v_no_hp,
    alamat = v_alamat,
    pelanggan_id = v_pelanggan_id,
    jumlah_karung = p_jumlah_karung,
    isi_karung = nullif(trim(p_isi_karung), ''),
    nama_ekspedisi = v_ekspedisi,
    nama_pengirim = trim(p_nama_pengirim)
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'Pengiriman tidak ditemukan.';
  end if;

  return to_jsonb(v_row);
end;
$$;
