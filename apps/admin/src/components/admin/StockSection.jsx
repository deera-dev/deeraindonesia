// StockSection: input stok per ukuran × warna × lokasi
// stokWarnaMap: { [size]: { [warna]: { gudang, cideng, tegalgubug } } }
import { SIZE_PRESETS, formatHarga } from "@deera/shared/lib/constants";

const LOCS = [
  { key: "gudang",     label: "Gudang" },
  { key: "cideng",     label: "Cideng" },
  { key: "tegalgubug", label: "Tegalgubug" },
];

const inputCls = "w-full bg-white border-2 border-[#E8E3DC] px-2 py-2 text-[#1A1918] text-base text-right focus:outline-none focus:border-[#CAB170] disabled:opacity-40 disabled:bg-[#F9F7F4] transition";

export default function StockSection({ stokWarnaMap, setStokWarnaMap, warna, hpp, setHpp, activeSet, hargaMap, saving }) {
  const activeSizes = SIZE_PRESETS.filter(p => activeSet.has(p.size));
  const hasWarna    = warna.length > 0;

  function setStok(size, w, loc, val) {
    setStokWarnaMap(prev => ({
      ...prev,
      [size]: {
        ...(prev[size] ?? {}),
        [w]: {
          ...(prev[size]?.[w] ?? { gudang: 0, cideng: 0, tegalgubug: 0 }),
          [loc]: parseInt(val) || 0,
        },
      },
    }));
  }

  function getStok(size, w, loc) {
    return stokWarnaMap?.[size]?.[w]?.[loc] ?? 0;
  }

  // Total per lokasi (semua size × warna)
  function locTotal(loc) {
    let t = 0;
    for (const p of activeSizes) {
      const warnaKeys = hasWarna ? warna : ["_"];
      for (const w of warnaKeys) {
        t += getStok(p.size, w, loc);
      }
    }
    return t;
  }
  const grandTotal = LOCS.reduce((s, l) => s + locTotal(l.key), 0);

  // Warna yang digunakan: kalau belum ada warna, tampilkan satu baris "Umum"
  const warnaList = hasWarna ? warna : ["(Umum)"];

  return (
    <div className="mb-8">
      <label className="block text-sm tracking-[0.2em] text-[#6B6560] mb-4 uppercase">
        Stok per Ukuran × Warna × Lokasi
      </label>

      {activeSizes.length === 0 ? (
        <p className="text-sm text-[#9C9690] italic">Pilih ukuran terlebih dahulu.</p>
      ) : !hasWarna ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
          Tambahkan warna di atas terlebih dahulu agar stok bisa diinput per warna.
          <br />
          <span className="text-xs text-amber-600">Untuk sekarang ditampilkan sebagai "Umum".</span>
        </p>
      ) : null}

      <div className="space-y-5">
        {activeSizes.map(p => {
          // Total stok untuk ukuran ini
          const sizeTotal = LOCS.reduce((s, l) =>
            s + warnaList.reduce((ss, w) => ss + getStok(p.size, w, l.key), 0), 0);

          return (
            <div key={p.size} className="border-2 border-[#E8E3DC]">
              {/* Size header */}
              <div className="bg-[#F9F7F4] border-b-2 border-[#E8E3DC] px-4 py-2.5 flex items-center justify-between">
                <span className="text-base font-medium text-[#1A1918] uppercase tracking-[0.1em]">
                  {p.size}
                </span>
                <span className={`text-sm font-bold ${sizeTotal === 0 ? "text-[#C8C4C0]" : "text-[#1A1918]"}`}>
                  Total: {sizeTotal}
                </span>
              </div>

              {/* Mobile layout: per warna, input stacked */}
              <div className="divide-y divide-[#F0EBE3]">
                {warnaList.map(w => {
                  const warnaKey = hasWarna ? w : "_";
                  const rowTotal = LOCS.reduce((s, l) => s + getStok(p.size, warnaKey, l.key), 0);
                  return (
                    <div key={w} className="px-4 py-3">
                      {/* Warna label + total */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#6B6560] font-medium">{w}</span>
                        <span className={`text-sm font-bold ${rowTotal === 0 ? "text-[#C8C4C0]" : "text-[#1A1918]"}`}>
                          {rowTotal}
                        </span>
                      </div>

                      {/* Inputs per lokasi */}
                      <div className="grid grid-cols-3 gap-2">
                        {LOCS.map(l => (
                          <div key={l.key}>
                            <label className="block text-xs text-[#9C9690] mb-1">{l.label}</label>
                            <input
                              type="number" min="0"
                              value={getStok(p.size, warnaKey, l.key) || ""}
                              placeholder="0"
                              onChange={e => setStok(p.size, warnaKey, l.key, e.target.value)}
                              disabled={saving}
                              className={inputCls}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand total */}
      {activeSizes.length > 0 && (
        <div className="mt-4 border-2 border-[#E8E3DC] bg-[#F9F7F4] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6B6560] uppercase tracking-[0.12em]">Grand Total Stok</span>
            <span className={`text-lg font-bold ${grandTotal === 0 ? "text-[#C8C4C0]" : "text-[#1A1918]"}`}>
              {grandTotal}
            </span>
          </div>
          <div className="flex gap-6 mt-1">
            {LOCS.map(l => (
              <span key={l.key} className="text-xs text-[#9C9690]">
                {l.label}: <span className="font-medium text-[#6B6560]">{locTotal(l.key)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* HPP */}
      <div className="mt-6">
        <label className="block text-sm tracking-[0.15em] text-[#6B6560] mb-2 uppercase">
          HPP — Harga Pokok per Produk
        </label>
        <div className="flex items-center gap-3">
          <span className="text-base text-[#9C9690]">Rp</span>
          <input
            type="text" inputMode="numeric" value={hpp}
            onChange={e => setHpp(e.target.value.replace(/\D/g, ""))}
            disabled={saving} placeholder="150000"
            className="flex-1 bg-white border-2 border-[#E8E3DC] px-4 py-3 text-[#1A1918] text-base text-right focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition"
          />
        </div>

        {/* Margin preview */}
        {hpp && activeSet.size > 0 && (
          <div className="mt-3 space-y-1">
            {SIZE_PRESETS.filter(p => activeSet.has(p.size)).map(p => {
              const jual   = parseInt(hargaMap[p.size] ?? "0") || 0;
              const hppVal = parseInt(hpp) || 0;
              if (!jual || !hppVal) return null;
              const margin = Math.round(((jual - hppVal) / jual) * 100);
              return (
                <p key={p.size} className="text-sm text-[#9C9690]">
                  {p.size}: margin{" "}
                  <span className="text-[#6B6560] font-medium">{margin}%</span>
                  {" "}(untung Rp {formatHarga(jual - hppVal)})
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
