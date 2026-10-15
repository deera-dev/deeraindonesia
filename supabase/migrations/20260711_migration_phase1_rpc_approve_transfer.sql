-- ============================================================
-- Migration Phase 1 — RPC approve_transfer()
--
-- Tujuan: mengubah proses approve transfer stok menjadi SATU transaksi
-- atomik di PostgreSQL, menggantikan pola client-side lama di
-- packages/shared/features/transfers/api.js (fungsi approveTransfer):
--   1. UPDATE transfers (status)
--   2. loop per item: SELECT stok_warna -> UPDATE stok_warna  (N+1)
--   3. INSERT product_history (best-effort)
--
-- Masalah yang diperbaiki (lihat LAPORAN_AUDIT_READ_LAYER_PHASE1.md §3.2):
--   - N+1 query: transfer dengan K item = 2K+ round-trip terpisah.
--   - Read-then-write tidak atomik: ada celah waktu antara SELECT dan
--     UPDATE stok_warna di mana proses lain (approve transfer lain,
--     stok opname) bisa mengubah baris yang sama -> lost update.
--   - Validasi status "pending" dilakukan di client memakai objek
--     `transfer` yang bisa saja SUDAH STALE (bukan hasil fetch ulang),
--     sehingga dua approve bersamaan bisa sama-sama lolos validasi.
--
-- Business logic yang direplikasi 1:1 dari versi JS lama (lihat laporan
-- migration untuk detail baris-per-baris):
--   - Transfer harus berstatus 'pending', selain itu ditolak dengan
--     pesan error YANG SAMA PERSIS.
--   - Approver tidak boleh sama dengan created_by (self-approve),
--     pesan error YANG SAMA PERSIS.
--   - Stok dikurangi dari from_location, tidak boleh negatif
--     (GREATEST(0, ...), sama seperti Math.max(0, ...) di JS).
--   - Stok ditambah ke to_location HANYA jika to_location termasuk
--     LOCATIONS = gudang/cideng/tegalgubug (lokasi custom seperti
--     "reseller-budi" tidak punya kolom di stok_warna, jadi hanya
--     from_location yang dikurangi).
--   - Item dengan qty <= 0 dilewati (tidak memicu query stok_warna).
--   - Item yang baris stok_warna-nya tidak ditemukan (termasuk kasus
--     item tanpa warna — kolom stok_warna.warna bertipe NOT NULL,
--     sehingga kondisi `warna IS NULL` yang dipakai JS lama tidak
--     akan pernah match baris manapun; ini SUDAH menjadi latensi/bug
--     pre-existing SEBELUM migration ini dan SENGAJA TIDAK diperbaiki
--     di sini karena di luar scope, lihat laporan) dilewati tanpa
--     menggagalkan proses approve secara keseluruhan.
--   - product_history dicatat best-effort — kegagalan insert history
--     TIDAK membatalkan approve, dibungkus sub-block EXCEPTION supaya
--     tetap konsisten dengan pola `.catch(() => {})` di client lama.
--
-- Tambahan yang BUKAN perubahan behaviour bisnis, melainkan penguatan
-- yang diminta secara eksplisit ("menghilangkan race condition"):
--   - SELECT ... FOR UPDATE mengunci baris transfer sebelum divalidasi,
--     supaya dua approve bersamaan pada transfer yang sama tidak lagi
--     bisa lolos validasi status secara bersamaan. Validasi sekarang
--     memakai state TERKINI dari database (bukan objek `transfer` yang
--     dikirim client, yang berpotensi stale), sehingga hasil akhirnya
--     LEBIH BENAR, bukan berbeda, dibanding versi lama pada jalur
--     normal (single approve, tidak ada concurrent write).
--   - Guard tambahan `AND status = 'pending'` pada UPDATE transfers +
--     pengecekan ROW_COUNT sebagai lapisan pertahanan kedua di luar
--     row lock (defense in depth, tidak mengubah hasil pada jalur
--     sukses).
--   - Validasi from_location harus salah satu dari LOCATIONS sebelum
--     dipakai sebagai nama kolom dinamis (EXECUTE format ... %I) —
--     pengaman terhadap dynamic SQL, tidak memengaruhi transfer yang
--     valid (from_location selalu salah satu dari LOCATIONS di semua
--     alur pembuatan transfer yang ada).
--
-- Idempotent: CREATE OR REPLACE FUNCTION aman dijalankan berkali-kali.
-- Tidak mengubah migration lama, tidak membuat tabel/kolom/constraint/
-- trigger/view baru, tidak mengimplementasikan RPC lain.
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

  IF p_approver_email IS NOT NULL AND v_transfer.created_by = p_approver_email THEN
    RAISE EXCEPTION 'Tidak bisa menyetujui transfer yang Anda buat sendiri. Minta admin lain untuk approve.';
  END IF;

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

-- Hanya admin yang sudah login yang boleh approve transfer (sama seperti
-- RLS transfers/stok_warna yang sudah membatasi write ke role authenticated).
GRANT EXECUTE ON FUNCTION public.approve_transfer(uuid, text, text) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- VERIFIKASI (jalankan manual setelah migration ini di-apply)
-- ────────────────────────────────────────────────────────────
-- Cek fungsi terdaftar:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'approve_transfer';
--
-- Cek grant:
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'approve_transfer';
