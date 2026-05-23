-- ============================================================
-- Migration: fitur Transfer Stok
-- Tabel: transfers
--
-- Jalankan di Supabase SQL Editor:
-- https://app.supabase.com → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS transfers (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,
  transfer_no     text        NOT NULL,            -- e.g. "SJ-20260522-347"
  from_location   text        NOT NULL,            -- gudang | cideng | tegalgubug
  to_location     text        NOT NULL,
  items           jsonb       NOT NULL DEFAULT '[]'::jsonb,
                                                   -- [{kode, size, warna, qty}]
  notes           text,
  status          text        NOT NULL DEFAULT 'pending',
                                                   -- pending | approved | rejected
  created_by      text,                            -- email user pembuat
  created_by_name text,
  approved_by     text,                            -- email user approver
  approved_at     timestamptz,
  rejected_by     text,
  rejected_at     timestamptz
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS transfers_status_idx      ON transfers (status);
CREATE INDEX IF NOT EXISTS transfers_created_at_idx  ON transfers (created_at DESC);
CREATE INDEX IF NOT EXISTS transfers_created_by_idx  ON transfers (created_by);

-- RLS policies
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Semua user yang login bisa baca
CREATE POLICY "transfers_select" ON transfers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya user login yang bisa insert
CREATE POLICY "transfers_insert" ON transfers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- User login bisa update (approve/reject/delete logic dijaga di aplikasi)
CREATE POLICY "transfers_update" ON transfers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- User login bisa hapus (hanya pending — dijaga di hook aplikasi)
CREATE POLICY "transfers_delete" ON transfers
  FOR DELETE USING (auth.role() = 'authenticated');
