-- Size & kesimpulan terakhir yang dipakai saat cetak Work Order, supaya tidak hilang kalau WO dibuka/dicetak ulang.
alter table public.sampel
  add column if not exists wo_sizes jsonb default '[]'::jsonb,
  add column if not exists wo_catatan text;
comment on column public.sampel.wo_sizes is 'Size terakhir yang dicentang saat cetak Work Order (prefill WorkOrderModal).';
comment on column public.sampel.wo_catatan is 'Kesimpulan Penting terakhir yang diisi saat cetak Work Order (prefill WorkOrderModal).';
