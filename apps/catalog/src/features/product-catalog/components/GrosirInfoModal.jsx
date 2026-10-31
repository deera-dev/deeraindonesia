import { WhatsApp } from "../../../shared/components/WhatsApp";
import { trackEvent } from "../../analytics";
import { GROSIR_POINTS, GROSIR_STEPS } from "../utils";

const WA_TEXT = "Assalamu'alaikum, saya ingin tanya cara order grosir per seri di Deera.";

export default function GrosirInfoModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-backdrop-in"
      />

      <div
        role="dialog"
        aria-label="Cara Order Grosir"
        className="relative z-10 w-[92%] max-w-md max-h-[90dvh] overflow-y-auto bg-black text-white p-7 border border-white/20 animate-modal-in"
      >
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-5 right-5 text-white/50 hover:text-white transition text-2xl leading-none w-10 h-10 flex items-center justify-center"
        >
          &#x2715;
        </button>

        <p className="font-editorial text-[10px] tracking-[0.3em] text-white/40 uppercase">
          Info Pembelian
        </p>
        <h2 className="mt-2 font-script text-[#cab170] text-4xl leading-none mb-2">
          Cara Order Grosir
        </h2>
        <div className="w-10 h-px bg-[#cab170]/35 mb-6" />

        <div className="space-y-5">
          {GROSIR_POINTS.map((p, i) => (
            <div key={p.title} className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center border border-[#cab170]/40 font-editorial text-xs text-[#cab170]">
                {i + 1}
              </span>
              <div>
                <p className="font-editorial text-xs tracking-[0.25em] text-[#cab170]/90 uppercase">
                  {p.title}
                </p>
                <p className="mt-1.5 font-editorial text-sm text-white/70 leading-relaxed">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 p-4 border border-white/10 bg-white/[0.03]">
          <p className="font-editorial text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">
            Langkah Order
          </p>
          <ol className="space-y-2 font-editorial text-sm text-white/65 leading-relaxed list-decimal pl-4">
            {GROSIR_STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>

        <p className="mt-6 font-editorial text-sm text-white/45 leading-relaxed">
          Terima kasih atas pengertiannya. Ketentuan ini membantu kami menjaga harga grosir tetap
          bersahabat untuk para mitra toko.
        </p>

        <a
          href={`https://wa.me/62811947254?text=${encodeURIComponent(WA_TEXT)}`}
          onClick={() => trackEvent("click_wa", { place: "grosir_info" })}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center w-full gap-3 py-4 font-editorial text-sm tracking-[0.25em] uppercase border border-white/20 hover:border-[#cab170]/60 text-white/70 hover:text-[#cab170] transition"
        >
          <WhatsApp className="w-5 h-5 text-green-400" />
          Tanya via WhatsApp
        </a>
      </div>
    </div>
  );
}
