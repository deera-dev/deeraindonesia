/**
 * HppSection.jsx — Field HPP + kalkulasi margin otomatis per ukuran.
 *
 * Props:
 *   hpp       — string (raw digits string)
 *   onHpp     — (val: string) => void
 *   activeSet — Set<string> ukuran aktif
 *   hargaMap  — { [size]: string } harga jual per ukuran
 *   saving    — boolean
 */
import { SIZE_PRESETS, formatHarga } from "@deera/shared/lib/constants";

export default function HppSection({ hpp, onHpp, activeSet, hargaMap, saving }) {
  return (
    <div className="mb-8">
      <label className="block text-sm tracking-[0.15em] text-skin-text2 mb-2 uppercase">
        HPP — Harga Pokok per Produk
      </label>
      <div className="flex items-center gap-3">
        <span className="text-base text-skin-text3">Rp</span>
        <input
          type="text"
          inputMode="numeric"
          value={hpp}
          onChange={(e) => onHpp(e.target.value.replace(/\D/g, ""))}
          disabled={saving}
          placeholder="150000"
          className="flex-1 bg-skin-card border-2 border-skin-bdr px-4 py-3 text-skin-text text-base text-right focus:outline-none focus:border-[#CAB170] disabled:opacity-40 transition"
        />
      </div>
      {hpp && activeSet.size > 0 && (
        <div className="mt-3 space-y-1">
          {SIZE_PRESETS.filter((p) => activeSet.has(p.size)).map((p) => {
            const jual = parseInt(hargaMap[p.size] ?? "0") || 0;
            const hppVal = parseInt(hpp) || 0;
            if (!jual || !hppVal) return null;
            const margin = Math.round(((jual - hppVal) / jual) * 100);
            return (
              <p key={p.size} className="text-sm text-skin-text3">
                {p.size}: margin <span className="text-skin-text2 font-medium">{margin}%</span>{" "}
                (untung Rp {formatHarga(jual - hppVal)})
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
