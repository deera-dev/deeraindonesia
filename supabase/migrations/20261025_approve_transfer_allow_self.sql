-- ============================================================
-- Migration — approve_transfer() boleh self-approve
--
-- Request: "acc transfer ga perlu beda orang, misal dika buat transfer,
-- dika juga bisa accept" — hapus validasi "approver tidak boleh sama
-- dengan created_by" yang ditambahkan di
-- 20260711_migration_phase1_rpc_approve_transfer.sql.
--
-- Hanya menghapus 1 blok validasi (self-approve). Validasi lain (status
-- harus pending, lock baris, pindah stok atomik, audit log best-effort)
-- TIDAK berubah. rejectTransfer() tetap melarang self-reject di client
-- (packages/shared/features/transfers/api.js) — request ini hanya
-- menyebut approve, reject tidak diminta berubah.
--
-- Idempotent: CREATE OR REPLACE FUNCTION aman dijalankan berkali-kali.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_transfer(
  p_transfer_id uuid,
  p_approver_email text,
  p_approver_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_transfer        transfers%ROWTYPE;
  v_before          jsonb;
  v_item            jsonb;
  v_kode            text;
  v_size            text;
  v_warna           text;
  v_qty             integer;
  v_row_id          uuid;
  v_from            text;
  v_to              text;
  v_total_qty       integer := 0;
  v_updated_rows    integer;
  v_valid_locations text[] := ARRAY['gudang', 'cideng', 'tegalgubug'];
BEGIN
  -- Kunci baris transfer supaya dua approve bersamaan tidak lolos
  -- validasi status secara bersamaan (inti perbaikan race condition).
  SELECT * INTO v_transfer FROM transfers WHERE id = p_transfer_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer tidak ditemukan.';
  END IF;

  IF v_transfer.status <> 'pending' THEN
    RAISE EXCEPTION 'Transfer sudah tidak bisa di-approve.';
  END IF;

  -- Self-approve DIBOLEHKAN sekarang — validasi "approver != created_by"
  -- yang ada di migration sebelumnya sengaja dihapus di sini.

  -- Snapshot "before" untuk riwayat — diambil SEBELUM status diubah,
  -- persis seperti `before: transfer` (objek transfer asli sebelum
  -- approve) di JS lama.
  v_before := to_jsonb(v_transfer);
  v_from := v_transfer.from_location;
  v_to := v_transfer.to_location;

  IF NOT (v_from = ANY(v_valid_locations)) THEN
    RAISE EXCEPTION 'from_location tidak valid: %', v_from;
  END IF;

  -- Total qty untuk teks riwayat — dihitung dari SELURUH item, persis
  -- seperti `items.reduce((s,i)=>s+(i.qty??0),0)` di JS lama (termasuk
  -- item qty<=0 kalau ada, walau item itu tidak diproses ke stok).
  SELECT COALESCE(SUM(COALESCE((elem ->> 'qty')::integer, 0)), 0)
  INTO v_total_qty
  FROM jsonb_array_elements(v_transfer.items) elem;

  -- 1. Update status transfer
  UPDATE transfers
  SET status = 'approved',
      approved_by = p_approver_email,
      approved_at = now()
  WHERE id = p_transfer_id
    AND status = 'pending';

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  IF v_updated_rows = 0 THEN
    RAISE EXCEPTION 'Transfer sudah tidak bisa di-approve.';
  END IF;

  -- 2. Pindah stok per item — pengganti loop SELECT+UPDATE terpisah di client
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_transfer.items)
  LOOP
    v_kode := v_item ->> 'kode';
    v_size := v_item ->> 'size';
    v_warna := NULLIF(v_item ->> 'warna', '');
    v_qty := COALESCE((v_item ->> 'qty')::integer, 0);

    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_row_id
    FROM stok_warna
    WHERE kode = v_kode
      AND size = v_size
      AND ((v_warna IS NULL AND warna IS NULL) OR warna = v_warna)
    LIMIT 1;

    IF v_row_id IS NULL THEN
      -- Sama seperti console.warn + continue di JS lama: item dilewati,
      -- tidak menggagalkan seluruh proses approve.
      CONTINUE;
    END IF;

    IF v_to = ANY(v_valid_locations) THEN
      EXECUTE format(
        'UPDATE stok_warna SET %I = GREATEST(0, COALESCE(%I, 0) - $1), %I = COALESCE(%I, 0) + $1, updated_at = now() WHERE id = $2',
        v_from, v_from, v_to, v_to
      ) USING v_qty, v_row_id;
    ELSE
      EXECUTE format(
        'UPDATE stok_warna SET %I = GREATEST(0, COALESCE(%I, 0) - $1), updated_at = now() WHERE id = $2',
        v_from, v_from
      ) USING v_qty, v_row_id;
    END IF;
  END LOOP;

  -- 3. Catat riwayat — best-effort, TIDAK membatalkan approve kalau gagal
  -- (meniru `.catch(() => {})` pada logTransfer() di client lama, lewat
  -- sub-block EXCEPTION di PL/pgSQL).
  BEGIN
    INSERT INTO product_history (
      action, category, kode, nama, snapshot, before_snapshot, user_email, user_name
    ) VALUES (
      'transfer-approve',
      'transfer',
      v_transfer.transfer_no,
      v_from || ' → ' || v_to || ' · ' || v_total_qty::text || ' pcs',
      v_before || jsonb_build_object('status', 'approved', 'approved_by', p_approver_email),
      v_before,
      p_approver_email,
      p_approver_name
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- best-effort, sama seperti logTransfer() di client
  END;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_transfer(uuid, text, text) TO authenticated;
