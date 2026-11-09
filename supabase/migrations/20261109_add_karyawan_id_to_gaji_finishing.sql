-- Finishing dulu cuma 1 entri gabungan per periode, tanpa tau siapa orangnya,
-- jadi gak bisa muncul di ringkasan transfer-per-karyawan (laporan user 2026-11-09).
-- Dikerjakan 1 orang tetap per minggu - cukup 1 kolom, bukan pecah per-item.
alter table public.gaji_finishing add column karyawan_id uuid references public.karyawan(id);
