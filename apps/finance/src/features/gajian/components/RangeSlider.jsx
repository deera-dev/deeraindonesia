import { labelCls } from "../../../shared/lib/format";

function fmtK(v) {
  return v >= 1000 ? `${v / 1000}k` : String(v);
}

/** RangeSlider.jsx — Slider tarif + chip mark yang bisa diklik langsung. */
export default function RangeSlider({ label, value, min, max, step = 1000, marks = [], onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={labelCls}>{label}</span>
        <span className="font-editorial text-sm text-skin-text">Rp {Number(value).toLocaleString("id-ID")}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: "#CAB170" }}
        className="w-full"
      />
      {marks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {marks.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              className={`px-2 py-1 text-xs font-editorial rounded-none border transition ${
                Number(value) === m
                  ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                  : "border-skin-bdr text-skin-text3 hover:border-[#CAB170]"
              }`}
            >
              {fmtK(m)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
