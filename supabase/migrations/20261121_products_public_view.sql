-- PR-007 (docs/product/pr-plan.md): safe anon-facing read surface for
-- products, excluding hpp (internal cost price). security_invoker is left
-- at its default (false) on purpose: this view must keep working for anon
-- even after PR-009 later revokes anon's direct SELECT on the base
-- products table -- it runs as the view owner, not the caller.
create or replace view public.products_public as
select
  kode,
  nama,
  bahan,
  image,
  video,
  seri_warna,
  detail,
  variants,
  warna,
  warna_images,
  position,
  created_at
from public.products;

grant select on public.products_public to anon, authenticated;
