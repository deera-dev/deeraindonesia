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
 *
 * REVISI (Agustus→Oktober 2026 — Denny: "ketika produk dipilih, tidak
 * perlu ada informasi [blok teks kode/ukuran/harga/bahan/link] ... cukup
 * insert imagenya aja dengan editan kode, jadi formatnya persis seperti
 * fitur unduh gambar produk"): kalau campaign ini melampirkan produk
 * (campaign.product_kodes), produk TIDAK lagi direpresentasikan sbg blok
 * teks di pesan — malah di-attach LANGSUNG sbg foto PNG kode-besar (format
 * identik ProductCodeCard, dipakai jg oleh fitur "Unduh Gambar" di
 * features/produk) lewat Web Share API (navigator.share({files, text})),
 * sama seperti shareProductViaWA di features/produk/utils.js. wa.me TIDAK
 * BISA melampirkan file sama sekali (keterbatasan WhatsApp) — jadi kalau
 * Web Share API/file share tidak didukung/gagal, fallback TETAP wa.me teks
 * saja (tanpa foto), bukan error ke admin.
 *
 * Foto di-generate SEKALI saat modal dibuka (bukan per klik Kirim) —
 * produk yg dilampirkan sama utk SEMUA target di campaign ini, jadi cukup
 * di-capture sekali lalu dipakai ulang tiap target diklik "Kirim".
 *
 * REVISI (Oktober 2026 — Denny: "buat template juga untuk mempertanyakan
 * apakah nomor ini benar nomor toko A, nah toko A itu diambil dari nama
 * customernya"): pesan campaign bisa mengandung placeholder `{{nama}}`
 * (lihat applyTemplatePlaceholders di ../utils) — diganti dgn nama target
 * MASING-MASING saat compose pesan final per target, bukan saat campaign
 * dibuat (satu campaign.message mentah dipakai utk semua target).
 */
import { useEffect, useRef, useState } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import { useMarkTargetMutation } from "../hooks";
import { buildWaLink, calcProgress, applyTemplatePlaceholders } from "../utils";
import ProductCodeCard from "../../produk/components/ProductCodeCard";

const STATUS_LABEL = { pending: "Menunggu", terkirim: "Terkirim", dilewati: "Dilewati" };
const STATUS_COLOR = {
  pending: "text-skin-text3",
  terkirim: "text-[#25D366]",
  dilewati: "text-skin-text4",
};

function firstUkuranBerharga(product) {
  const variants = (product.variants ?? []).filter((v) => v.harga > 0);
  return variants[0]?.size ?? null;
}

function waitForCardImages(el) {
  const imgs = el ? el.querySelectorAll("img") : [];
  return Promise.all(
    Array.from(imgs).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }),
  );
}

export default function BlastCampaignDetail({ campaign, targets, onClose }) {
  const markMutation = useMarkTargetMutation(campaign.id);
  const progress = calcProgress(targets);

  const { products = [] } = useProducts();
  const blastProducts = (campaign.product_kodes ?? [])
    .map((kode) => products.find((p) => p.kode === kode))
    .filter(Boolean);

  // null = belum siap/masih diproses, [] = campaign ini tidak melampirkan
  // produk sama sekali (atau produk sudah dihapus dari katalog).
  const [productFiles, setProductFiles] = useState(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;
    if (blastProducts.length === 0) {
      setProductFiles([]);
      return;
    }
    setProductFiles(null);
    (async () => {
      const { toPng } = await import("html-to-image");
      await Promise.all(cardRefs.current.map((el) => (el ? waitForCardImages(el) : null)));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const files = [];
      for (let i = 0; i < blastProducts.length; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        try {
          const dataUrl = await toPng(el, { pixelRatio: 3 });
          const blob = await (await fetch(dataUrl)).blob();
          files.push(new File([blob], `${blastProducts[i].kode}.png`, { type: "image/png" }));
        } catch {
          // satu produk gagal di-capture — lanjut produk lain, jangan
          // gagalkan semuanya (fallback teks tetap jalan kalau files kosong)
        }
      }
      if (!cancelled) setProductFiles(files);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id, blastProducts.length]);

  const preparingPhotos = blastProducts.length > 0 && productFiles === null;

  async function handleKirim(target) {
    const message = applyTemplatePlaceholders(campaign.message, target);

    if (productFiles?.length > 0 && navigator.canShare?.({ files: productFiles })) {
      try {
        await navigator.share({ files: productFiles, text: message });
        markMutation.mutate({ targetId: target.id, status: "terkirim" });
        return;
      } catch (err) {
        if (err?.name === "AbortError" || err?.name === "InvalidStateError") return;
        // share file gagal krn alasan lain — lanjut fallback teks di bawah
      }
    }

    const link = buildWaLink(target.no_hp, message);
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

        {preparingPhotos && (
          <p className="px-4 py-2 text-xs text-skin-text3 font-editorial border-b border-skin-bdr-lt flex-shrink-0">
            Menyiapkan foto produk...
          </p>
        )}
        {!preparingPhotos && productFiles?.length > 0 && (
          <p className="px-4 py-2 text-xs text-skin-text3 font-editorial border-b border-skin-bdr-lt flex-shrink-0">
            {productFiles.length} foto produk akan ikut terkirim bersama pesan.
          </p>
        )}

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
                    disabled={!t.no_hp || preparingPhotos}
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

      {/* Kartu produk tersembunyi — off-screen (bukan display:none) supaya
          <img> tetap ter-load, dipakai html-to-image capture foto kode
          besar yg di-attach lewat Web Share (lihat useEffect di atas). */}
      {blastProducts.length > 0 && (
        <div style={{ position: "fixed", top: 0, left: -9999, pointerEvents: "none" }}>
          {blastProducts.map((p, i) => (
            <ProductCodeCard
              key={p.kode}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              product={p}
              size={firstUkuranBerharga(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
