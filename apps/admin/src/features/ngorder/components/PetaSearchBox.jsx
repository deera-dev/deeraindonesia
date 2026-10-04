/**
 * PetaSearchBox.jsx — kotak cari alamat (Places API (New)) + ikon GPS, utk
 * set "titik Anda". Dropdown saran dibuat sendiri (bukan widget Google) supaya
 * ikut tema gelap/terang. Hemat biaya: debounce 350ms, min 3 huruf, 1 sesi
 * (sessionToken) per pencarian -> lihat catatan di geocode.js.
 */
import { useEffect, useRef, useState } from "react";
import { createPlacesSessionToken, searchPlaceSuggestions, getPlaceLocation } from "@deera/shared/lib/geocode";
import { toast } from "@deera/shared/features/toast/hooks";

export default function PetaSearchBox({ onPick, onLocate, locating }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const tokenRef = useRef(null);
  const reqRef = useRef(0);
  const skipRef = useRef(false);
  const errToastedRef = useRef(false);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    const q = text.trim();
    const id = ++reqRef.current;
    if (q.length < 3) {
      setItems([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        tokenRef.current ??= await createPlacesSessionToken();
        const res = await searchPlaceSuggestions(q, tokenRef.current);
        if (id === reqRef.current) {
          setItems(res);
          setOpen(true);
        }
      } catch {
        if (id !== reqRef.current) return;
        setItems([]);
        if (!errToastedRef.current) {
          errToastedRef.current = true;
          toast.error('Pencarian gagal - aktifkan "Places API (New)" di Google Cloud untuk key ini.');
        }
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [text]);

  async function pick(item) {
    skipRef.current = true;
    setText(item.text);
    setItems([]);
    setOpen(false);
    try {
      const loc = await getPlaceLocation(item.prediction);
      tokenRef.current = null; // sesi ditutup oleh Place Details
      if (loc) onPick(loc, item.text);
      else toast.error("Lokasi tidak ditemukan.");
    } catch {
      toast.error("Gagal mengambil lokasi dari hasil pencarian.");
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Cari alamat / tempat..."
        className="w-full bg-skin-card border border-skin-bdr pl-3 pr-11 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
      />
      <button
        type="button"
        onClick={onLocate}
        disabled={locating}
        title="Pakai lokasi saya"
        aria-label="Pakai lokasi saya"
        className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-skin-text3 hover:text-[#CAB170] disabled:opacity-40 transition"
      >
        <svg viewBox="0 0 24 24" className={`w-5 h-5 ${locating ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
          <circle cx="12" cy="12" r="7" />
        </svg>
      </button>
      {open && items.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-skin-card border border-skin-bdr shadow-lg max-h-60 overflow-y-auto">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(it)}
                className="w-full text-left px-3 py-2 text-sm text-skin-text hover:bg-skin-bg2 border-b border-skin-bdr-lt last:border-0"
              >
                {it.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
