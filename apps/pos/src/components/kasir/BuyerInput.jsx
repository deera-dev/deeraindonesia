/**
 * BuyerInput.jsx
 * Input nama pembeli dengan autocomplete dari database pelanggan.
 * Jika nama baru diketik, pengguna bisa menyimpannya sebagai pelanggan baru.
 */
import { useState, useEffect, useRef } from "react";
import { searchPelanggan, addPelanggan } from "../../hooks/usePelanggan";

export default function BuyerInput({ value, onChange, onSelect, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cari pelanggan saat value berubah
  useEffect(() => {
    if (!value.trim()) { setSuggestions([]); setOpen(false); return; }
    let cancelled = false;
    searchPelanggan(value).then((res) => {
      if (!cancelled) { setSuggestions(res); setOpen(res.length > 0); }
    });
    return () => { cancelled = true; };
  }, [value]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const exactMatch = suggestions.find(
    (p) => p.nama.toLowerCase() === value.toLowerCase(),
  );

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        disabled={disabled}
        placeholder="Nama pembeli (opsional)"
        className="w-full bg-[#F9F7F4] border-2 border-[#E8E3DC] px-4 py-4 text-base text-[#1A1918] focus:outline-none focus:border-[#CAB170] transition placeholder:text-[#C8C4C0]"
      />

      {open && (
        <div className="absolute bottom-full left-0 right-0 bg-white border-2 border-[#E8E3DC] border-b-0 shadow-lg z-20 max-h-48 overflow-y-auto">
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelect(p); setOpen(false); }}
              className="w-full text-left px-4 py-4 hover:bg-[#FDF5E6] border-b border-[#F0EBE3] last:border-0 transition"
            >
              <p className="text-base font-medium text-[#1A1918]">{p.nama}</p>
              {p.no_hp && <p className="text-sm text-[#6B6560] mt-0.5">{p.no_hp}</p>}
            </button>
          ))}

          {/* Opsi simpan sebagai pelanggan baru jika belum ada */}
          {value.trim() && !exactMatch && (
            <button
              type="button"
              onClick={async () => {
                const np = await addPelanggan({ nama: value.trim() });
                onSelect(np);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-4 text-base text-[#CAB170] hover:bg-[#FDF5E6] transition border-t-2 border-[#E8E3DC]"
            >
              + Simpan <strong>"{value.trim()}"</strong> sebagai pelanggan
            </button>
          )}
        </div>
      )}
    </div>
  );
}
