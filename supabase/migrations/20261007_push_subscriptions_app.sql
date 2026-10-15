-- Tandai asal tiap push subscription ('admin' | 'pos'). Dipakai notify-sale
-- supaya notifikasi penjualan HANYA dikirim ke device yang mendaftar lewat
-- aplikasi POS (permintaan Denny 2026-10: notif pembelian di admin dobel).
-- Baris lama (app null) tetap dianggap penerima sampai app-nya membuka ulang
-- dan menimpa kolom ini lewat upsert (otomatis tiap app dibuka).
alter table push_subscriptions add column if not exists app text;
