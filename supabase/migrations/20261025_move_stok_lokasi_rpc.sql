-- ============================================================
-- Migration — RPC move_stok_lokasi()
--
-- Request: "Tambahkan pilihan stock pindahkan ke salah satu lokasi semua,
-- misal mau reset stock cideng -> pindahkan stock cideng ke gudang > tapi
-- harus input password dulu ya, jadi protected".
--
-- Memindahkan SELURUH stok (semua kode/size/warna) dari satu lokasi ke
-- lokasi lain dalam SATU transaksi atomik: lokasi tujuan ditambah,
-- lokasi asal di-nol-kan. Password check dilakukan di client (re-auth via
-- supabase.auth.signInWithPassword, lihat packages/shared/features/auth)
-- SEBELUM RPC ini dipanggil — RPC ini sendiri hanya bisa dipanggil oleh
-- authenticated (sama seperti approve_transfer), tidak menyimpan/memverifikasi
-- password apa pun di database.
--
-- Pola dynamic column (EXECUTE format ... %I) + allowlist lokasi sama
-- persis seperti approve_transfer() di
-- 20260711_migration_phase1_rpc_approve_transfer.sql.
-- ============================================================

CREATE OR REPLACE FUNCTION public.move_stok_lokasi(
  p_from text,
  p_to text,
  p_actor_email text,
  p_actor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_valid_locations text[] := ARRAY['gudang', 'cideng', 'tegalgubug'];
  v_total_moved      integer := 0;
  v_rows_affected    integer := 0;
BEGIN
  IF NOT (p_from = ANY(v_valid_locations)) THEN
    RAISE EXCEPTION 'Lokasi asal tidak valid: %', p_from;
  END IF;
  IF NOT (p_to = ANY(v_valid_locations)) THEN
    RAISE EXCEPTION 'Lokasi tujuan tidak valid: %', p_to;
  END IF;
  IF p_from = p_to THEN
    RAISE EXCEPTION 'Lokasi asal dan tujuan tidak boleh sama.';
  END IF;

  EXECUTE format('SELECT COALESCE(SUM(%I), 0) FROM stok_warna WHERE COALESCE(%I, 0) > 0', p_from, p_from)
  INTO v_total_moved;

  -- Satu UPDATE atomik: tujuan ditambah, asal di-nol-kan, hanya baris yang
  -- punya stok > 0 di lokasi asal yang disentuh.
  EXECUTE format(
    'UPDATE stok_warna SET %I = COALESCE(%I, 0) + COALESCE(%I, 0), %I = 0, updated_at = now() WHERE COALESCE(%I, 0) > 0',
    p_to, p_to, p_from, p_from, p_from
  );
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  BEGIN
    INSERT INTO product_history (
      action, category, kode, nama, snapshot, before_snapshot, user_email, user_name
    ) VALUES (
      'pindah-stok-lokasi',
      'stok',
      '-',
      p_from || ' → ' || p_to || ' · ' || v_total_moved::text || ' pcs (' || v_rows_affected::text || ' baris)',
      jsonb_build_object('from', p_from, 'to', p_to, 'total_pcs', v_total_moved, 'rows', v_rows_affected),
      NULL,
      p_actor_email,
      p_actor_name
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- best-effort, sama seperti pola logTransfer/approve_transfer
  END;

  RETURN jsonb_build_object('success', true, 'total_pcs', v_total_moved, 'rows', v_rows_affected);
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_stok_lokasi(text, text, text, text) TO authenticated;
