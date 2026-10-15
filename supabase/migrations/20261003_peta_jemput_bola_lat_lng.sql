-- Peta Jemput Bola (permintaan Denny 2026-10): tampilkan toko potensial +
-- pelanggan yang sudah pernah beli di peta (OpenStreetMap, gratis), bantu
-- strategi kunjungan "mana yang terdekat & sejalan". `lat`/`lng` diisi via
-- geocoding alamat (Nominatim, gratis) ATAS AKSI EXPLICIT admin (tombol
-- "Cari Titik Lokasi"), BUKAN otomatis setiap simpan — supaya tidak
-- membombardir Nominatim (kebijakan rate-limit 1 req/detik) setiap kali
-- form toko/pelanggan disimpan. `geocode_source`: 'auto' (hasil
-- geocoding) | 'manual' (admin menggeser pin sendiri di peta, lebih
-- akurat, TIDAK BOLEH ditimpa auto-geocode ulang).
alter table toko
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists geocode_source text,
  add column if not exists geocoded_at timestamptz;

alter table pelanggan
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists geocode_source text,
  add column if not exists geocoded_at timestamptz;
