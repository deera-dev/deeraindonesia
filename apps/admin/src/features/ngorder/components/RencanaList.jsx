import SosmedLinks from "../../../shared/components/SosmedLinks";
import {
  buildGmapsPlaceUrl,
  fmtJarak,
  KUNJUNGAN_STATUS_LABEL,
  parseSosmed,
  sortRencana,
} from "../hooks";

const STATUS_BADGE = {
  rencana: "border border-skin-bdr-lt text-skin-text3",
  berlangsung: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  selesai: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
  batal: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
};

export default function RencanaList({
  rows,
  tokoById,
  jarakByToko = null,
  onFeedback,
  onRemove,
  onFocus,
  onOpenToko,
}) {
  const items = sortRencana(rows, jarakByToko).filter((r) => tokoById.has(r.toko_id));

  if (!items.length) {
    return (
      <p className="text-sm text-skin-text4 py-8 text-center px-6">
        Belum ada toko di rencana. Centang toko di tab "Semua Toko" atau dari pin di peta — semua
        akun yang ikut ngorder langsung melihat rencana yang sama.
      </p>
    );
  }

  return (
    <div className="divide-y divide-skin-bdr-lt">
      {items.map((r, i) => {
        const t = tokoById.get(r.toko_id);
        const hasLoc = t.lat != null && t.lng != null;
        const gmaps = buildGmapsPlaceUrl(t);
        return (
          <div key={r.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-skin-page text-[11px] font-bold text-skin-text2 flex items-center justify-center">
                {r.status === "selesai" ? "✓" : i + 1}
              </span>
              <button
                type="button"
                onClick={() => onOpenToko(t)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-sm font-semibold text-skin-text truncate">{t.nama}</p>
                <p className="text-xs text-skin-text3 truncate">
                  {t.daerah || t.alamat || "- lokasi belum lengkap -"}
                  {!hasLoc && <span className="text-amber-600"> · belum ada titik</span>}
                </p>
                {jarakByToko?.has(t.id) && (
                  <p className="text-[11px] font-semibold text-skin-accent-text">
                    {fmtJarak(jarakByToko.get(t.id))} dari lokasi Anda
                  </p>
                )}
              </button>
              <span
                className={`flex-shrink-0 text-[10px] font-editorial tracking-[0.05em] uppercase px-1.5 py-0.5 rounded ${STATUS_BADGE[r.status] ?? ""}`}
              >
                {KUNJUNGAN_STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>

            <div className="pl-9 space-y-1">
              <SosmedLinks items={parseSosmed(t.media_sosial, t.nama)}>
                {gmaps && (
                  <a
                    href={gmaps}
                    target="_blank"
                    rel="noreferrer"
                    className="text-skin-accent-text hover:underline"
                  >
                    Google Maps
                  </a>
                )}
              </SosmedLinks>
              {r.hasil && (
                <p className="text-xs text-skin-text2 whitespace-pre-line line-clamp-3">
                  {r.hasil}
                </p>
              )}
              {r.request && (
                <p className="text-xs text-skin-text2 whitespace-pre-line line-clamp-2">
                  <span className="font-semibold">Request:</span> {r.request}
                </p>
              )}
              <p className="text-[11px] text-skin-text4">
                {r.dipilih_oleh_nama ? `Dipilih ${r.dipilih_oleh_nama}` : ""}
                {r.diubah_oleh_nama && r.diubah_oleh_nama !== r.dipilih_oleh_nama
                  ? ` · diubah ${r.diubah_oleh_nama}`
                  : ""}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[11px] font-semibold uppercase">
                <button
                  type="button"
                  onClick={() => onFeedback(r)}
                  className="text-skin-accent-text underline"
                >
                  {r.status === "rencana" ? "Mulai / catat" : "Catatan"}
                </button>
                {hasLoc && (
                  <button
                    type="button"
                    onClick={() => onFocus(t)}
                    className="text-skin-text3 hover:text-skin-text underline"
                  >
                    Lihat di peta
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(r)}
                  className="text-skin-text3 hover:text-red-500 underline"
                >
                  Keluarkan
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
