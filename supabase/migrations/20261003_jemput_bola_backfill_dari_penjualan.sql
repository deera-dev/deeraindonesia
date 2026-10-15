-- Backfill riwayat "dipilih" utk Hara Boutique, Duta Square, Indah Bordir
-- Sidoarjo (permintaan Denny 2026-10: "ambil data dari penjualan aja,
-- mereka udah ambil produk kode apa aja") — toko ini sudah pernah
-- transaksi beli nyata (tabel sales), jadi kode yang mereka beli otomatis
-- ditandai "dipilih" di riwayat sampel, bukan dibiarkan kosong.
do $$
declare
  r record;
  v_kiriman_id uuid;
  v_toko_id uuid;
  v_kode text;
begin
  for r in (
    select t.id as toko_id, t.nama as toko_nama,
      min(s.date) as tanggal_pertama,
      array_agg(distinct (elem->>'kode')) as kodes
    from toko t
    join sales s on upper(s.buyer_name) = upper(t.nama)
    cross join lateral jsonb_array_elements(s.items) elem
    where t.nama in ('Hara Boutique', 'Duta Square', 'Indah Bordir Sidoarjo')
    group by t.id, t.nama
  ) loop
    v_toko_id := r.toko_id;

    insert into sampel_kiriman (toko_id, tanggal, catatan)
    values (
      v_toko_id,
      r.tanggal_pertama,
      'Diambil dari riwayat transaksi penjualan (toko sudah pernah beli kode-kode ini).'
    )
    returning id into v_kiriman_id;

    foreach v_kode in array r.kodes loop
      insert into sampel_kiriman_item (kiriman_id, toko_id, kode, status)
      values (v_kiriman_id, v_toko_id, v_kode, 'dipilih');
    end loop;
  end loop;
end $$;
