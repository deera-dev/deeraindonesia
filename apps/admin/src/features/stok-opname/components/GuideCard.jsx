/** GuideCard.jsx — panduan 3 langkah untuk anggota tim baru (bisa ditutup). */
export default function GuideCard({ onDismiss }) {
  const steps = [
    ["1", "Pilih lokasi", "Hitung satu lokasi dulu — Gudang, Cideng, atau Tegal."],
    ["2", "Tap produk, isi hitungan", "Isi angka tiap warna, atau isi Total dulu lalu warna menyusul. Kolom kosong = belum dihitung."],
    ["3", "Periksa lalu Simpan", "Cek selisihnya, lalu Simpan. Produk ditandai ✓ dan angkanya langsung tersimpan."],
  ];
  return (
    <div data-testid="guide-card" className="mb-3 border border-[#CAB170] bg-skin-gold p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-skin-text">Cara pakai Stok Opname</p>
        <button onClick={onDismiss} className="text-xs underline text-skin-text3">
          Mengerti, tutup
        </button>
      </div>
      <ol className="mt-2 space-y-1.5">
        {steps.map(([n, t, d]) => (
          <li key={n} className="flex gap-2 text-sm text-skin-text2">
            <span className="w-5 h-5 flex-shrink-0 rounded-full bg-[#CAB170] text-white text-xs font-bold flex items-center justify-center">
              {n}
            </span>
            <span>
              <b className="text-skin-text">{t}</b> — {d}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
