-- Template pesan Blast (permintaan Denny 2026-10: "bisa menulis beberapa
-- template pesan, nanti lihatin aja list template pesannya ... siapin aja
-- beberapa template"). Dipakai features/blast — admin pilih dari daftar
-- ini sebagai titik awal pesan, bisa diedit bebas sebelum kirim, dan bisa
-- tambah/edit/hapus template sendiri.
create table if not exists blast_message_template (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  pesan text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table blast_message_template enable row level security;

create policy "blast_message_template authenticated select" on blast_message_template for select using (auth.role() = 'authenticated');
create policy "blast_message_template authenticated insert" on blast_message_template for insert with check (auth.role() = 'authenticated');
create policy "blast_message_template authenticated update" on blast_message_template for update using (auth.role() = 'authenticated');
create policy "blast_message_template authenticated delete" on blast_message_template for delete using (auth.role() = 'authenticated');

-- Seed beberapa template dasar (perkenalan ke calon customer yang BELUM
-- kenal brand sama sekali — tidak membawa produk spesifik, karena pesan
-- pertama ke prospek baru biasanya memperkenalkan toko dulu, bukan
-- langsung "jualan").
insert into blast_message_template (nama, pesan) values
(
  'Perkenalan Toko (Calon Customer Baru)',
  E'Assalamu''alaikum warahmatullahi wabarakatuh \xF0\x9F\x99\x8F\n\nPerkenalkan, kami *DEERA Indonesia* \xE2\x80\x94 produsen gamis & mukena dengan bahan adem, jahitan rapi, dan model yang selalu update mengikuti tren.\n\nKami melihat Kakak mungkin tertarik dengan produk busana muslim berkualitas. Boleh kami kirimkan katalog terbaru kami?\n\nKatalog lengkap: https://deera.id/\nInstagram: https://www.instagram.com/deeraindonesia\nTikTok: https://www.tiktok.com/@deeraindonesia\n\nDitunggu kabar baiknya ya, Kak \xF0\x9F\x99\x8F'
),
(
  'Ajak Jadi Reseller / Buka Toko',
  E'Assalamu''alaikum warahmatullahi wabarakatuh \xF0\x9F\x99\x8F\n\n*DEERA Indonesia* membuka kesempatan kerja sama reseller/dropship untuk gamis & mukena dengan harga khusus partner \xE2\x80\x94 cocok untuk yang mau mulai usaha sendiri atau menambah variasi produk toko yang sudah berjalan.\n\nKeuntungan jadi partner kami:\n- Harga khusus reseller\n- Stok selalu update\n- Dibantu materi promosi (foto & video produk)\n\nKalau Kakak tertarik, boleh dibalas chat ini, nanti kami jelaskan skemanya lebih detail \xF0\x9F\x99\x8F'
),
(
  'Follow-up Belum Direspon',
  E'Assalamu''alaikum warahmatullahi wabarakatuh \xF0\x9F\x99\x8F\n\nMaaf mengganggu lagi, Kak \xE2\x80\x94 kami dari *DEERA Indonesia*. Sebelumnya kami sempat kirim info produk kami, mungkin belum sempat terbaca.\n\nKalau Kakak masih berkenan, kami bisa bantu carikan model/ukuran yang sesuai kebutuhan. Tidak harus beli sekarang, boleh tanya-tanya dulu \xF0\x9F\x99\x8F'
),
(
  'Promo Terbatas',
  E'Assalamu''alaikum warahmatullahi wabarakatuh \xF0\x9F\x99\x8F\n\n*DEERA Indonesia* lagi ada promo spesial untuk beberapa hari ke depan! Mumpung ada potongan harga, cocok buat Kakak yang sudah lama mau upgrade koleksi gamis/mukena.\n\nStok & waktu promo terbatas, jadi jangan sampai kelewatan ya \xF0\x9F\x99\x8F'
),
(
  'Restock Produk Favorit',
  E'Assalamu''alaikum warahmatullahi wabarakatuh \xF0\x9F\x99\x8F\n\nKabar baik dari *DEERA Indonesia* \xE2\x80\x94 produk yang kemarin sempat habis sekarang sudah *restock*! Kalau Kakak sebelumnya kehabisan, ini kesempatan buat dapat lagi sebelum habis kedua kalinya \xF0\x9F\x99\x8F'
),
(
  'Ucapan Hari Raya + Soft Selling',
  E'Assalamu''alaikum warahmatullahi wabarakatuh \xF0\x9F\x99\x8F\n\nSelamat Hari Raya dari kami, *DEERA Indonesia*! Semoga Kakak sekeluarga selalu dalam kesehatan dan keberkahan \xF0\x9F\xA4\x8D\n\nKalau mau tampil baru di momen spesial ini, kami juga siap bantu carikan gamis/mukena yang pas untuk Kakak \xF0\x9F\x99\x8F'
);
