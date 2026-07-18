/**
 * GrandTotalStrip.jsx — 3 kartu grand-total stok per lokasi, sekaligus
 * berfungsi sebagai toggle filter lokasi.
 *
 * Redesign UX 2026-07: tap kartu lokasi di sini SEKARANG juga mengaktifkan
 * "mode fokus" pada tabel isi tiap kartu produk (StokOpnamePage meneruskan
 * locFilter yang sama ke ProductOpnameCard) — bukan cuma memfilter daftar
 * produk seperti sebelumnya. Teks title/tooltip diperbarui supaya
 * perilaku barunya jelas tanpa perlu dokumentasi terpisah.
 */
import { MKT_CARDS } from "../utils";

export default function GrandTotalStrip({ stokRows, getValue, locFilter, onToggleLocFilter }) {
  const gt = stokRows.reduce(
    (acc, row) => ({
      gudang: acc.gudang + getValue(row, "gudang"),
      cideng: acc.cideng + getValue(row, "cideng"),
      tegalgubug: acc.tegalgubug + getValue(row, "tegalgubug"),
    }),
    { gudang: 0, cideng: 0, tegalgubug: 0 },
  );

  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {MKT_CARDS.map(({ key, lbl, name, color, bg, activeBorder, inactiveBorder }) => {
        const isActive = locFilter === key;
        return (
          <button
            key={key}
            onClick={() => onToggleLocFilter(key)}
            className={`${bg} border-2 ${isActive ? activeBorder : inactiveBorder} flex items-center gap-2 px-3 py-2 transition-all hover:opacity-90 active:scale-95 cursor-pointer`}
            title={
              isActive
                ? `Hapus filter ${name}`
                : `Filter produk dengan stok ${name} > 0, dan persempit tabel edit ke kolom ${name} saja`
            }
          >
            <span className={`text-[11px] font-black tracking-widest uppercase ${color} flex-shrink-0`}>
              {lbl}
              {isActive ? " ✕" : ""}
            </span>
            <span className={`text-xl font-black leading-none ${color}`}>{gt[key]}</span>
            <span className="text-[10px] text-skin-text3 leading-none">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
