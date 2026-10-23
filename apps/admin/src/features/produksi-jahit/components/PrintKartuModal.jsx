import { useEffect, useRef, useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useKaryawanPotong } from "../../produksi-record/hooks";
import { qrDataUrl } from "../render";
import { useSetTukangPotongForBatch } from "../hooks";
import { jahitCardScanUrl } from "../utils";
import KartuJahitContent, { CARD_H_MM, CARD_W_MM } from "./KartuJahitContent";

const MM_TO_PX = 96 / 25.4;
const NATURAL_W_PX = Math.round(CARD_W_MM * MM_TO_PX);
const NATURAL_H_PX = Math.round(CARD_H_MM * MM_TO_PX);

export default function PrintKartuModal({ card, onClose }) {
  const [qr, setQr] = useState(null);
  const outerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const { karyawanList: tukangPotongList } = useKaryawanPotong();
  const { setTukangPotong, setting } = useSetTukangPotongForBatch();

  const existingTukangPotongId = card?.produksi_batch?.tukang_potong_id ?? "";
  const existingTukangPotongNama = card?.produksi_batch?.tukang_potong_nama ?? "";
  const [tukangPotongId, setTukangPotongId] = useState(existingTukangPotongId);

  useEffect(() => {
    setTukangPotongId(existingTukangPotongId);
  }, [card?.id, existingTukangPotongId]);

  useEffect(() => {
    if (!card) {
      setQr(null);
      return undefined;
    }
    let cancelled = false;
    qrDataUrl(jahitCardScanUrl(card.id), 400).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [card?.id]);

  useEffect(() => {
    if (!card || existingTukangPotongId || tukangPotongId || tukangPotongList.length !== 1) return;
    handleChangeTukangPotong(tukangPotongList[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, tukangPotongList, existingTukangPotongId]);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const update = () => {
      const w = outer.clientWidth;
      if (w > 0) setScale(Math.max(1, (w - 32) / NATURAL_W_PX));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    return () => ro.disconnect();
  }, []);

  if (!card) return null;

  const selectedNama = tukangPotongList.find((k) => k.id === tukangPotongId)?.nama ?? existingTukangPotongNama;
  const previewCard = { ...card, tukangPotongNama: selectedNama };

  async function handleChangeTukangPotong(id) {
    setTukangPotongId(id);
    if (!id || id === existingTukangPotongId || !card?.batch_id) return;
    const nama = tukangPotongList.find((k) => k.id === id)?.nama ?? "";
    try {
      await setTukangPotong({ batchId: card.batch_id, tukangPotongId: id, tukangPotongNama: nama });
    } catch (err) {
      toast.error("Gagal simpan tukang potong: " + err.message);
    }
  }

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #kartu-jahit-overlay { display: block !important; }
          #kartu-jahit-overlay > * { display: block !important; }
          #kartu-jahit-actions, #kartu-jahit-header, #kartu-jahit-hint, #kartu-jahit-potong-picker { display: none !important; }
          #kartu-jahit-preview-outer { display: block !important; }
          #kartu-jahit-preview { transform: none !important; }
          #kartu-jahit-wrapper {
            height: auto !important;
            max-height: none !important;
            position: static !important;
            border: none !important;
            box-shadow: none !important;
            width: ${CARD_W_MM}mm !important;
          }
          @page {
            size: ${CARD_W_MM}mm ${CARD_H_MM}mm;
            margin: 0;
          }
        }
      `}</style>

      <div
        id="kartu-jahit-overlay"
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div className="absolute inset-0" onClick={onClose} />
        <div
          id="kartu-jahit-wrapper"
          className="relative bg-skin-card w-full max-w-sm h-[100dvh] md:h-auto md:max-h-[90dvh] md:border-2 border-skin-bdr shadow-2xl overflow-hidden flex flex-col"
        >
          <div id="kartu-jahit-header" className="flex-shrink-0 bg-skin-header px-4 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">Cetak Kartu Jahit</span>
              <span className="ml-2 text-xs text-skin-accent-text font-mono">{card.kode_produk}</span>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition text-xl leading-none">
              ✕
            </button>
          </div>

          {!existingTukangPotongId && (
            <div id="kartu-jahit-potong-picker" className="flex-shrink-0 px-4 pt-3 pb-1 bg-skin-raised border-b border-skin-bdr-lt">
              <label className="block text-[10px] font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1">
                Tukang Potong belum di-set — pilih dulu
              </label>
              {tukangPotongList.length === 0 ? (
                <p className="text-xs text-skin-text3 pb-2">
                  Belum ada karyawan tim Potong aktif. Tambahkan dulu di Finance &rarr; Karyawan.
                </p>
              ) : (
                <select
                  value={tukangPotongId}
                  onChange={(e) => handleChangeTukangPotong(e.target.value)}
                  disabled={setting}
                  className="w-full mb-2 px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-skin-accent transition"
                >
                  <option value="">— Pilih tukang potong —</option>
                  {tukangPotongList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div
            ref={outerRef}
            id="kartu-jahit-preview-outer"
            className="overflow-y-auto overflow-x-hidden flex-1 bg-skin-raised flex justify-center py-8"
          >
            <div style={{ width: NATURAL_W_PX, height: NATURAL_H_PX * scale }}>
              <div
                id="kartu-jahit-preview"
                style={{ width: NATURAL_W_PX, transform: `scale(${scale})`, transformOrigin: "top center" }}
              >
                <KartuJahitContent card={previewCard} qrDataUrl={qr} />
              </div>
            </div>
          </div>

          <p id="kartu-jahit-hint" className="flex-shrink-0 text-center text-[11px] text-skin-text3 px-4 py-2">
            Nama penjahit sengaja dikosongkan — isi tangan saat kartu diserahkan. Printer: Epson L1250, kertas
            custom {CARD_W_MM}×{CARD_H_MM} mm, skala 100% (bukan &ldquo;Fit to page&rdquo;).
          </p>

          <div id="kartu-jahit-actions" className="flex-shrink-0 border-t-2 border-skin-bdr flex">
            <button
              onClick={onClose}
              className="py-4 px-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text3 hover:text-skin-text transition border-r border-skin-bdr"
            >
              Tutup
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-skin-accent-text hover:bg-skin-accent/10 transition"
            >
              Print Kartu
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
