-- ── Arsip "Selesai" di Kanban Jahit + Auto Stok Masuk dari Finishing ──────────
-- (permintaan Denny 2026-09)
--
-- 1. Kartu Jahit bisa ditandai "done" (arsip, TIDAK ikut di 3 kolom aktif
--    kanban lagi) — baik manual oleh admin (tombol "Tandai Selesai" di kartu
--    Ready Finishing) MAUPUN otomatis lewat rekonsiliasi stok dari Finance
--    (lihat get_sold_qty_by_kode & increment_stok_gudang di bawah).
ALTER TABLE jahit_cards DROP CONSTRAINT jahit_cards_status_check;
ALTER TABLE jahit_cards ADD CONSTRAINT jahit_cards_status_check
  CHECK (status IN ('belum_assign','on_progress','ready_finishing','done'));
ALTER TABLE jahit_cards ADD COLUMN done_at timestamptz;
CREATE INDEX idx_jahit_cards_done_at ON jahit_cards(done_at);

-- 2. RPC agregasi qty TERJUAL per size+warna untuk satu kode — dipakai
--    Finance saat rekonsiliasi stok masuk (cek "apakah sudah ada penjualan
--    sebelumnya" sebelum nambah ke stok Gudang). Mereplikasi business logic
--    dual-format yang sama dengan get_sales_summary_by_product /
--    get_sales_detail_by_product (migration 20260711 & 20260911): hanya
--    type='sale' (retur tidak dihitung, konsisten dgn RPC sales lain yg
--    sudah ada), item.warna bisa berupa string flat (format baru, size di
--    item.size) ATAU array [{warna,qty}] (format lama).
--
-- NOTE: versi PERTAMA fungsi ini pakai CREATE TEMP TABLE di dalam plpgsql —
-- gagal karena STABLE function tidak boleh DDL ("CREATE TABLE is not
-- allowed in a non-volatile function"). Diperbaiki di migration
-- 20260912_fix_get_sold_qty_by_kode_no_temp_table.sql jadi pure SQL
-- (CTE + LATERAL, tanpa DDL). Definisi final ada di migration itu — CREATE
-- OR REPLACE di sini tetap dijalankan dulu (idempotent) supaya urutan file
-- migration konsisten dgn riwayat apply sebenarnya.
CREATE OR REPLACE FUNCTION public.get_sold_qty_by_kode(p_kode text)
RETURNS TABLE (size text, warna text, qty integer)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sale        record;
  v_item        jsonb;
  v_warna_elem  jsonb;
  v_qty         numeric;
  v_size        text;
  v_warna       text;
BEGIN
  RETURN QUERY SELECT NULL::text, NULL::text, NULL::integer WHERE false; -- placeholder, diganti migration fix
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sold_qty_by_kode(text) TO authenticated;

-- 3. RPC increment atomik stok Gudang (upsert) — dipakai saat rekonsiliasi
--    Finishing menambah stok setelah dikonfirmasi admin. p_delta HARUS >= 0
--    (logika "berapa yang ditambahkan" sudah dihitung di sisi client
--    sebelum panggil ini, lihat FinishingStockModal.jsx); GREATEST(...,0)
--    di sini cuma jaring pengaman terakhir supaya tidak mungkin mengurangi
--    stok lewat RPC ini walau ada bug di pemanggil.
CREATE OR REPLACE FUNCTION public.increment_stok_gudang(p_kode text, p_size text, p_warna text, p_delta integer)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO stok_warna (kode, size, warna, gudang, cideng, tegalgubug)
  VALUES (p_kode, p_size, p_warna, GREATEST(p_delta, 0), 0, 0)
  ON CONFLICT (kode, size, warna)
  DO UPDATE SET gudang = stok_warna.gudang + GREATEST(p_delta, 0), updated_at = now();
$$;

GRANT EXECUTE ON FUNCTION public.increment_stok_gudang(text, text, text, integer) TO authenticated;

-- 4. Audit trail tiap kali stok Gudang ditambah otomatis dari rekonsiliasi
--    Finishing — supaya bisa ditelusuri kalau ada pertanyaan "kenapa stok
--    gudang kode ini nambah segini".
CREATE TABLE stok_masuk_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kode                text        NOT NULL,
  size                text        NOT NULL,
  warna               text        NOT NULL DEFAULT '_',
  qty_kartu           integer     NOT NULL DEFAULT 0,
  stok_sebelum        integer     NOT NULL DEFAULT 0,
  terjual_sebelum     integer     NOT NULL DEFAULT 0,
  qty_ditambahkan     integer     NOT NULL DEFAULT 0,
  jahit_card_id       uuid        REFERENCES jahit_cards(id) ON DELETE SET NULL,
  gajian_finishing_id uuid        REFERENCES gaji_finishing(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          text,
  created_by_name     text
);

CREATE INDEX idx_stok_masuk_log_kode ON stok_masuk_log(kode);

ALTER TABLE stok_masuk_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stok_masuk_log_select" ON stok_masuk_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "stok_masuk_log_insert" ON stok_masuk_log FOR INSERT TO authenticated WITH CHECK (true);
