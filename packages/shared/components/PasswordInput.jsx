import { useState } from "react";

export default function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative w-full">
      {/* BUG FIX (November 2026, laporan: "ketika login dan form passwordnya
          di show, dia otomatis capslock yang dimana passwordny lowercase
          semua alhasil gagal login") — browser TIDAK autocapitalize
          type="password" secara default, tapi begitu toggle "tampilkan
          password" ganti ke type="text" tanpa autoCapitalize eksplisit,
          keyboard mobile mengaktifkan autocapitalize (huruf pertama/setelah
          spasi otomatis kapital) — password yang sebenarnya all-lowercase
          jadi berubah isinya, bukan cuma tampilan, sehingga login gagal.
          autoCapitalize/autoCorrect/spellCheck dipaksa off di SINI (bukan
          cuma saat visible) supaya konsisten persis sama di kedua mode. */}
      <input
        {...props}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${className} w-full pr-12`}
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
