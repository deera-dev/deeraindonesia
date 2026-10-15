-- Tambah kolom kasbon_deductions ke gajian_minggu
-- Menyimpan potongan kasbon per karyawan yang akan diterapkan saat finalisasi
ALTER TABLE gajian_minggu
  ADD COLUMN IF NOT EXISTS kasbon_deductions jsonb DEFAULT '[]';
