/**
 * shared/BarList.jsx — daftar bar horizontal generik (label + value + bar
 * proporsional), dipakai tab Advanced (Phase 6) untuk Weekday Performance
 * (7 baris Senin..Minggu) & Hourly Performance (24 baris 00:00..23:00).
 *
 * BEDA dari shared/Leaderboard.jsx: Leaderboard menampilkan RANKING (nomor
 * urut 1,2,3.., item SUDAH diurutkan value DESC oleh RPC). BarList
 * menampilkan urutan APA ADANYA dari `items` (mis. kronologis Senin→Minggu
 * atau 00:00→23:00) — TIDAK PERNAH mengurutkan ulang berdasarkan value,
 * karena urutan waktu itu sendiri adalah informasi (pola performa mingguan/
 * harian), bukan ranking. Tidak ada rank badge di sini.
 *
 * Lebar bar (`value / max(items value) * 100%`) adalah teknik render MURNI
 * untuk membantu mata membandingkan batang secara visual — SAMA prinsipnya
 * dengan bagaimana axis chart (TrendChart/Recharts) auto-scale berdasarkan
 * nilai maksimum data, BUKAN agregasi/business logic baru. Tidak ada angka
 * baru yang dihitung/disimpulkan di sini selain `max` untuk keperluan
 * skala visual.
 *
 * CATATAN: track bar SENGAJA TIDAK pakai `overflow-hidden` (beda dari pola
 * umum progress-bar) — lebar isi bar sudah dijamin <=100% dari perhitungan
 * di atas, jadi tidak pernah meluber, dan CLAUDE.md §13 melarang
 * `overflow-hidden` di repo ini (dipakai test suite lintas fitur untuk
 * mendeteksi teks yang diam-diam terpotong).
 */
export default function BarList({ items = [], valueFormatter = (v) => v, emptyMessage = "Belum ada data." }) {
  if (!items.length) {
    return <p className="text-sm text-skin-text3 text-center py-5">{emptyMessage}</p>;
  }

  const max = Math.max(1, ...items.map((it) => Math.abs(Number(it.value) || 0)));

  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const value = Number(it.value) || 0;
        const widthPct = (Math.abs(value) / max) * 100;
        return (
          <div key={`${it.label}-${i}`} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <span className="text-xs font-semibold text-skin-text3 break-words">{it.label}</span>
              <span className="flex-shrink-0 text-xs font-bold text-skin-text">{valueFormatter(value)}</span>
            </div>
            <div className="h-1.5 bg-skin-bdr-lt rounded-sm">
              <div
                className="h-full bg-[#CAB170] rounded-sm"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
