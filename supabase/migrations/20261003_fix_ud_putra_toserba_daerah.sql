-- UD Putra Toserba (satu-satunya toko lama yang tercatat lengkap sejak
-- awal sebelum fitur daerah/approach ada) belum pernah diisi kolom
-- `daerah` sehingga muncul di grup "Belum Ditentukan" di UI meski 3 toko
-- lain sudah (LAMPUNG/SIDOARJO). Alamatnya jelas "... Kabupaten Majalengka,
-- Jawa Barat 45476" -> isi "MAJALENGKA", konsisten gaya penulisan daerah
-- yang sudah ada (huruf besar semua).
update toko
set daerah = 'MAJALENGKA', updated_at = now()
where nama = 'UD Putra Toserba' and daerah is null;
