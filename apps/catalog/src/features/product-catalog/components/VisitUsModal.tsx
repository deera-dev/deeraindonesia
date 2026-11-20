import { env } from "../../../env";
import { WhatsApp } from "../../../shared/components/WhatsApp";
import { trackEvent } from "../../analytics";

const ADMIN_URL = env.VITE_ADMIN_URL;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onGrosirInfo?: () => void;
}

export default function Modal({ open, onClose, onGrosirInfo }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-backdrop-in"
      />

      <div className="relative z-10 w-[92%] max-w-md bg-aurum-bg text-aurum-text p-7 border border-aurum-border/20 animate-modal-in">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-5 right-5 text-aurum-text/50 hover:text-aurum-text text-2xl leading-none"
        >
          &#x2715;
        </button>

        <h2 className="font-display text-aurum-accent text-5xl leading-none mb-2">Visit Us</h2>
        <div className="w-10 h-px bg-aurum-accent/35 mb-6" />

        <div className="mb-7 p-4 border border-aurum-accent/30 bg-aurum-accent/[0.06]">
          <p className="font-body text-xs tracking-[0.25em] text-aurum-accent uppercase">
            Khusus Grosir
          </p>
          <p className="mt-2 font-body text-sm text-aurum-text/70 leading-relaxed">
            Pembelian per seri (semua warna dalam satu model). Mohon maaf, kami belum melayani
            pembelian satuan.
          </p>
          {onGrosirInfo && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGrosirInfo();
              }}
              className="mt-3 font-body text-xs tracking-[0.2em] text-aurum-accent/90 uppercase hover:text-aurum-accent transition"
            >
              Lihat cara order &rarr;
            </button>
          )}
        </div>

        <div className="mb-7 space-y-6 font-body text-aurum-text/70 leading-relaxed">
          <div>
            <p className="mb-2 font-body text-xs tracking-[0.25em] text-aurum-accent/90 uppercase">
              Pasar Tasik Cideng
            </p>
            <p className="text-base">
              Jl. Cideng Timur, RT 5 RW 1.
              <br />
              Gg. 8 Zona C, Samping Pom Bensin
              <br />
              Petojo Selatan, Gambir, Jakarta Pusat
            </p>
            <p className="mt-2 text-sm text-aurum-text/40">
              Buka: 03.00 – 12.00 WIB &nbsp;·&nbsp; Senin &amp; Kamis
            </p>
          </div>
          <div>
            <p className="mb-2 font-body text-xs tracking-[0.25em] text-aurum-accent/90 uppercase">
              Pasar Sandang Tegalgubug
            </p>
            <p className="text-base">
              Jl. Pantura, Blok E<br />
              Tegalgubug, Arjawinangun, Cirebon
            </p>
            <p className="mt-2 text-sm text-aurum-text/40">
              Buka: 04.00 – 14.00 WIB &nbsp;·&nbsp; Jumat
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/62811947254"
          onClick={() => trackEvent("click_wa", { place: "visit_us" })}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full gap-3 py-4 font-body text-sm tracking-[0.25em] uppercase border border-aurum-border/20 hover:border-aurum-accent/60 text-aurum-text/70 hover:text-aurum-accent transition"
        >
          <WhatsApp className="w-5 h-5 text-[#25D366]" />
          Hubungi via WhatsApp
        </a>

        <button
          onClick={() => {
            onClose();
            window.location.href = ADMIN_URL;
          }}
          className="mt-5 w-full text-center font-body text-[9px] tracking-[0.2em] text-aurum-text/8 select-none"
          aria-hidden="true"
        >
          DEERA &copy; 2025
        </button>
      </div>
    </div>
  );
}
