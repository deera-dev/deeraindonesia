# Audit Keamanan Supabase — Deera Indonesia (7 Okt 2026)

Cakupan: RLS, policy, grant, dan advisor keamanan Supabase (project `khpgjfsaucrhihadnewq`).
Belum dicakup: edge function, Storage bucket, pengaturan Auth, dan uji penetrasi nyata.
Tidak ada perubahan yang saya terapkan ke database. Semua di bawah ini adalah rekomendasi.

## KRITIS (perbaiki sekarang)

### 1. `products` bisa diubah dan dihapus siapa saja tanpa login
Ada 4 policy role `public` bernama "Public insert/update/delete/read" dengan kondisi `true`.
Anon key sudah tertanam di aplikasi Catalog yang publik, jadi siapa pun bisa
mengubah harga atau menghapus seluruh katalog lewat REST API.

Perbaikan (hapus policy tulis publik, biarkan baca publik):

    drop policy "Public delete" on public.products;
    drop policy "Public insert" on public.products;
    drop policy "Public update" on public.products;

Catatan: ada 12 policy di `products`, jadi 4 policy `authenticated` tetap melayani Admin dan POS.
Uji dulu: edit produk di Admin dan buka Catalog setelah perubahan.

### 2. `freeform_generations` (AI Studio) tanpa RLS dan terbuka untuk anon
Tabel berisi 131 baris. `anon` punya hak SELECT/INSERT/UPDATE/DELETE/TRUNCATE.
Tabel ini tidak dipakai di repo ini, jadi kemungkinan milik proyek AI Studio.

Perbaikan:

    alter table public.freeform_generations enable row level security;
    create policy authenticated_full_access on public.freeform_generations
      for all to authenticated using (true) with check (true);
    revoke all on public.freeform_generations from anon;

Pastikan AI Studio memakai login (authenticated) sebelum menerapkan ini.

## TINGGI

### 3. Tidak ada pemisahan peran
11 pengguna login, dan semua policy memakai `authenticated ... true`.
Siapa pun yang punya akun, termasuk akun kasir, bisa membaca dan mengubah
`karyawan`, `kasbon`, `gaji_*`, `gajian_minggu`, `kas`, dan `pettycash` lewat REST API,
walau UI Finance tidak menampilkannya.

Perbaikan: tambah kolom `role` di `profiles` (owner/admin/kasir/finance), buat fungsi
`public.has_role(text)` (SECURITY DEFINER, search_path dikunci), lalu batasi tabel
keuangan hanya untuk owner/finance. Tabel POS dan Admin lain bisa tetap terbuka
untuk semua user yang sudah login.

### 4. `profiles` bisa dibaca semua user
Email dan nama seluruh pengguna terbaca oleh siapa pun yang login. Risikonya rendah
kalau user hanya 11 orang, tapi sebaiknya dibatasi ke diri sendiri dan owner.

## SEDANG

5. View `v_stok_bahan` dan `v_jahit_dikerjakan` memakai SECURITY DEFINER sehingga melewati RLS.
   Ubah ke `alter view ... set (security_invoker = true);`.
6. RPC `get_baru_kodes`, `get_limited_stok_kodes`, `get_sold_out_kodes`, `get_terlaris_kodes`
   (SECURITY DEFINER) bisa dipanggil anon. Ini kemungkinan memang sengaja karena dipakai Catalog,
   tapi pastikan hanya mengembalikan kode produk, bukan data sensitif.
7. `leads_sayabuatin` menerima INSERT dari anon tanpa batas, jadi rawan spam. Tambah rate limit
   atau CAPTCHA, atau pindahkan ke edge function.
8. Leaked password protection di Auth masih mati. Aktifkan di Dashboard, bagian Auth.

## RENDAH

9. Fungsi `update_updated_at_column` belum mengunci `search_path`.
10. Ekstensi `pg_net` terpasang di schema `public`. Pindahkan ke schema `extensions`.
11. `ai_cost_log` bisa dibaca semua user yang login. Ini wajar, tapi pertimbangkan pembatasan.

## Urutan pengerjaan yang disarankan
1. Temuan 1 dan 2, sekitar 30 menit termasuk uji.
2. Temuan 8, 5, 9, dan 10, sekitar 15 menit.
3. Temuan 3 dan 4 (peran), sekitar 1 hari karena perlu mengubah UI dan menguji tiap aplikasi.
4. Temuan 6 dan 7.

Setelah semua selesai, jalankan ulang get_advisors dan target skor keamanan naik dari
sekitar 5/10 menjadi sekitar 8/10.
