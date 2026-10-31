import { useProducts } from "@deera/shared/features/products/hooks";
import { LOCATION_LABELS, LOCATIONS } from "@deera/shared/lib/marketDay";
import { DATE_PRESETS } from "../constants";
import { useAnalyticsFilter } from "../hooks";

export default function GlobalFilterBar() {
  const { filter, datePreset, setDateRange, setLocation, setKode, setDatePreset } =
    useAnalyticsFilter();
  const { products } = useProducts();

  return (
    <div className="border-t border-skin-bdr-lt px-4 py-2.5 flex flex-col gap-2 md:px-8">
      <div className="flex border border-skin-bdr">
        {DATE_PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDatePreset(key)}
            aria-pressed={datePreset === key}
            className={`flex-1 py-1.5 font-editorial text-[10px] sm:text-xs tracking-[0.1em] uppercase transition border-r last:border-r-0 border-skin-bdr ${
              datePreset === key
                ? "bg-skin-accent text-skin-on-accent"
                : "text-skin-text3 hover:text-skin-text bg-skin-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {datePreset === "custom" && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <input
            type="date"
            value={filter.fromDate}
            max={filter.toDate}
            onChange={(e) => setDateRange(e.target.value, filter.toDate)}
            className="flex-1 min-w-[132px] bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-skin-accent transition"
          />
          <span className="text-skin-text4 text-xs flex-shrink-0">—</span>
          <input
            type="date"
            value={filter.toDate}
            min={filter.fromDate}
            onChange={(e) => setDateRange(filter.fromDate, e.target.value)}
            className="flex-1 min-w-[132px] bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-skin-accent transition"
          />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filter.location ?? ""}
          onChange={(e) => setLocation(e.target.value || null)}
          className="flex-1 min-w-[130px] px-3 py-1.5 text-xs font-semibold tracking-wide border border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-skin-accent transition cursor-pointer"
        >
          <option value="">Semua Market</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {LOCATION_LABELS[loc] ?? loc}
            </option>
          ))}
        </select>

        <select
          value={filter.kode ?? ""}
          onChange={(e) => setKode(e.target.value || null)}
          className="flex-1 min-w-[130px] px-3 py-1.5 text-xs font-semibold tracking-wide border border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-skin-accent transition cursor-pointer"
        >
          <option value="">Semua Produk</option>
          {(products ?? []).map((p) => (
            <option key={p.kode} value={p.kode}>
              {p.kode} — {p.nama}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
