import { WhatsApp } from "../svg/WhatsApp";

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL ?? "https://admin.deera.id";

export default function Modal({ open, onClose }) {
  if (!open) return null;

  function handleSecretAdmin() {
    onClose();
    window.location.href = ADMIN_URL;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative z-10 w-[90%] max-w-md bg-black text-white p-6 border border-white/15">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition text-lg leading-none"
        >
          &#x2715;
        </button>

        <h2 className="font-script text-[#cab170] text-4xl leading-none mb-1">Visit Us</h2>
        <div className="w-8 h-px bg-[#cab170]/35 mb-6" />

        <div className="mb-6 space-y-5 font-editorial text-sm text-white/65 leading-relaxed">
          <div>
            <p className="mb-1.5 font-editorial text-[10px] tracking-[0.25em] text-[#cab170]/80 uppercase">
              Pasar Tasik Cideng
            </p>
            <p>
              Jl. Cideng Timur, RT 5 RW 1.<br />
              Gg. 8 Zona C, Samping Pom Bensin<br />
              Petojo Selatan, Kecamatan Gambir<br />
              Jakarta Pusat, DKI Jakarta 10130
            </p>
            <p className="mt-2 text-xs text-white/35">
              Buka: 03.00 &ndash; 12.00 WIB &nbsp;&middot;&nbsp; Setiap Senin &amp; Kamis
            </p>
          </div>
          <div>
            <p className="mb-1.5 font-editorial text-[10px] tracking-[0.25em] text-[#cab170]/80 uppercase">
              Pasar Sandang Tegalgubug Cirebon
            </p>
            <p>
              Jl. Pantura &ndash; Jatibarang Palimanan, Blok E<br />
              Tegalgubug, Arjawinangun<br />
              Cirebon, Jawa Barat 45162
            </p>
            <p className="mt-2 text-xs text-white/35">
              Buka: 04.00 &ndash; 14.00 WIB &nbsp;&middot;&nbsp; Setiap Jumat
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/62811947254"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full gap-3 py-3 font-editorial text-xs tracking-[0.25em] uppercase border border-white/15 hover:border-[#cab170]/50 text-white/60 hover:text-[#cab170] transition"
        >
          <WhatsApp className="w-4 h-4 text-green-500" />
          Contact via WhatsApp
        </a>

        <button
          onClick={handleSecretAdmin}
          className="mt-4 w-full text-center font-editorial text-[9px] tracking-[0.2em] text-white/10 select-none"
          aria-hidden="true"
        >
          DEERA &copy; 2025
        </button>
      </div>
    </div>
  );
}
