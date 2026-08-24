/**
 * PasswordInput.jsx
 * Input password REUSABLE dengan tombol show/hide (ikon mata) — dipakai di
 * semua halaman login (Admin/POS/Finance) supaya user bisa memeriksa
 * password yang diketik sebelum submit.
 *
 * Props: sama seperti <input> biasa (value, onChange, autoComplete,
 * required, dll, semua diteruskan apa adanya via spread) DITAMBAH:
 *   className — className untuk <input> itu sendiri, PERSIS seperti kalau
 *               pakai <input type="password"> langsung (padding-right
 *               ekstra ditambahkan otomatis lewat "pr-12" supaya teks
 *               tidak ketiban tombol mata).
 *
 * BUG FIX (2026-08, dilaporkan Denny: "bagian passwordnya jangan terputus
 * gitu, saya mau panjang bagian putihnya sama dengan username"): input
 * polos sebagai anak langsung dari container flex-col (lihat LoginPage/
 * LoginScreen) otomatis melebar penuh lewat `align-items: stretch` flexbox
 * bawaan. Begitu input dibungkus <div> (buat nempatin tombol mata), input
 * itu BUKAN LAGI anak flex langsung — dia balik ke lebar intrinsik default
 * browser (~20 karakter), jauh lebih sempit dari field Username di
 * sebelahnya, dan tombol mata (absolute, right-0 relatif ke wrapper yang
 * tetap full-width) jadi keliatan "mengambang" terpisah jauh dari kotak
 * input. Fix: `w-full` eksplisit di <input> DAN wrapper supaya keduanya
 * selalu melebar penuh terlepas dari konteks flex di luar.
 *
 * Toggle murni state lokal (tidak persist, tidak dibagi ke komponen lain)
 * — sesuai konvensi CLAUDE.md §7 untuk useState biasa.
 */
import { useState } from "react";

export default function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative w-full">
      <input
        type={visible ? "text" : "password"}
        className={`${className} w-full pr-12`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-skin-text3 hover:text-skin-text2 transition"
      >
        {visible ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 8 11 8a9.26 9.26 0 0 0 5.39-1.61" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
