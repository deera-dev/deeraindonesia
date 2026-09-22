import { useState } from "react";
import { labelCls } from "../../../shared/lib/format";

function fmtK(v) {
  return v >= 1000 ? `${v / 1000}k` : String(v);
}

/**
 * RangeSlider.jsx — Slider tarif + chip mark yang bisa diklik langsung.
 *
 * Kunci/Unlock (permintaan Denny 2026-09): "sering banget kejadian
 * slidernya terpencet dan berubah angkanya jadi tidak sesuai" — slider ini
 * (dan semua slider uang lain di app Admin & Finance) SELALU mulai
 * TERKUNCI begitu dirender (thumb drag + tombol chip mark dinonaktifkan),
 * apapun nilai awalnya (baru/hasil auto-isi/hasil edit — semuanya "sudah
 * ada valuenya" dari sudut pandang admin). Admin WAJIB tekan "Ubah" dulu
 * baru slider bisa digeser/diklik — mencegah tersenggol tanpa sengaja saat
 * scroll di HP. Status kunci LOKAL per form (reset ke terkunci lagi tiap
 * form dibuka ulang), bukan disimpan ke DB.
 */
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
            className="text-[10px] font-editorial tracking-[0.1em] uppercase text-skin-text3 hover:text-[#CAB170] transition underline"
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
          // Guard eksplisit (bukan cuma andalkan atribut `disabled`) — di
          // browser asli, input disabled memang tidak bisa disentuh/digeser
          // sama sekali, tapi guard ini jaga-jaga juga (defense in depth)
          // supaya perilaku "terkunci = tidak bisa berubah" tetap benar
          // walau event change terpicu lewat jalur lain.
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
