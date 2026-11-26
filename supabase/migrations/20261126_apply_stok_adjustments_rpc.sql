-- ============================================================
-- Migration — RPC apply_stok_adjustments()
--
-- Tujuan: mengubah penulisan stok dari jalur penjualan POS
-- (apps/pos/src/lib/sync.js, fungsi applyStokToSupabase — dipakai oleh
-- useCreateSale, useCreateRetur, useUpdateSale, useDeleteSale via
-- deleteSaleFromSupabase, dan flushPendingSales) dari pola client-side
-- "SELECT lalu UPDATE" (satu round-trip baca + satu round-trip tulis,
-- terpisah, per item) menjadi SATU statement UPDATE atomik per item,
-- dieksekusi dalam SATU panggilan RPC untuk seluruh batch adjustment.
--
-- Masalah yang diperbaiki: ada celah waktu antara SELECT (baca stok
-- saat ini) dan UPDATE (tulis stok baru) di kode lama — kalau proses
-- lain (approve transfer, stok opname, atau sale lain) mengubah baris
-- stok_warna yang sama di celah itu, perubahan itu tertimpa (lost
-- update). Pola ini SUDAH diperbaiki sebelumnya utk approve_transfer
-- (20260711_migration_phase1_rpc_approve_transfer.sql) dan
-- move_stok_lokasi (20261025_move_stok_lokasi_rpc.sql) — RPC ini
-- menerapkan pola atomik yang sama (EXECUTE format ... %I, GREATEST(0,
-- ...)) pada jalur penjualan yang sebelumnya terlewat.
--
-- Perilaku "best-effort" dari kode lama direplikasi: item dengan delta=0
-- atau field kode/size/warna kosong dilewati tanpa gagal. Lokasi divalidasi
-- terhadap allowlist yang sama (gudang/cideng/tegalgubug) sebelum dipakai
-- sbg nama kolom dinamis. Baris yang tidak ditemukan (kode+size+warna tidak
-- match) di-skip secara alami (UPDATE 0 baris, tanpa error) — sama seperti
-- .update().eq(...) di client lama yang diam-diam tidak mengubah apa pun
-- kalau tidak ada baris cocok.
--
-- Idempotent: CREATE OR REPLACE FUNCTION aman dijalankan berkali-kali.
-- Tidak mengubah migration lama, tidak membuat tabel/kolom/constraint/
-- trigger/view baru, tidak mengimplementasikan RPC lain.
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_stok_adjustments(p_adjustments jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_item            jsonb;
  v_kode            text;
  v_size            text;
  v_warna           text;
  v_location        text;
  v_delta           integer;
  v_valid_locations text[] := ARRAY['gudang', 'cideng', 'tegalgubug'];
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_adjustments, '[]'::jsonb))
  LOOP
    v_kode := v_item ->> 'kode';
    v_size := v_item ->> 'size';
    v_warna := v_item ->> 'warna';
    v_location := v_item ->> 'location';
    v_delta := COALESCE((v_item ->> 'delta')::integer, 0);

    IF v_delta = 0 OR v_kode IS NULL OR v_size IS NULL OR v_warna IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT (v_location = ANY(v_valid_locations)) THEN
      RAISE EXCEPTION 'Lokasi tidak valid: %', v_location;
    END IF;

    -- UPDATE atomik: baca+hitung+tulis jadi satu statement, menghilangkan
    -- celah lost-update yang ada di pola SELECT-lalu-UPDATE client lama.
    EXECUTE format(
      'UPDATE stok_warna SET %I = GREATEST(0, COALESCE(%I, 0) + $1), updated_at = now() WHERE kode = $2 AND size = $3 AND warna = $4',
      v_location, v_location
    ) USING v_delta, v_kode, v_size, v_warna;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Sama seperti approve_transfer/move_stok_lokasi — hanya authenticated
-- (RLS stok_warna sudah membatasi write ke role itu).
GRANT EXECUTE ON FUNCTION public.apply_stok_adjustments(jsonb) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'apply_stok_adjustments';
--
-- Cek grant:
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'apply_stok_adjustments';
