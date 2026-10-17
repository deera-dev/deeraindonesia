import { useState } from "react";
import { labelCls } from "../../../shared/lib/format";

function fmtK(v) {
  return v >= 1000 ? `${v / 1000}k` : String(v);
}

export default function RangeSlider({ label, value, min, max, step = 1000, marks = [], onChange }) {
  const [locked, setLocked] = useState(true);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={labelCls}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-editorial text-sm text-skin-text">Rp {Number(value).toLocaleString("id-ID")}</span>
          <button
            type="button"
            onClick={() => setLocked((v) => !v)}
            className="text-[10px] font-editorial tracking-[0.1em] uppercase text-skin-text3 hover:text-skin-accent-text transition underline"
          >
            {locked ? "🔒 Ubah" : "🔓 Kunci"}
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={locked}
        onChange={(e) => {
          if (locked) return;
          onChange(Number(e.target.value));
        }}
        style={{ accentColor: "#CAB170" }}
        className={`w-full ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      {marks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {marks.map((m) => (
            <button
              key={m}
              type="button"
              disabled={locked}
              onClick={() => {
                if (locked) return;
                onChange(m);
              }}
              className={`px-2 py-1 text-xs font-editorial rounded-none border transition ${locked ? "opacity-50 cursor-not-allowed" : ""} ${
                Number(value) === m
                  ? "border-skin-accent text-skin-accent-text bg-skin-gold"
                  : "border-skin-bdr text-skin-text3 hover:border-skin-accent"
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
