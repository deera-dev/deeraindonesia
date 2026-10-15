-- Seed 4 toko (permintaan Denny 2026-10) + riwayat lengkap UD Putra
-- Toserba (56 kode, dari laporan manual yang sudah ada — lihat screenshot
-- "PESANAN ORDER UD PUTRA TOSERBA": Dikirim 56, Dipilih 24, Tidak dipilih
-- 32). 3 toko lain (Hara Boutique, Duta Square, Indah Bordir Sidoarjo)
-- dibuat kosong — riwayat kirim dicatat mulai sekarang via aplikasi.
do $$
declare
  v_toko_id uuid;
  v_kiriman_id uuid;
begin
  insert into toko (nama, catatan) values ('UD Putra Toserba', 'Data awal diimpor dari laporan manual 2026-10.')
    returning id into v_toko_id;

  insert into sampel_kiriman (toko_id, tanggal, catatan)
    values (v_toko_id, current_date, 'Impor riwayat awal dari laporan manual (56 kode).')
    returning id into v_kiriman_id;

  insert into sampel_kiriman_item (kiriman_id, toko_id, kode, status)
  select v_kiriman_id, v_toko_id, kode, status
  from (values
    ('D 1 DNM','tidak_dipilih'),('D 2 DNM','tidak_dipilih'),('D 3 DNM','tidak_dipilih'),
    ('D 4 LRS','tidak_dipilih'),('D 5 LRS','tidak_dipilih'),('D 6 LRS','tidak_dipilih'),
    ('D 7 LDN','tidak_dipilih'),('D 9 LDN','tidak_dipilih'),
    ('D 10 ZUR','dipilih'),('D 11 ZUR','dipilih'),
    ('D 13 POL','tidak_dipilih'),
    ('D 16 KBR','tidak_dipilih'),('D 17 KBR','tidak_dipilih'),('D 18 KBR','tidak_dipilih'),
    ('D 25 HMS','dipilih'),('D 26 HMS','tidak_dipilih'),
    ('D 28 SFN','dipilih'),('D 29 SFN','dipilih'),
    ('D 30 KBR','tidak_dipilih'),('D 31 KBR','dipilih'),
    ('D 32 POL','tidak_dipilih'),('D 33 POL','tidak_dipilih'),
    ('D 34 SWI','dipilih'),('D 35 SWI','dipilih'),('D 36 SWI','dipilih'),
    ('D 37 KBR','dipilih'),('D 38 KBR','tidak_dipilih'),
    ('D 41 STL','dipilih'),
    ('D 42 LDN','dipilih'),('D 43 LDN','tidak_dipilih'),('D 45 LDN','dipilih'),
    ('D 51 LBR','dipilih'),
    ('D 64 SFN','dipilih'),
    ('D 70 JTB','dipilih'),('D 71 JTB','dipilih'),('D 72 JTB','dipilih'),
    ('D 74 PRS','tidak_dipilih'),
    ('D 76 JAQ','tidak_dipilih'),('D 77 JAQ','dipilih'),('D 78 JAQ','tidak_dipilih'),
    ('D 79 JAQ','tidak_dipilih'),('D 80 JAQ','dipilih'),
    ('D 81 SFN','tidak_dipilih'),('D 82 SFN','tidak_dipilih'),('D 83 SFN','tidak_dipilih'),('D 84 SFN','tidak_dipilih'),
    ('D 85 TUL','dipilih'),('D 86 TUL','tidak_dipilih'),('D 87 TUL','dipilih'),
    ('D 88 GEN','tidak_dipilih'),('D 90 GEN','tidak_dipilih'),
    ('D 91 SWI','tidak_dipilih'),('D 92 SWI','dipilih'),('D 93 SWI','dipilih'),
    ('D 94 URA','tidak_dipilih'),('D 95 URA','tidak_dipilih')
  ) as t(kode, status);

  insert into toko (nama) values ('Hara Boutique');
  insert into toko (nama) values ('Duta Square');
  insert into toko (nama) values ('Indah Bordir Sidoarjo');
end $$;
