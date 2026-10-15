-- Keep (barang disisihkan untuk pembeli, BELUM dibayar) — permintaan Denny
-- 2026-10. Sengaja tabel terpisah dari `sales`: keep BUKAN penjualan, tidak
-- mengurangi stok dan tidak masuk omzet/laporan sampai dibayar. Saat dibayar,
-- POS membuat transaksi `sales` biasa (stok berkurang, masuk laporan, struk
-- LUNAS) lalu menandai keep ini 'lunas'.
--   items jsonb: format sama persis dgn sales.items (payload keranjang kasir)

create table if not exists keep_orders (
  id               uuid primary key default gen_random_uuid(),
  date             date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  location         text,
  buyer_name       text,
  buyer_hp         text,
  pelanggan_id     uuid,
  items            jsonb not null default '[]'::jsonb,
  discount         integer not null default 0,
  total            integer not null default 0,
  catatan          text,
  status           text not null default 'aktif' check (status in ('aktif','lunas','batal')),
  paid_at          timestamptz,
  created_by_email text,
  created_by_name  text
);

create index if not exists keep_orders_status_idx on keep_orders (status, created_at desc);

alter table keep_orders enable row level security;

create policy "keep_orders authenticated select" on keep_orders for select using (auth.role() = 'authenticated');
create policy "keep_orders authenticated insert" on keep_orders for insert with check (auth.role() = 'authenticated');
create policy "keep_orders authenticated update" on keep_orders for update using (auth.role() = 'authenticated');
create policy "keep_orders authenticated delete" on keep_orders for delete using (auth.role() = 'authenticated');
