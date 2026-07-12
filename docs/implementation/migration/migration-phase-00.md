# Laporan — Migration Phase 0: Database Constraints & Indexes

**File migration:** `supabase/migrations/20260711_migration_phase0_constraints_indexes.sql`
**Metode audit:** membaca seluruh 47 file di `supabase/migrations/` (tidak ada live-query ke database produksi — lihat catatan risiko di bagian 5) untuk memetakan constraint & index yang sudah didefinisikan sejak awal proyek.
**Scope:** murni constraint + index. Tidak ada RPC, trigger, generated column, view, atau perubahan business logic aplikasi.

---

## 1. Constraint yang Sudah Ada

| Tabel | Constraint | Sumber |
|---|---|---|
| `gajian_minggu` | `tanggal_sabtu UNIQUE` (sekaligus `NOT NULL`) | `20260528_finance.sql` |
| `kasbon` | `jumlah > 0`, `status IN ('belum','lunas')` | `20260528_finance.sql` |
| `karyawan` | `tim IN ('potong','jahit','finishing','qc','kreatif','lainnya')` | `20260528_finance.sql` + `supabase-migration-finance-qc.sql` |
| `kas` | `jenis IN ('masuk','keluar')`, `jumlah > 0` | `20260528_finance.sql` |
| `pettycash` | `jenis IN ('isi','keluar')`, `jumlah > 0` | `supabase-migration-pettycash.sql` |
| `stok_warna` | `UNIQUE(kode, size, warna)` | `supabase-migration-stok-warna.sql` |
| `produksi_batch` | `UNIQUE INDEX` pada `batch_no` (fungsi setara UNIQUE constraint) | `20260525_produksi.sql` |
| `hpp_config` | `key UNIQUE` | `20260525_produksi.sql` |
| `sampel` | `nomor UNIQUE` | `supabase-migration-sampel.sql` |

**Constraint yang diminta di scope tapi TERNYATA SUDAH ADA (tidak perlu ditambahkan lagi):**
- `gajian_minggu.tanggal_sabtu UNIQUE` — sudah ada sejak tabel ini dibuat.

## 2. Constraint yang Ditambahkan

| Tabel | Constraint baru | Nama constraint | Alasan |
|---|---|---|---|
| `stok_warna` | `gudang >= 0` | `stok_warna_gudang_nonneg` | Tidak ada CHECK apapun sebelumnya pada kolom stok. |
| `stok_warna` | `cideng >= 0` | `stok_warna_cideng_nonneg` | idem |
| `stok_warna` | `tegalgubug >= 0` | `stok_warna_tegalgubug_nonneg` | idem |
| `kasbon` | `sisa >= 0` | `kasbon_sisa_nonneg` | Kolom `sisa` (nullable) belum pernah punya CHECK. |
| `kasbon` | `sisa <= jumlah` | `kasbon_sisa_le_jumlah` | idem |
| `transfers` | `UNIQUE(transfer_no)` | `transfers_transfer_no_unique` | Kolom hanya `NOT NULL`, belum pernah UNIQUE — berisiko tabrakan karena `transfer_no` di-generate aplikasi dengan 3 digit acak per hari. |
| `sampel` | `status IN ('draft','approved','rejected')` | `sampel_status_check` | Nilai yang valid sebelumnya HANYA disebutkan di komentar SQL, tidak pernah ditegakkan di level database. |

Setiap constraint di atas didahului query pengecekan data pelanggaran (lihat Bagian 5 — "Batasan Audit"). Migration akan **berhenti dengan pesan error yang menyebutkan jumlah & contoh baris bermasalah** jika ditemukan pelanggaran — tidak ada data yang dihapus/diubah otomatis.

## 3. Index yang Sudah Ada

| Tabel | Index | Kolom | Sumber |
|---|---|---|---|
| `gaji_potong` | `idx_potong_gajian` | `gajian_id` | `20260528_finance.sql` |
| `gaji_jahit` | `idx_jahit_gajian` | `gajian_id` | `20260528_finance.sql` |
| `gaji_finishing` | `idx_finishing_gajian` | `gajian_id` | `20260528_finance.sql` |
| `gaji_qc` | `idx_qc_gajian` | `gajian_id` | `supabase-migration-finance-qc.sql` |
| `gaji_kreatif` | `idx_kreatif_gajian` | `gajian_id` | `20260528_finance.sql` |
| `gaji_cmt` | `idx_cmt_gajian` | `gajian_id` | `20260528_finance.sql` |
| `kasbon` | `idx_kasbon_karyawan` (terpisah), `idx_kasbon_status` (terpisah) | `karyawan_id`, `status` | `20260528_finance.sql` |
| `transfers` | `transfers_status_idx`, `transfers_created_by_idx`, `transfers_created_at_idx` | `status`, `created_by`, `created_at` | `20260522_transfers.sql` |
| `produksi_batch` | `produksi_batch_tanggal_idx` | `tanggal_produksi` (DESC) | `20260525_produksi.sql` |
| `bahan_pembelian` | `..._status_bayar_idx` (terpisah), `..._jatuh_tempo_idx` (terpisah) | `status_bayar`, `jatuh_tempo` | `20260525_produksi.sql` |
| `bahan_pinjam` | `..._status_bayar_idx` (terpisah), `..._jatuh_tempo_idx` (terpisah) | `status_bayar`, `jatuh_tempo` | `20260525_produksi.sql` |
| `product_history` | `idx_product_history_changed_at`, `idx_product_history_category` | `changed_at` (DESC), `category` | `supabase-migration-add-history.sql` + `supabase-migration-history-audit.sql` |
| `sales` | `sales_date_idx` | `date` (DESC) | `supabase-migration-sales-table.sql` |

**Bagian scope yang diminta tapi TERNYATA SUDAH TERPENUHI (tidak perlu index baru):**
- **Payroll** — seluruh 6 tabel (`gaji_potong/jahit/finishing/qc/kreatif/cmt`) sudah punya index `gajian_id`.
- **Transfers** — index `status` dan `created_by` sudah ada.
- **Produksi** — index `tanggal_produksi` sudah ada.
- **Product History** — index `changed_at` dan `category` sudah ada.
- **Sales** — index `date` sudah ada (index `location` belum, lihat Bagian 4).

Migration tetap menuliskan `CREATE INDEX IF NOT EXISTS` untuk semua index di atas sebagai jaring pengaman idempotent — tidak menciptakan apapun yang baru, hanya memastikan syaratnya eksplisit terpenuhi.

## 4. Index yang Perlu Ditambahkan

| Tabel | Index baru | Kolom | Alasan |
|---|---|---|---|
| `kasbon` | `idx_kasbon_karyawan_status` | `(karyawan_id, status)` **komposit** | Index yang ada sekarang cuma 2 index terpisah (karyawan_id sendiri, status sendiri) — bukan komposit. Query "kasbon aktif milik karyawan tertentu" (filter dua kolom sekaligus) tidak bisa memanfaatkan index tunggal secara optimal. |
| `bahan_pembelian` | `bahan_pembelian_status_bayar_jatuh_tempo_idx` | `(status_bayar, jatuh_tempo)` **komposit** | Sama seperti di atas — index terpisah sudah ada, tapi bukan komposit. Dipakai halaman Tagihan Bahan ("belum lunas, urut jatuh tempo terdekat"). |
| `bahan_pinjam` | `bahan_pinjam_status_bayar_jatuh_tempo_idx` | `(status_bayar, jatuh_tempo)` **komposit** | idem |
| `sales` | `sales_location_idx` | `location` | Kolom `location` ditambahkan belakangan (`supabase-migration-stok-warna.sql`) dan tidak pernah diikuti index — laporan per lokasi pasar (Cideng/Tegalgubug/Gudang) melakukan full-scan tanpa ini. |

## 5. Risiko Migration

1. **Audit ini berbasis pembacaan riwayat migration, bukan query langsung ke database produksi.** Saya tidak punya akses live ke instance Supabase, jadi status "sudah ada / belum ada" di laporan ini disimpulkan dari seluruh 47 file `.sql` yang pernah dijalankan (dengan asumsi semuanya benar-benar sudah dieksekusi, sesuai catatan `CLAUDE.md` bahwa migration di proyek ini dijalankan manual). Untuk kepastian 100%, jalankan dua query verifikasi di akhir file migration (bagian "VERIFIKASI") sebelum dan sesudah menjalankan migration.
2. **Constraint CHECK/UNIQUE bisa gagal kalau data produksi sudah melanggar aturan tsb.** Ini sudah dimitigasi dengan blok pre-check di setiap constraint (migration berhenti dengan pesan jelas, tidak ada data yang otomatis dihapus/diubah) — tapi risikonya migration TIDAK BISA langsung sukses dalam satu kali jalan kalau memang ada data lama yang melanggar. Yang paling mungkin bermasalah:
   - `stok_warna` (gudang/cideng/tegalgubug negatif) — paling berisiko, karena sistem ini punya riwayat sync offline-first di POS yang bisa menyebabkan race condition.
   - `kasbon.sisa` — kemungkinan lebih kecil (field ini dihitung aplikasi, jarang diedit manual).
   - `transfers.transfer_no` — kemungkinan kecil (format tanggal+random 3 digit), tapi tidak nol.
   - `sampel.status` — kemungkinan sangat kecil (hanya 3 alur dari UI: draft/approved/rejected).
3. **`CREATE INDEX` (tanpa `CONCURRENTLY`) mengunci tabel untuk write selama index dibangun.** Untuk tabel kecil-menengah seperti di aplikasi ini dampaknya biasanya singkat, tapi kalau salah satu tabel (mis. `sales` atau `stok_warna`) sudah punya banyak baris di produksi, sebaiknya migration dijalankan di luar jam sibuk toko/pasar. Migration ini SENGAJA tidak memakai `CONCURRENTLY` supaya konsisten dengan seluruh migration lain di proyek ini (tidak ada satupun yang memakainya) dan supaya index bisa dibuat dalam satu file/transaksi yang sama seperti pola yang sudah ada — kalau tabel tertentu ternyata sudah besar, index untuk tabel itu bisa dipisah dan dijalankan manual dengan `CONCURRENTLY` (di luar blok transaksi).
4. **Constraint komposit baru (`kasbon`, `bahan_pembelian`, `bahan_pinjam`) menambah index terpisah dari index single-column yang sudah ada** — bukan menggantikannya. Ini sedikit menambah storage & overhead write (setiap INSERT/UPDATE menulis ke lebih banyak index), tapi tidak mengubah hasil query yang sudah ada. Menghapus index lama di luar scope Phase 0 ini (berpotensi ada query lain yang masih bergantung padanya) — sengaja tidak disentuh.
5. **`RAISE EXCEPTION` di dalam `DO $$ $$` membatalkan SELURUH transaksi migration**, bukan cuma bagian yang gagal. Kalau misalnya `stok_warna` punya pelanggaran, migration berhenti total di situ — constraint `kasbon`/`transfers`/`sampel` yang letaknya SETELAH `stok_warna` di file ini juga TIDAK akan sempat dibuat pada percobaan itu (Postgres SQL Editor menjalankan seluruh paste sebagai satu transaksi implisit). Ini perilaku yang disengaja (fail-fast, tidak ada state setengah jadi yang membingungkan) — tapi berarti kalau ada pelanggaran, migration perlu dijalankan ulang dari awal setelah data diperbaiki, bukan dilanjutkan dari titik gagal.

## 6. Rekomendasi Urutan Deployment

1. **Jalankan dulu query pre-check secara terpisah** (opsional tapi disarankan) untuk tahu lebih awal apakah ada pelanggaran data, tanpa harus menunggu migration gagal di tengah jalan:
   ```sql
   SELECT count(*) FROM stok_warna WHERE gudang < 0 OR cideng < 0 OR tegalgubug < 0;
   SELECT count(*) FROM kasbon WHERE sisa IS NOT NULL AND (sisa < 0 OR sisa > jumlah);
   SELECT transfer_no, count(*) FROM transfers GROUP BY transfer_no HAVING count(*) > 1;
   SELECT DISTINCT status FROM sampel WHERE status NOT IN ('draft','approved','rejected');
   ```
2. **Perbaiki manual** setiap pelanggaran yang ditemukan (kalau ada) — di luar scope migration ini, sesuai instruksi "jangan menghapus/mengubah data otomatis".
3. **Jalankan migration di jam sepi** (di luar jam operasional toko/pasar Cideng-Tegalgubug), karena `CREATE INDEX` tanpa `CONCURRENTLY` mengunci tabel sebentar untuk write.
4. **Jalankan seluruh file `20260711_migration_phase0_constraints_indexes.sql` sekali lewat Supabase SQL Editor.** Urutan di dalam file sudah disusun: constraint dulu (Bagian 1, sudah termasuk pre-check masing-masing), baru index (Bagian 2) — tidak perlu dipecah manual kecuali salah satu pre-check gagal.
5. **Verifikasi setelah sukses** — jalankan 2 query verifikasi di bagian akhir file (dikomentari, tinggal di-uncomment) untuk konfirmasi seluruh constraint & index baru benar-benar tercatat di `pg_constraint`/`pg_indexes`.
6. **Setelah Phase 0 stabil**, baru lanjut ke fase berikutnya (RPC/trigger/perubahan arsitektur) — di luar scope laporan ini.

---

## Ringkasan Cepat

| | Diminta | Sudah ada | Perlu ditambahkan |
|---|---|---|---|
| Constraint | 5 | 1 (`gajian_minggu`) | 4 (`stok_warna` ×3, `kasbon` ×2, `transfers`, `sampel`) — total 7 constraint baru |
| Index | 8 kelompok | 5 kelompok penuh (Payroll, Transfers, Produksi, Product History, Sales.date) | 4 index baru (1 komposit `kasbon`, 2 komposit `bahan_*`, 1 `sales.location`) |

Temuan utama: **sebagian besar scope index sudah terpenuhi** dari migration-migration sebelumnya — pekerjaan riil di Phase 0 ini terkonsentrasi di penambahan constraint integritas data (terutama `stok_warna` non-negatif, yang paling penting karena belum pernah ada sama sekali) dan beberapa index komposit yang belum ada sebelumnya.
