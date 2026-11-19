-- karyawan_id di gaji_finishing sudah ada dari migrasi 20261109_add_karyawan_id_to_gaji_finishing.sql
-- (dipakai untuk atribusi Beli Gas ke karyawan Finishing di Ringkasan Gajian) - tambah index saja.
create index if not exists idx_finishing_karyawan on gaji_finishing(karyawan_id);
