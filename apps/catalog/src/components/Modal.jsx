import { WhatsApp } from "../svg/WhatsApp";

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL ?? "https://admin.deera.id";

export default function Modal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative z-10 w-[92%] max-w-md bg-black text-white p-7 border border-white/20">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition text-2xl leading-none w-10 h-10 flex items-center justify-center"
        >
          &#x2715;
        </button>

        <h2 className="font-script text-[#cab170] text-5xl leading-none mb-2">Visit Us</h2>
        <div className="w-10 h-px bg-[#cab170]/35 mb-7" />

        <div className="mb-7 space-y-6 font-editorial text-white/70 leading-relaxed">
          <div>
            <p className="mb-2 font-editorial text-xs tracking-[0.25em] text-[#cab170]/90 uppercase">
              Pasar Tasik Cideng
            </p>
            <p className="text-base">
              Jl. Cideng Timur, RT 5 RW 1.
              <br />
              Gg. 8 Zona C, Samping Pom Bensin
              <br />
              Petojo Selatan, Gambir, Jakarta Pusat
            </p>
            <p className="mt-2 text-sm text-white/40">
              Buka: 03.00 – 12.00 WIB &nbsp;·&nbsp; Senin &amp; Kamis
            </p>
          </div>
          <div>
            <p className="mb-2 font-editorial text-xs tracking-[0.25em] text-[#cab170]/90 uppercase">
              Pasar Sandang Tegalgubug
            </p>
            <p className="text-base">
              Jl. Pantura, Blok E<br />
              Tegalgubug, Arjawinangun, Cirebon
            </p>
            <p className="mt-2 text-sm text-white/40">
              Buka: 04.00 – 14.00 WIB &nbsp;·&nbsp; Jumat
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/62811947254"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full gap-3 py-4 font-editorial text-sm tracking-[0.25em] uppercase border border-white/20 hover:border-[#cab170]/60 text-white/70 hover:text-[#cab170] transition"
        >
          <WhatsApp className="w-5 h-5 text-green-400" />
          Hubungi via WhatsApp
        </a>

        <button
          onClick={() => {
            onClose();
            window.location.href = ADMIN_URL;
          }}
          className="mt-5 w-full text-center font-editorial text-[9px] tracking-[0.2em] text-white/8 select-none"
          aria-hidden="true"
        >
          DEERA &copy; 2025
        </button>
      </div>
    </div>
  );
}
