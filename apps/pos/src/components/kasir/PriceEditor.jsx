/**
 * PriceEditor.jsx
 * Input inline untuk mengubah harga satu item di keranjang.
 * Muncul saat kasir tap label harga. Mendukung Enter/Escape.
 */
import { useState } from "react";

export default function PriceEditor({ harga, onSave, onCancel }) {
  const [val, setVal] = useState(String(harga));

  function save() {
    const parsed = parseInt(val.replace(/\D/g, ""), 10);
    onSave(parsed > 0 ? parsed : harga);
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-sm text-[#6B6560] flex-shrink-0">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter")  save();
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 min-w-0 border-2 border-[#CAB170] bg-white px-3 py-2 text-base text-[#1A1918] text-right focus:outline-none"
      />
      <button
        onClick={save}
        className="h-11 w-11 bg-[#CAB170] text-white text-xl font-bold flex-shrink-0 flex items-center justify-center"
        aria-label="Simpan harga"
      >
        ✓
      </button>
      <button
        onClick={onCancel}
        className="h-11 w-11 border-2 border-[#E8E3DC] text-xl text-[#6B6560] flex-shrink-0 flex items-center justify-center"
        aria-label="Batal"
      >
        ✕
      </button>
    </div>
  );
}
