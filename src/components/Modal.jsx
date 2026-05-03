import { Link } from "react-router-dom";
import { WhatsApp } from "../svg/WhatsApp";

export default function Modal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* MODAL BOX */}
      <div className="relative z-10 w-[90%] max-w-md bg-black text-white p-6 border border-white/20">
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white"
        >
          ✕
        </button>

        {/* TITLE */}
        <h2 className="font-editorial text-lg tracking-[0.2em] mb-6">
          VISIT US
        </h2>

        {/* ADDRESS */}
        <div className="mb-6 space-y-5 text-sm text-white/80">
          {/* CIDENG */}
          <div>
            <p className="mb-1 text-white">Pasar Tasik Cideng</p>
            <p>
              Jl. Cideng Timur, RT 5 RW 1.
              <br />
              Gg. 8 Zona C, Samping Pom Bensin
              <br />
              Petojo Selatan, Kecamatan Gambir
              <br />
              Jakarta Pusat, DKI Jakarta 10130
            </p>

            <p className="mt-2 text-xs tracking-wide text-white/60">
              Buka: 03.00 – 12.00 WIB
              <br />
              <Link to={"/admin"}>Setiap Senin & Kamis</Link>
            </p>
          </div>

          {/* TEGALGUBUG */}
          <div>
            <p className="mb-1 text-white">Pasar Sandang Tegalgubug Cirebon</p>
            <p>
              Jl. Pantura – Jatibarang Palimanan, Blok E<br />
              Tegalgubug, Arjawinangun
              <br />
              Cirebon, Jawa Barat 45162
            </p>

            <p className="mt-2 text-xs tracking-wide text-white/60">
              Buka: 04.00 – 14.00 WIB
              <br />
              Setiap Jumat
            </p>
          </div>
        </div>

        {/* WHATSAPP */}
        <a
          href="https://wa.me/62811947254"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full gap-3 py-3 transition border border-white/30 hover:border-white"
        >
          <WhatsApp className="w-5 h-5 text-green-500" />
          <span className="text-sm tracking-widest">
            CONTACT US VIA WHATSAPP
          </span>
        </a>
      </div>
    </div>
  );
}
