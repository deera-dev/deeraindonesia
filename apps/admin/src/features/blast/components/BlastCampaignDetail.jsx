/**
 * BlastCampaignDetail.jsx — halaman detail satu campaign blast: daftar
 * target + status (pending/terkirim/dilewati) + progress bar, dan tombol
 * "Kirim" per target.
 *
 * Alur kirim (permintaan Denny 2026-10, "klik satu-satu dibantu sistem"
 * karena TIDAK ada WhatsApp Business API — kirim massal otomatis akan
 * diblokir WA): klik "Kirim" → window.open(wa.me/<nomor>?text=<pesan>, "_blank")
 * supaya WA Web/app terbuka dengan pesan SUDAH terisi, admin tinggal pencet
 * kirim di sana → begitu tab WA terbuka (tidak diblok popup blocker, user
 * gesture asli dari klik tombol ini), target otomatis ditandai "terkirim"
 * lewat useMarkTargetMutation. Target tanpa no HP tidak bisa diklik "Kirim"
 * (tombol disabled) — admin bisa "Lewati" kalau memang mau skip.
 */
import { useMarkTargetMutation } from "../hooks";
import { buildWaLink, calcProgress } from "../utils";

const STATUS_LABEL = { pending: "Menunggu", terkirim: "Terkirim", dilewati: "Dilewati" };
const STATUS_COLOR = {
  pending: "text-skin-text3",
  terkirim: "text-[#25D366]",
  dilewati: "text-skin-text4",
};

export default function BlastCampaignDetail({ campaign, targets, onClose }) {
  const markMutation = useMarkTargetMutation(campaign.id);
  const progress = calcProgress(targets);

  function handleKirim(target) {
    const link = buildWaLink(target.no_hp, campaign.message);
    window.open(link, "_blank");
    markMutation.mutate({ targetId: target.id, status: "terkirim" });
  }

  function handleLewati(target) {
    markMutation.mutate({ targetId: target.id, status: "dilewati" });
  }

  function handleUndo(target) {
    markMutation.mutate({ targetId: target.id, status: "pending" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text truncate">
              {campaign.nama}
            </h2>
            <p className="text-xs text-skin-text3 mt-0.5">
              {progress.terkirim}/{progress.total} terkirim
              {progress.dilewati > 0 ? ` · ${progress.dilewati} dilewati` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="h-1.5 bg-skin-page flex-shrink-0">
          <div
            className="h-full bg-[#25D366] transition-all"
            style={{ width: progress.total ? `${((progress.terkirim + progress.dilewati) / progress.total) * 100}%` : "0%" }}
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
          {targets.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-skin-text truncate">{t.nama}</p>
                <p className="text-xs text-skin-text3 truncate">{t.no_hp || "- tanpa no HP -"}</p>
                <p className={`text-[11px] font-editorial tracking-[0.05em] uppercase mt-0.5 ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </p>
              </div>
              {t.status === "pending" ? (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLewati(t)}
                    className="px-3 py-2 text-xs font-editorial tracking-[0.08em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition"
                  >
                    Lewati
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKirim(t)}
                    disabled={!t.no_hp}
                    className="px-4 py-2 text-xs font-editorial tracking-[0.08em] uppercase text-white bg-[#25D366] hover:bg-[#20bb5a] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Kirim
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUndo(t)}
                  className="px-3 py-2 text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 hover:text-red-500 underline flex-shrink-0"
                >
                  Batal
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
