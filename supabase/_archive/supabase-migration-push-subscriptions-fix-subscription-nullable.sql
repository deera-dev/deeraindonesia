-- Fix lanjutan untuk push_subscriptions, setelah
-- supabase-migration-push-subscriptions-fix-auth.sql dijalankan.
--
-- Error baru yang muncul:
--   "null value in column \"subscription\" of relation \"push_subscriptions\"
--    violates not-null constraint" (code 23502)
--
-- Penyebab: tabel push_subscriptions di database LIVE ternyata sudah jadi
-- gabungan dua skema sekaligus —
--   - Skema LAMA (dipakai apps/admin/src/hooks/usePushNotification.js, untuk
--     notifikasi transfer): kolom `subscription` jsonb NOT NULL,
--     upsert onConflict "user_email".
--   - Skema BARU (dipakai apps/pos/src/hooks/usePushSubscription.js, untuk
--     notifikasi penjualan): kolom endpoint/p256dh/auth,
--     upsert onConflict "endpoint".
-- Setelah migration sebelumnya menambah kolom endpoint/p256dh/auth, upsert
-- dari POS sekarang berhasil sampai ke constraint kolom `subscription` —
-- kolom itu masih NOT NULL dari skema lama, tapi upsert dari POS tidak pernah
-- mengisinya (memang bukan bagian dari skema barunya).
--
-- Fix: jadikan kolom `subscription` boleh NULL. Aman untuk jalur admin yang
-- lama — hook itu SELALU mengisi `subscription` di setiap upsert-nya
-- (lihat usePushNotification.js baris ~81), jadi perilakunya tidak berubah,
-- cuma constraint-nya yang dilonggarkan supaya baris dari POS (yang murni
-- pakai endpoint/p256dh/auth) tidak ditolak gara-gara kolom warisan ini.
--
-- Jalankan di Supabase SQL Editor.

ALTER TABLE push_subscriptions
  ALTER COLUMN subscription DROP NOT NULL;

-- Paksa PostgREST reload schema cache.
NOTIFY pgrst, 'reload schema';
