-- M4 (produksi-record) — deleteBatchAndProduct() di
-- apps/admin/src/features/produksi-record/api.js duplikat PERSIS cascade
-- delete_product_cascade (5 tabel, urutan sama) tapi ditulis ulang
-- sebagai 5 panggilan supabase.from() berurutan TANPA cek error sama
-- sekali (bukan cuma tanpa transaction — errornya juga ditelan diam-diam).
-- Daripada duplikat RPC lagi, deleteBatchAndProduct sekarang delegasi ke
-- deleteProductCascade() yang sudah ada (produk-crud -> ini) — satu-satunya
-- beda, snapshot history butuh marker "sumber: produksi" (ditampilkan di
-- HistoryDetailModal sebagai "Dari: produksi") supaya tetap bisa dibedakan
-- dari delete lewat halaman Admin biasa.
--
-- p_sumber optional (default null). PENTING: CREATE OR REPLACE TIDAK
-- cukup di sini — nambah parameter (meski ada default) tetap dianggap
-- signature BEDA oleh Postgres, jadinya bikin OVERLOAD baru (2 fungsi
-- delete_product_cascade sekaligus: 1-arg lama + 2-arg baru), bukan
-- replace in-place. Overload ganda ini bikin ambigu buat caller yang
-- cuma kirim p_kode (produk-crud dari halaman Admin) — HARUS drop versi
-- lama dulu, baru create versi baru (sama kayak fix move_stok_lokasi/
-- approve_transfer sebelumnya di sesi ini).
--
-- SUDAH DIJALANKAN ke production (2026-11-20): drop + create berhasil,
-- diverifikasi lewat BEGIN/ROLLBACK (panggilan p_kode saja & p_kode+
-- p_sumber, keduanya resolve tanpa ambigu, history ikut benar).
drop function if exists public.delete_product_cascade(text);

create or replace function public.delete_product_cascade(p_kode text, p_sumber text default null)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_nama text;
  v_user_email text;
  v_user_name text;
begin
  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_user_email, v_user_name
  from public.profiles where id = auth.uid();

  select nama into v_nama from public.products where kode = p_kode;

  delete from public.produksi_batch where kode_produk = p_kode;
  delete from public.expected_stok where kode = p_kode;
  delete from public.hpp_template where kode_produk = p_kode;
  delete from public.stok_warna where kode = p_kode;
  delete from public.products where kode = p_kode;

  insert into public.product_history
    (action, category, kode, nama, snapshot, user_email, user_name)
  values
    ('hapus', 'produk', p_kode, coalesce(v_nama, p_kode),
     case when p_sumber is not null then jsonb_build_object('kode', p_kode, 'sumber', p_sumber) else null end,
     v_user_email, v_user_name);

  return jsonb_build_object('kode', p_kode, 'nama', coalesce(v_nama, p_kode));
end;
$$;
