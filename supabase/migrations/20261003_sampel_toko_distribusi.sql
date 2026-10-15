-- Distribusi Sampel ke Toko (permintaan Denny 2026-10): tracking sampel
-- fisik yang dibawa tim sales jemput bola ke toko/mitra (UD Putra Toserba,
-- Hara Boutique, Duta Square, Indah Bordir Sidoarjo, dst) — kode apa yang
-- sudah dikirim, mana yang DIPILIH (toko ambil/beli), mana yang TIDAK
-- DIPILIH (dikirim tapi tidak diambil), dan mana yang BELUM dikirim sama
-- sekali (dihitung dari selisih dgn katalog produk). Lihat
-- apps/admin/src/features/distribusi-sampel.

create table if not exists toko (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text,
  kontak_nama text,
  no_hp text,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sampel_kiriman (
  id uuid primary key default gen_random_uuid(),
  toko_id uuid not null references toko(id) on delete cascade,
  tanggal date not null default current_date,
  catatan text,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists sampel_kiriman_item (
  id uuid primary key default gen_random_uuid(),
  kiriman_id uuid not null references sampel_kiriman(id) on delete cascade,
  toko_id uuid not null references toko(id) on delete cascade,
  kode text not null,
  nama text,
  status text not null default 'pending', -- pending | dipilih | tidak_dipilih
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists sampel_kiriman_toko_idx on sampel_kiriman(toko_id);
create index if not exists sampel_kiriman_item_kiriman_idx on sampel_kiriman_item(kiriman_id);
create index if not exists sampel_kiriman_item_toko_idx on sampel_kiriman_item(toko_id);

alter table toko enable row level security;
alter table sampel_kiriman enable row level security;
alter table sampel_kiriman_item enable row level security;

create policy "toko authenticated select" on toko for select using (auth.role() = 'authenticated');
create policy "toko authenticated insert" on toko for insert with check (auth.role() = 'authenticated');
create policy "toko authenticated update" on toko for update using (auth.role() = 'authenticated');
create policy "toko authenticated delete" on toko for delete using (auth.role() = 'authenticated');

create policy "sampel_kiriman authenticated select" on sampel_kiriman for select using (auth.role() = 'authenticated');
create policy "sampel_kiriman authenticated insert" on sampel_kiriman for insert with check (auth.role() = 'authenticated');
create policy "sampel_kiriman authenticated update" on sampel_kiriman for update using (auth.role() = 'authenticated');
create policy "sampel_kiriman authenticated delete" on sampel_kiriman for delete using (auth.role() = 'authenticated');

create policy "sampel_kiriman_item authenticated select" on sampel_kiriman_item for select using (auth.role() = 'authenticated');
create policy "sampel_kiriman_item authenticated insert" on sampel_kiriman_item for insert with check (auth.role() = 'authenticated');
create policy "sampel_kiriman_item authenticated update" on sampel_kiriman_item for update using (auth.role() = 'authenticated');
create policy "sampel_kiriman_item authenticated delete" on sampel_kiriman_item for delete using (auth.role() = 'authenticated');
