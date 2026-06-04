# apps/finance — Aplikasi Keuangan Internal

Aplikasi manajemen keuangan dan penggajian untuk tim internal Deera Indonesia.
Membutuhkan login (Supabase Auth).

---

## Routing

| Route | Halaman | Fungsi |
|-------|---------|--------|
| `/` | Dashboard | Ringkasan keuangan |
| `/kas` | Kas | Catat uang masuk & keluar, upload foto struk |
| `/gajian` | Gajian | Daftar minggu gajian |
| `/gajian/:id` | GajianDetail | Input gaji per tim (potong, jahit, finishing, QC, kreatif, CMT) |
| `/karyawan` | Karyawan | Data karyawan |
| `/kasbon` | Kasbon | Catatan kasbon karyawan |
| `/pengaturan` | Pengaturan | Konfigurasi app |

---

## Struktur Folder

```
apps/finance/src/
├── App.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── Kas.jsx           # Pencatatan kas + upload struk
│   ├── Gajian.jsx        # List minggu gajian
│   ├── GajianDetail.jsx  # Detail gajian per tim (1700+ baris)
│   ├── Karyawan.jsx
│   ├── Kasbon.jsx
│   ├── Login.jsx
│   └── Pengaturan.jsx
├── components/
│   ├── FinanceLayout.jsx
│   ├── FinanceBottomNav.jsx
│   ├── ProtectedRoute.jsx
│   └── financeUtils.js   # fmtRp, fmtTanggalPendek, inputCls, labelCls
└── lib/
    └── financeUtils.js
```

---

## Fitur Kas

- Catat transaksi masuk/keluar dengan kategori: Gaji, Bahan, Operasional, CMT, Sewa, Lainnya
- Filter per bulan + jenis
- Upload foto struk (preview, simpan referensi)
- Timezone-safe: date menggunakan local date bukan UTC

## Fitur Gajian

- Minggu gajian dengan 6 tim: Potong, Jahit, Finishing, QC, Kreatif, CMT
- Tiap tim: input per karyawan berdasarkan output/pcs
- Tambahan manual (opsional) per karyawan — toggle show/hide
- Total upah = base + tambahan - potongan
- Tab Ringkasan: share ke WhatsApp (teks) atau download/share gambar PNG

---

## Tabel Supabase

- `kas` — transaksi masuk/keluar
- `gajian_minggu` — header minggu gajian
- `gaji_potong`, `gaji_jahit`, `gaji_finishing`, `gaji_qc`, `gaji_kreatif` — detail per tim
- `karyawan` — data karyawan

---

## Hal yang JANGAN Dilakukan

- Jangan gunakan `toISOString()` untuk date filter kas — gunakan local date string
- Jangan pre-populate input tambahan manual dari `manual_overrides` lama — init dengan `""`
- Jangan gunakan state tab — navigasi via React Router
