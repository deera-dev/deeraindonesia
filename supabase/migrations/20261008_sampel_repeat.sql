-- Planning Repeat: model mengikuti PRODUK JADI (products, punya kode).
-- Repeat bisa di-approve langsung tanpa membuat sampel fisik baru.
alter table public.sampel
  add column if not exists is_repeat boolean not null default false,
  add column if not exists repeat_dari_id uuid,   -- products.id
  add column if not exists repeat_dari_kode text; -- products.kode
comment on column public.sampel.is_repeat is 'Planning repeat: model ikut produk jadi (approve tanpa sampel baru).';
