create table if not exists toko_kunjungan (
  id uuid primary key default gen_random_uuid(),
  toko_id uuid not null references toko(id) on delete cascade,
  status text not null default 'rencana' check (status in ('rencana', 'berlangsung', 'selesai', 'batal')),
  aktif boolean not null default true,
  hasil text,
  request text,
  kesan text check (kesan is null or kesan in ('tertarik', 'belum_tertarik')),
  dipilih_oleh_email text,
  dipilih_oleh_nama text,
  diubah_oleh_email text,
  diubah_oleh_nama text,
  mulai_at timestamptz,
  selesai_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists toko_kunjungan_aktif_uniq on toko_kunjungan (toko_id) where aktif;
create index if not exists toko_kunjungan_toko_idx on toko_kunjungan (toko_id, created_at desc);

alter table toko_kunjungan enable row level security;
create policy "toko_kunjungan authenticated select" on toko_kunjungan for select using (auth.role() = 'authenticated');
create policy "toko_kunjungan authenticated insert" on toko_kunjungan for insert with check (auth.role() = 'authenticated');
create policy "toko_kunjungan authenticated update" on toko_kunjungan for update using (auth.role() = 'authenticated');
create policy "toko_kunjungan authenticated delete" on toko_kunjungan for delete using (auth.role() = 'authenticated');

alter table toko_kunjungan replica identity full;
alter table toko replica identity full;
alter publication supabase_realtime add table toko_kunjungan;
alter publication supabase_realtime add table toko;
