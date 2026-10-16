-- WO Sampel dibuat → kartu planning pindah ke step Sampel
alter table public.sampel add column if not exists wo_sampel_at timestamptz;
