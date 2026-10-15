-- Fix: get_sold_out_kodes() sebelumnya menganggap produk yang BELUM PERNAH
-- diisi stok (tidak ada row sama sekali di stok_warna) sebagai "sold out",
-- disamakan dengan produk yang stoknya dikonfirmasi 0 (row ada, total = 0).
--
-- Ini menyebabkan produk katalog PUBLIK (catalog.deera.id) yang baru
-- selesai difoto tapi belum sempat di-Stok-Opname oleh admin langsung
-- tampil "Sold Out" ke customer, lalu stamp-nya hilang begitu admin
-- mengisi stok — dari luar terlihat seperti kelangkaan buatan/permainan
-- stok, padahal cuma soal input admin yang belum sempat dilakukan.
--
-- Fix: hanya anggap sold out kalau stok_warna MEMANG PUNYA row untuk kode
-- tsb dan totalnya 0 (dikonfirmasi habis). Kalau belum ada row sama
-- sekali, jangan tampilkan badge apa pun.
CREATE OR REPLACE FUNCTION public.get_sold_out_kodes()
 RETURNS TABLE(kode text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.kode
  FROM products p
  JOIN (
    SELECT
      kode,
      SUM(COALESCE(gudang, 0) + COALESCE(cideng, 0) + COALESCE(tegalgubug, 0)) AS total
    FROM stok_warna
    GROUP BY kode
  ) s ON p.kode = s.kode
  WHERE s.total = 0;   -- hanya sold out kalau row stok_warna ADA dan totalnya 0
$function$
;
