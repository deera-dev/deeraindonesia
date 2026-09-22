/**
 * RangeWithMarks.jsx — Slider dengan tick marks + manual input.
 *
 * Kunci/Unlock (permintaan Denny 2026-09): "sering banget kejadian
 * slidernya terpencet dan berubah angkanya jadi tidak sesuai" — slider ini
 * SELALU mulai TERKUNCI begitu dirender (drag thumb, tombol chip mark, dan
 * toggle "Input manual" semuanya dinonaktifkan sampai admin tekan "Ubah"),
 * sama seperti RangeSlider.jsx di app Finance (lihat komentar di sana utk
 * alasan lengkap). Status kunci LOKAL per instance, reset tiap form dibuka
 * ulang — tidak disimpan ke DB.
 */
import { useState } from "react";
import { fmtRp } from "../utils";

export default function RangeWithMarks({
  value,
  onChange,
  min,
  max,
  step = 500,
  marks = [],
  zeroLabel = null,
}) {
  const [showManual, setShowManual] = useState(false);
  const [locked, setLocked] = useState(true);
  const num = Number(value) || 0;
  const pct = (v) => `${((v - min) / (max - min)) * 100}%`;

  return (
    <div className="space-y-1">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(num, min), max)}
        disabled={locked}
        onChange={(e) => {
          // Guard eksplisit selain atribut `disabled` — lihat komentar sama di RangeSlider.jsx (app Finance).
          if (locked) return;
          onChange(Number(e.target.value));
        }}
        className={`w-full accent-[#CAB170] cursor-pointer h-1.5 ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      <div className="relative h-6 mx-0.5 select-none">
        <span className="absolute left-0 top-0 text-[10px] text-skin-text4 -translate-x-1/2">
          {min === 0 ? (zeroLabel ?? "0") : `${min / 1000}rb`}
        </span>
        <span className="absolute right-0 top-0 text-[10px] text-skin-text4 translate-x-1/2">
          {max / 1000}rb
        </span>
        {marks.map((m) => (
          <button
            key={m.value}
            type="button"
            disabled={locked}
            onClick={() => {
              if (locked) return;
              onChange(m.value);
            }}
            style={{ left: pct(m.value) }}
            className={`absolute top-0 -translate-x-1/2 flex flex-col items-center gap-0.5 group ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="w-px h-2 bg-[#CAB170]/50 group-hover:bg-[#CAB170] transition" />
            <span className="text-[10px] text-[#CAB170]/70 group-hover:text-[#CAB170] transition font-semibold whitespace-nowrap">
              {m.label}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-[#CAB170]">
          {num === 0 && zeroLabel ? zeroLabel : fmtRp(num)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocked((v) => !v)}
            className="text-[11px] font-editorial tracking-[0.1em] uppercase text-skin-text3 hover:text-[#CAB170] transition underline"
          >
            {locked ? "🔒 Ubah" : "🔓 Kunci"}
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => setShowManual((v) => !v)}
            className={`text-[11px] font-editorial tracking-[0.1em] uppercase text-skin-text3 hover:text-[#CAB170] transition underline ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {showManual ? "Tutup" : "Input manual"}
          </button>
        </div>
      </div>
      {showManual && !locked && (
        <input
          type="number"
          min={0}
          className="w-full px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
          value={num}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
    </div>
  );
}
