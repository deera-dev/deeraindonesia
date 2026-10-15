-- Tracking toko potensial per daerah (permintaan Denny 2026-10: "kita
-- juga suka lupa, toko mana saja yang sudah di approach, dan daerah mana
-- saja yang sudah kita cover"). Dipakai apps/admin/src/features/
-- distribusi-sampel — tabel `toko` yang sama (sudah ada dari fitur
-- distribusi sampel) diperluas, BUKAN tabel baru, karena toko yang
-- dikirim sampel memang subset dari toko yang sudah di-approach.
alter table toko
  add column if not exists daerah text,
  add column if not exists media_sosial text,
  add column if not exists status_approach text not null default 'belum', -- belum | sudah
  add column if not exists kesan text; -- null | tertarik | belum_tertarik

-- Backfill 4 toko yang sudah ada: menurut Denny ini "beberapa contoh yang
-- berhasil" → sudah di-approach dan tertarik. "Indah Bordir Sidoarjo"
-- diberi daerah "Sidoarjo" karena eksplisit di namanya; toko lain dibiarkan
-- null (belum ada info daerah), diisi manual lewat form edit toko.
update toko set status_approach = 'sudah', kesan = 'tertarik'
where nama in ('UD Putra Toserba', 'Hara Boutique', 'Duta Square', 'Indah Bordir Sidoarjo');

update toko set daerah = 'Sidoarjo' where nama = 'Indah Bordir Sidoarjo';
