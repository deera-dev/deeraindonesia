-- ── Kanban Kartu Jahit (permintaan Denny 2026-09) ────────────────────────────
-- Tiap kombinasi batch × size × warna dari produksi_batch.sizes otomatis
-- jadi satu kartu di sini (lihat createJahitCardsForBatch di
-- apps/admin/src/features/produksi-jahit/api.js, dipanggil dari
-- features/produksi-record/api.js setelah insert/update produksi_batch).
-- Kartu digeser manual oleh admin lewat 3 kolom: belum_assign → on_progress
-- (assign ke penjahit langsung pindah kolom) → ready_finishing (setelah
-- disetor). karyawan_nama disimpan sbg snapshot (bukan cuma FK) supaya nama
-- tetap kebaca di kartu lama walau data karyawan berubah/nonaktif nanti.
CREATE TABLE jahit_cards (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id              uuid        NOT NULL REFERENCES produksi_batch(id) ON DELETE CASCADE,
  kode_produk           text        NOT NULL,
  nama_produk           text,
  size                  text        NOT NULL,
  warna                 text        NOT NULL DEFAULT '_',
  qty                   integer     NOT NULL DEFAULT 0,
  status                text        NOT NULL DEFAULT 'belum_assign'
                                     CHECK (status IN ('belum_assign','on_progress','ready_finishing')),
  karyawan_id           uuid        REFERENCES karyawan(id) ON DELETE SET NULL,
  karyawan_nama         text,
  assigned_at           timestamptz,
  moved_to_progress_at  timestamptz,
  moved_to_finishing_at timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, size, warna)
);

CREATE INDEX idx_jahit_cards_batch_id ON jahit_cards(batch_id);
CREATE INDEX idx_jahit_cards_status ON jahit_cards(status);

ALTER TABLE jahit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jahit_cards_select" ON jahit_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "jahit_cards_insert" ON jahit_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "jahit_cards_update" ON jahit_cards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "jahit_cards_delete" ON jahit_cards FOR DELETE TO authenticated USING (true);
