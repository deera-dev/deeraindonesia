/**
 * BuyerInput.jsx
 * Input nama pembeli dengan autocomplete dari database pelanggan.
 * Jika nama baru diketik, pengguna bisa menyimpannya sebagai pelanggan baru.
 */
import { useState, useEffect, useRef } from "react";
import { searchPelanggan, addPelanggan } from "../../pelanggan";

export default function BuyerInput({ value, onChange, onSelect, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cari pelanggan saat value berubah
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    searchPelanggan(value).then((res) => {
      if (!cancelled) {
        setSuggestions(res);
        setOpen(res.length > 0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const h = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const exactMatch = suggestions.find((p) => p.nama.toLowerCase() === value.toLowerCase());

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        disabled={disabled}
        placeholder="Nama pembeli (opsional)"
        className="w-full bg-skin-page border-2 border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4"
      />

      {open && (
        <div className="absolute bottom-full left-0 right-0 bg-skin-card border-2 border-skin-bdr border-b-0 shadow-lg z-20 max-h-48 overflow-y-auto">
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-4 hover:bg-skin-gold border-b border-skin-bdr-lt last:border-0 transition"
            >
              <p className="text-base font-medium text-skin-text">{p.nama}</p>
              {p.no_hp && <p className="text-sm text-skin-text2 mt-0.5">{p.no_hp}</p>}
            </button>
          ))}

          {/* Opsi simpan sebagai pelanggan baru jika belum ada */}
          {value.trim() && !exactMatch && (
            <button
              type="button"
              onClick={async () => {
                const np = await addPelanggan({ nama: value.trim().toUpperCase() });
                onSelect(np);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-4 text-base text-[#CAB170] hover:bg-skin-gold transition border-t-2 border-skin-bdr"
            >
              + Simpan <strong>"{value.trim()}"</strong> sebagai pelanggan
            </button>
          )}
        </div>
      )}
    </div>
  );
}
