-- Jadwal Ngorder (permintaan Denny 2026-10): rencana perjalanan ngorder —
-- daerah tujuan, rentang tanggal, sampel yg dibawa, toko yg mau dimampiri,
-- modal awal + biaya terpakai (bensin/tol/makan/dst), dan siapa yg berangkat.
-- Daftar sampel/toko/biaya disimpan sbg jsonb di baris yg sama (1 query,
-- 1 update) krn selalu dibaca/ditulis bersama satu jadwal:
--   sampel jsonb: [{kode, nama, qty, terbagi}]
--   toko   jsonb: [{toko_id, nama, daerah, dikunjungi}]   (nama = snapshot)
--   biaya  jsonb: [{id, tanggal, kategori, jumlah, catatan}]

create table if not exists ngorder_trip (
  id               uuid primary key default gen_random_uuid(),
  nama             text not null,
  tanggal_mulai    date not null,
  tanggal_selesai  date not null,
  daerah           jsonb not null default '[]'::jsonb,
  peserta          jsonb not null default '[]'::jsonb,
  modal_awal       bigint not null default 0,
  status           text not null default 'rencana'
                   check (status in ('rencana','berjalan','selesai','batal')),
  sampel           jsonb not null default '[]'::jsonb,
  toko             jsonb not null default '[]'::jsonb,
  biaya            jsonb not null default '[]'::jsonb,
  catatan          text,
  created_by_email text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (tanggal_selesai >= tanggal_mulai)
);

create index if not exists ngorder_trip_mulai_idx on ngorder_trip (tanggal_mulai desc);

alter table ngorder_trip enable row level security;

create policy "ngorder_trip authenticated select" on ngorder_trip for select using (auth.role() = 'authenticated');
create policy "ngorder_trip authenticated insert" on ngorder_trip for insert with check (auth.role() = 'authenticated');
create policy "ngorder_trip authenticated update" on ngorder_trip for update using (auth.role() = 'authenticated');
create policy "ngorder_trip authenticated delete" on ngorder_trip for delete using (auth.role() = 'authenticated');
