alter table keep_orders drop constraint if exists keep_orders_status_check;
alter table keep_orders add constraint keep_orders_status_check
  check (status = any (array['aktif'::text, 'terkirim'::text, 'lunas'::text, 'batal'::text]));
alter table keep_orders add column if not exists stok_adjustments jsonb;
alter table keep_orders add column if not exists delivered_at timestamptz;
comment on column keep_orders.stok_adjustments is 'Penyesuaian stok (sama format sales.stok_adjustments) yang diterapkan saat keep ditandai terkirim; dipakai utk kembalikan stok kalau keep dibatalkan setelah terkirim, dan disalin ke sales.stok_adjustments saat keep dibayar (tanpa menerapkan ulang).';
comment on column keep_orders.delivered_at is 'Waktu keep ditandai terkirim (stok sudah dikurangi sejak saat ini, walau belum dibayar).';
