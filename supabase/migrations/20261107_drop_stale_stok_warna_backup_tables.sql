-- Hapus 6 tabel snapshot manual stok_warna (Okt 2026) - tidak direferensi kode
-- manapun, koreksi data yang jadi alasannya dibuat sudah lewat ~3 minggu tanpa
-- laporan masalah susulan. Ditemukan & diverifikasi saat audit skema untuk
-- rencana rewrite stack (lihat CLAUDE.md / migration-plan.md).
drop table if exists public.stok_warna_backup_20261015;
drop table if exists public.stok_warna_backup2_20261015;
drop table if exists public.stok_warna_backup3_20261015;
drop table if exists public.stok_warna_backup4_20261016;
drop table if exists public.stok_warna_backup5_20261016;
drop table if exists public.stok_warna_backup6_20261016;
