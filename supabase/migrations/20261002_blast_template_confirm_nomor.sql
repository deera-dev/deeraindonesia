-- Seed template "Konfirmasi Nomor WA" (permintaan Denny 2026-10: "buat
-- template juga untuk mempertanyakan apakah nomor ini benar nomor toko A,
-- nah toko A itu diambil dari nama customernya") — dipakai bareng
-- placeholder `{{nama}}` yang diganti OTOMATIS dengan nama kontak/calon
-- customer masing-masing target saat admin klik "Kirim" (lihat
-- applyTemplatePlaceholders di apps/admin/src/features/blast/utils.js,
-- dipanggil dari BlastCampaignDetail.jsx) — SATU template ini dipakai utk
-- SEMUA target, tapi pesan yg benar-benar terkirim ke tiap target beda2
-- sesuai nama kontaknya.
--
-- Nama kontak B2B di Deera (field `nama` pada tabel pelanggan/
-- calon_customer) memang nama tokonya sendiri (bukan field terpisah),
-- jadi cukup substitusi {{nama}} tanpa kolom baru.
insert into blast_message_template (nama, pesan) values
(
  'Konfirmasi Nomor WA',
  E'Assalamu''alaikum warahmatullahi wabarakatuh \xF0\x9F\x99\x8F\n\nMohon maaf sebelumnya, apakah benar ini nomor WhatsApp dari *{{nama}}*?\n\nKami dari *DEERA Indonesia* ingin mengonfirmasi dulu sebelum mengirimkan info produk, supaya tidak salah kirim ke nomor yang bukan tujuannya \xF0\x9F\x99\x8F'
);
