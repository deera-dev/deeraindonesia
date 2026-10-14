-- Work Order selesai: sampel approved yang WO-nya sudah beres dipindah ke tab "Selesai".
alter table public.sampel
  add column if not exists wo_selesai_at timestamptz;
comment on column public.sampel.wo_selesai_at is 'Waktu Work Order ditandai selesai (null = belum). Dipakai tab Selesai di Planning.';
