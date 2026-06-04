# apps/admin — Dashboard Admin

Aplikasi web untuk mengelola produk, stok, transfer, produksi, dan riwayat perubahan.
Membutuhkan login (Supabase Auth). Dirancang untuk dipakai di desktop/tablet.

---

## Halaman

| Route | Halaman | Fungsi |
|-------|---------|--------|
| `/` | Admin | Grid produk, stok map, tambah/edit/hapus produk |
| `/stok-opname` | StokOpname | Koreksi stok aktual per size × warna × lokasi |
| `/transfer` | Transfer | Buat & kelola surat jalan antar lokasi |
| `/buku-potongan` | BukuPotongan | Catatan cicilan/potongan per karyawan |
| `/history` | History | Audit log semua perubahan |
| `/produksi/bahan` | ProduksiBahan | Stok bahan + pembelian + pinjam |
| `/produksi/record` | ProduksiRecord | Batch produksi |
| `/produksi/hpp` | ProduksiHPP | Template HPP, Kalkulator HPP, Harga Dasar |
| `/produksi/laporan` | ProduksiLaporan | Rekap produksi |

---

## Struktur Folder

```
apps/admin/src/
├── App.jsx
├── pages/
│   ├── Admin.jsx
│   ├── StokOpname.jsx
│   ├── Transfer.jsx
│   ├── BukuPotongan.jsx
│   ├── History.jsx
│   ├── Login.jsx
│   ├── ProduksiBahan.jsx
│   ├── ProduksiRecord.jsx
│   ├── ProduksiHPP.jsx
│   └── ProduksiLaporan.jsx
├── components/
│   ├── admin/          # ProductForm, SizeSection, ImageSection, WarnaSection, HppSection
│   ├── buku/           # ProductBukuCard, bukuUtils.js
│   ├── history/        # HistoryDetailModal, HistoryDiffs, historyUtils.js
│   ├── transfer/       # TransferForm, TransferCard
│   └── produksi/
│       ├── bahan/      # BahanForm, BahanCard, BahanPickerModal, PembelianBulkForm,
│       │               #   PinjamBulkForm, StokPanel, SuratJalanPinjamModal, bahanUtils.js
│       ├── hpp/        # HPPForm, HPPCard, BahanPickerModal, RangeWithMarks, hppUtils.js
│       └── record/     # BatchForm, BatchCard, recordUtils.js
└── hooks/
    └── useHistory.js   # logHistory() + deleteHistory()
```

---

## Fitur Transfer Stok

- Form modal full-height dengan list produk scrollable
- **Seri Penuh** per kode: +1 qty semua size/warna tersedia tiap tekan, tombol Reset
- **Ringkasan accordion** — total per kode, collapsed by default
- **Draft autosave** ke localStorage — restored otomatis jika modal ditutup sebelum submit

## Fitur Stok Opname

- Accordion per produk, filter by search/lokasi/hanya-berubah
- **Draft autosave** ke localStorage — indicator "💾 Draft dipulihkan" saat refresh

## Fitur ProduksiHPP

- **Tab Template HPP**: kelola HPP detail per produk (bahan, upah, kancing, dll)
- **Tab Kalkulator**: simulasi HPP cepat — biaya bahan × pemakaian, slider upah & operasional
- **Tab Harga Dasar**: konfigurasi default hpp_config

## Fitur ProduksiBahan

- Stok bahan real-time dari view `v_stok_bahan`
- Pembelian: info tagihan per bulan dengan share ke WhatsApp

---

## Aturan Penting

- Route base `/` — **tidak ada prefix `/admin`**
- Audit log wajib untuk semua perubahan produk/stok/transfer/produksi
- Jangan gunakan `window.confirm` — pakai modal konfirmasi
- Stok disimpan di `stok_warna`, bukan di `products`
