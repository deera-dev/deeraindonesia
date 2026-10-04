/**
 * TripSampelSection.jsx — sampel yang dibawa: jumlah dibawa & jumlah yang
 * sudah dibagikan per kode (sisa = dibawa - terbagi).
 */
import { useMemo, useState } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import { addSampelToTrip, removeSampelFromTrip, changeSampelQty } from "../hooks";

const INPUT = "w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition";

function Stepper({ label, value, onDec, onInc }) {
  const btn = "w-7 h-7 border border-skin-bdr text-skin-text2 hover:border-[#CAB170] leading-none";
  return (
    <span className="flex items-center gap-1.5 text-xs text-skin-text3">
      {label}
      <button type="button" onClick={onDec} className={btn} aria-label={`Kurangi ${label}`}>−</button>
      <span className="w-6 text-center text-skin-text font-semibold">{value}</span>
      <button type="button" onClick={onInc} className={btn} aria-label={`Tambah ${label}`}>+</button>
    </span>
  );
}

export default function TripSampelSection({ trip, save }) {
  const { products = [] } = useProducts();
  const [search, setSearch] = useState("");
  const list = trip.sampel ?? [];

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const have = new Set(list.map((s) => s.kode));
    return products
      .filter((p) => !have.has(p.kode) && `${p.kode} ${p.nama ?? ""}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [products, list, search]);

  return (
    <div className="space-y-3">
      {list.length === 0 && <p className="text-xs text-skin-text4">Belum ada sampel.</p>}
      {list.map((s) => (
        <div key={s.kode} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-skin-text truncate">
              <span className="font-semibold">{s.kode}</span>
              {s.nama ? <span className="text-skin-text3"> · {s.nama}</span> : null}
            </p>
            <button type="button" onClick={() => save({ sampel: removeSampelFromTrip(list, s.kode) })} aria-label="Hapus" className="text-skin-text3 hover:text-red-500 text-lg leading-none">
              ×
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Stepper label="Bawa" value={s.qty} onDec={() => save({ sampel: changeSampelQty(list, s.kode, "qty", -1) })} onInc={() => save({ sampel: changeSampelQty(list, s.kode, "qty", 1) })} />
            <Stepper label="Terbagi" value={s.terbagi} onDec={() => save({ sampel: changeSampelQty(list, s.kode, "terbagi", -1) })} onInc={() => save({ sampel: changeSampelQty(list, s.kode, "terbagi", 1) })} />
          </div>
        </div>
      ))}

      <div className="pt-2 border-t border-skin-bdr-lt space-y-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kode / nama produk..." className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition" />
        {candidates.map((p) => (
          <button
            key={p.kode}
            type="button"
            onClick={() => {
              save({ sampel: addSampelToTrip(list, { kode: p.kode, nama: p.nama }) });
              setSearch("");
            }}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left border border-skin-bdr-lt hover:border-[#CAB170] transition"
          >
            <span className="min-w-0 text-sm text-skin-text truncate">
              <span className="font-semibold">{p.kode}</span> · {p.nama}
            </span>
            <span className="text-[#CAB170] text-lg leading-none">+</span>
          </button>
        ))}
      </div>
    </div>
  );
}
