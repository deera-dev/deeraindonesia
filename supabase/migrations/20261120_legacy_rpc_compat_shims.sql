-- INSIDEN PRODUCTION (2026-11-20) — admin.deera.id (deploy dari `main`)
-- masih menjalankan bundle frontend LAMA yang manggil approve_transfer()
-- dgn signature lama (p_transfer_id, p_approver_email, p_approver_name),
-- sementara migration 20261120 di sesi M4 ini sudah ganti RPC-nya jadi
-- 1 parameter (p_transfer_id saja, identitas dari auth.uid()). Branch
-- kerja M4 belum di-merge ke main, jadi frontend production belum ikut
-- update sementara database (lewat Supabase MCP, langsung ke prod) sudah
-- berubah duluan — approve transfer gagal total di production dengan
-- PGRST202 ("Could not find the function").
--
-- move_stok_lokasi kena masalah SAMA PERSIS (4 parameter lama ->
-- 2 parameter baru) — diperbaiki sekaligus di sini SEBELUM ada laporan
-- error, supaya gak kena insiden kedua yang identik.
--
-- Fix: tambah overload lama sebagai SHIM tipis yang cuma delegasi ke
-- versi baru (abaikan parameter identitas lama — itu justru lubang
-- keamanan yang sudah diperbaiki, bukan dipakai lagi). Aman ditambah
-- (CREATE, bukan REPLACE) karena beda JUMLAH parameter dari versi baru,
-- jadi Postgres bisa resolve tanpa ambigu (beda dari insiden
-- delete_product_cascade yang overlap gara-gara DEFAULT parameter).
--
-- Shim ini boleh dihapus setelah branch M4 di-merge & dideploy ke
-- production (frontend lama sudah gak terpakai lagi).
create or replace function public.approve_transfer(
  p_transfer_id uuid,
  p_approver_email text,
  p_approver_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  return public.approve_transfer(p_transfer_id);
end;
$$;

create or replace function public.move_stok_lokasi(
  p_from text,
  p_to text,
  p_actor_email text,
  p_actor_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  return public.move_stok_lokasi(p_from, p_to);
end;
$$;
