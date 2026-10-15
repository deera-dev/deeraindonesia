-- Fitur Blast (Admin) — kirim penawaran produk ke calon customer / pelanggan
-- existing, dibantu sistem (klik satu-satu buka WA Web, ditandai terkirim).
-- Lihat apps/admin/src/features/blast dan features/calon-customer.

create table if not exists calon_customer (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  no_hp text,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blast_campaign (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  product_kodes jsonb not null default '[]'::jsonb,
  message text not null default '',
  status text not null default 'draft', -- draft | berjalan | selesai
  created_at timestamptz not null default now(),
  created_by_email text,
  created_by_name text
);

create table if not exists blast_target (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references blast_campaign(id) on delete cascade,
  source text not null, -- 'pelanggan' | 'calon'
  contact_id uuid,
  nama text not null,
  no_hp text,
  status text not null default 'pending', -- pending | terkirim | dilewati
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists blast_target_campaign_idx on blast_target(campaign_id);

alter table calon_customer enable row level security;
alter table blast_campaign enable row level security;
alter table blast_target enable row level security;

create policy "calon_customer authenticated select" on calon_customer for select using (auth.role() = 'authenticated');
create policy "calon_customer authenticated insert" on calon_customer for insert with check (auth.role() = 'authenticated');
create policy "calon_customer authenticated update" on calon_customer for update using (auth.role() = 'authenticated');
create policy "calon_customer authenticated delete" on calon_customer for delete using (auth.role() = 'authenticated');

create policy "blast_campaign authenticated select" on blast_campaign for select using (auth.role() = 'authenticated');
create policy "blast_campaign authenticated insert" on blast_campaign for insert with check (auth.role() = 'authenticated');
create policy "blast_campaign authenticated update" on blast_campaign for update using (auth.role() = 'authenticated');
create policy "blast_campaign authenticated delete" on blast_campaign for delete using (auth.role() = 'authenticated');

create policy "blast_target authenticated select" on blast_target for select using (auth.role() = 'authenticated');
create policy "blast_target authenticated insert" on blast_target for insert with check (auth.role() = 'authenticated');
create policy "blast_target authenticated update" on blast_target for update using (auth.role() = 'authenticated');
create policy "blast_target authenticated delete" on blast_target for delete using (auth.role() = 'authenticated');
