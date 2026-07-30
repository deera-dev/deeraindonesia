import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { WhatsApp } from "../../../shared/components/WhatsApp";
import { useProduct, useProducts } from "@deera/shared/features/products/hooks";
import { cldUrl, cldVideoPoster } from "@deera/shared/lib/cloudinary";
import { shareProductViaWA, getAdjacentKodes } from "../utils";
import PhotoLightbox from "./PhotoLightbox";
// Status ketersediaan (SOLD OUT / STOK TERBATAS) dipakai bersama katalog &
// halaman detail — import hooks.js (public surface) fitur lain, konsisten
// dengan Dependency Inversion di CLAUDE.md §4/§7.
import {
  useSoldOutSet,
  useLimitedStokSet,
  useBaruSet,
  useTerlarisMap,
} from "../../product-catalog/hooks";
import { TERLARIS_LABELS } from "../../product-catalog/utils";
import { useFavorites } from "../../favorites/hooks";
import FavoriteButton from "../../favorites/components/FavoriteButton";

// Ikon share minimalis (3 lingkaran terhubung) — dipakai di tombol "Share
// Produk" versi ikon-saja di HP (lihat redesign putaran 2 di bawah).
// Inline di sini (bukan komponen shared baru) karena hanya dipakai 1 tempat.
function ShareIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

// ── Hero image dengan efek "blur-up": versi buram resolusi rendah tampil
//    dulu (langsung ada, tanpa jeda kosong), lalu di-preload versi resolusi
//    penuh via objek Image() di background — begitu siap, src ditukar &
//    blur dihilangkan dengan transisi halus. Karena blurSrc & src berasal
//    dari sumber gambar yang SAMA (cuma beda parameter width), aspect
//    ratio-nya identik, jadi tidak ada layout shift saat ditukar. ─────────
//
// ── Redesign "no-scroll" mobile (2026-07, putaran 1) ─────────────────────
// Sebelum redesign ini, di HP foto SELALU pakai h-auto (tinggi natural
// gambar) — digabung dengan panel teks (aside) yang juga tidak dibatasi
// tinggi, total tinggi konten sering > 100dvh, jadi halaman detail produk
// scroll di HP. Instruksi Denny putaran 1: "struktur sekarang
// [dipertahankan], semua elemen dikecilkan" — BUKAN pendekatan "foto jadi
// background penuh" ala CatalogSlide.
//
// Solusi teknis: <main> dikunci ke h-dvh + overflow-hidden di HP, wrapper
// grid/flex jadi flex-col h-full, <aside> jadi shrink-0 (tinggi = konten
// aslinya), area foto jadi flex-1 min-h-0 (otomatis mengambil SISA tinggi
// layar setelah aside), dan HeroImage/video di dalamnya pakai h-full +
// object-cover supaya benar-benar mengisi sisa ruang itu. Semua override
// HANYA berlaku di bawah breakpoint lg.
//
// ── Redesign putaran 2 (2026-07) ──────────────────────────────────────────
// Setelah putaran 1, Denny minta beberapa hal DIKEMBALIKAN/diubah lagi:
// 1. LD/PB sempat dihilangkan total dari chip ukuran mobile — Denny bilang
//    itu "informasi hilang", jadi sekarang chip mobile menampilkan LD/PB
//    lagi (format ringkas 1 baris, bukan lagi baris terpisah spt desktop).
// 2. Strip thumbnail sempat disembunyikan di HP untuk hemat ruang — Denny
//    minta itu TETAP TAMPIL di HP juga. Untuk mengimbangi ruang vertikal
//    yang terpakai, ukuran thumbnail-nya sedikit dikecilkan khusus di HP
//    (w-12 h-16, desktop tetap w-16 h-20 seperti semula) dan padding strip
//    dipangkas di HP.
// 3. Foto Seri Warna (field baru) sekarang ikut masuk ke array `media`
//    (jadi otomatis muncul di strip & lightbox juga), plus dapat section
//    "Seri Warna" tersendiri yang lebih jelas di sidebar — KHUSUS desktop
//    (lg+), karena di HP tidak ada lagi ruang tersisa untuk section baru
//    tanpa mengorbankan salah satu poin di atas.
// 4. Untuk mengimbangi tambahan tinggi dari poin 1 & 2, tombol "Tanya via
//    WhatsApp" & "Share Produk" di HP diubah jadi ikon-saja (kotak kecil
//    44×44px, tanpa label teks) alih-alih tombol lebar bertulisan — teks
//    label tetap muncul di desktop (lg+, tidak berubah dari semula).
function HeroImage({ src, blurSrc, alt, priority, onClick }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    if (!src || typeof window === "undefined") return;
    const img = new window.Image();
    img.onload = () => setReady(true);
    /* v8 ignore next @preserve -- fallback defensif kalau Image gagal load
       (mis. network error); tanpa ini foto akan macet di versi blur
       selamanya. Jarang terjadi & sulit dipicu deterministik di test. */
    img.onerror = () => setReady(true);
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return (
    <img
      src={ready ? src : blurSrc}
      alt={alt}
      loading="eager"
      fetchpriority={priority ? "high" : "auto"}
      decoding="async"
      onClick={onClick}
      className={
        "w-full h-full object-cover block cursor-zoom-in transition-[filter] duration-500 ease-out lg:h-auto " +
        (ready ? "blur-0" : "blur-md scale-[1.02]")
      }
    />
  );
}

export default function ProductDetail() {
  const { kode } = useParams();
  const { product, loading, error } = useProduct(kode);
  const { products } = useProducts();
  const soldOutSet = useSoldOutSet();
  const limitedStokSet = useLimitedStokSet();
  const baruSet = useBaruSet();
  const terlarisMap = useTerlarisMap();
  const { favoriteKodes, toggle: toggleFavorite } = useFavorites();
  const [sharing, setSharing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset galeri (hero aktif & lightbox) tiap kali pindah produk (kode
  // berubah) — komponen ini TIDAK remount saat navigasi Sebelumnya/
  // Selanjutnya (masih route yang sama, cuma param :kode berubah), jadi
  // tanpa reset ini activeIndex/lightboxIndex lama bisa nyasar menunjuk ke
  // slide yang salah di produk baru.
  useEffect(() => {
    setActiveIndex(0);
    setLightboxIndex(null);
  }, [kode]);

  if (loading)
    return (
      <main className="flex items-center justify-center w-full min-h-screen bg-black">
        <p className="font-editorial text-white/40 text-base tracking-[0.3em]">LOADING...</p>
      </main>
    );

  if (error)
    return (
      <main className="flex flex-col items-center justify-center w-full min-h-screen bg-black px-7 text-center">
        <p className="font-editorial text-white/60 text-lg tracking-[0.2em]">GAGAL MEMUAT PRODUK</p>
        <p className="mt-3 font-editorial text-white/30 text-base">{error.message}</p>
      </main>
    );

  if (!product) return <Navigate to="/catalog" replace />;

  // Sumber foto MENTAH (belum di-transform Cloudinary) — dipakai untuk
  // generate DUA versi per foto (full-res utk hero, low-res utk blur-up)
  // dari asal yang sama, supaya aspect ratio identik (lihat HeroImage).
  // Urutan: foto utama → foto seri warna (kalau ada) → foto detail →
  // video. Seri warna diselipkan di posisi KEDUA (bukan pertama) supaya
  // foto utama tetap jadi hero default saat halaman pertama dibuka
  // (activeIndex awal = 0) — redesign putaran 2, instruksi Denny "seri
  // foto juga harus ada di strip gallerynya juga".
  const rawPhotoSources = [product.image, product.seri_warna, ...(product.detail ?? [])].filter(
    Boolean,
  );
  const photoCount = rawPhotoSources.length;
  const ambientBlurSrc = cldUrl(product.image, { width: 300 });
  // Index foto seri warna di dalam `media` (sama dgn index-nya di
  // rawPhotoSources, karena bagian image di `media` dibangun 1:1 berurutan
  // dari rawPhotoSources) — dipakai tombol "Seri Warna" di sidebar desktop
  // supaya tap langsung menuju foto yang benar di hero/lightbox.
  const seriWarnaMediaIndex = product.seri_warna
    ? rawPhotoSources.indexOf(product.seri_warna)
    : -1;

  // Foto & video digabung jadi SATU urutan navigasi (thumbnail strip +
  // lightbox) — video selalu di slide terakhir, konsisten dengan urutan
  // lama (foto utama → seri warna → detail → video).
  const media = [
    ...rawPhotoSources.map((raw, i) => ({
      type: "image",
      src: cldUrl(raw, { width: 1400 }),
      blurSrc: cldUrl(raw, { width: 48 }),
      alt: i === 0 ? product.nama : `${product.nama} ${i + 1}`,
    })),
    ...(product.video
      ? [
          {
            type: "video",
            src: product.video,
            poster: cldVideoPoster(product.video, { width: 900 }),
          },
        ]
      : []),
  ];
  const activeMedia = media[activeIndex] ?? media[0];

  const variants = product.variants ?? [];
  const waText = `Assalamu'alaikum, saya tertarik dengan produk ${product.kode} - ${product.nama}`;
  const waUrl = `https://wa.me/62811947254?text=${encodeURIComponent(waText)}`;
  const { prevKode, nextKode } = getAdjacentKodes(products, kode);
  const isSoldOut = soldOutSet.has(product.kode);
  const isLimitedStok = !isSoldOut && limitedStokSet.has(product.kode);
  const isBaru = baruSet.has(product.kode);
  const terlarisPeriode = terlarisMap.get(product.kode) ?? null;
  const terlarisLabel = terlarisPeriode ? TERLARIS_LABELS[terlarisPeriode] : null;

  function navigateLightbox(delta) {
    setLightboxIndex((i) => {
      if (i === null) return i;
      const next = i + delta;
      if (next < 0 || next >= media.length) return i;
      return next;
    });
  }

  function openSeriWarna() {
    if (seriWarnaMediaIndex < 0) return;
    setActiveIndex(seriWarnaMediaIndex);
    setLightboxIndex(seriWarnaMediaIndex);
  }

  // Dipakai DUA tempat: tombol ikon mobile (di header, dekat favorit) &
  // tombol lebar teks desktop (di bawah sidebar) — redesign putaran 3,
  // diekstrak jadi satu fungsi supaya logika share tidak diduplikasi.
  async function handleShare() {
    setSharing(true);
    try {
      await shareProductViaWA(product);
    } finally {
      setSharing(false);
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-black text-white lg:h-auto lg:overflow-visible lg:min-h-screen">
      {/* Split dua-kolom (sidebar + foto) HANYA di layar lebar (>=1024px).
          Tablet (termasuk iPad portrait 768-1024px) tetap satu kolom
          tersusun ke bawah — sidebar 400px fixed akan terasa dominan &
          menyempitkan kolom foto di lebar segitu.
          Di HP: flex-col h-full (dikunci ke tinggi <main>, lihat komentar
          redesign "no-scroll" di atas HeroImage) — aside shrink-to-fit,
          kolom foto ambil SISA tinggi via flex-1. */}
      <div className="flex flex-col h-full lg:h-auto lg:grid lg:grid-cols-[380px_1fr] xl:grid-cols-[440px_1fr] lg:min-h-screen">
        <aside className="shrink-0 flex flex-col px-5 py-4 sm:px-8 sm:py-6 lg:shrink lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-12 lg:py-16 xl:px-16 border-b border-white/5 lg:border-b-0 lg:border-r lg:border-white/5">
          <Link
            to="/catalog"
            className="mb-3 lg:mb-10 self-start font-editorial text-xs lg:text-sm tracking-[0.3em] text-white/30 uppercase hover:text-white/60 transition py-1 lg:py-2"
          >
            ← Katalog
          </Link>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-headline text-[#cab170] text-3xl lg:text-5xl leading-none">{product.kode}</p>
              <p className="mt-2 lg:mt-4 font-script text-white/65 text-xl lg:text-3xl leading-tight">{product.nama}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* WA & Share — HANYA mobile (lg:hidden), ikon-saja, digeser
                  ke sini bersebelahan dengan tombol favorit (redesign
                  putaran 3, instruksi Denny: "geser aja disamping button
                  favorite") — sebelumnya di bagian bawah sidebar dekat
                  navigasi sebelumnya/selanjutnya. Desktop TIDAK berubah:
                  tetap tombol lebar penuh + label teks di bawah sidebar
                  (lihat blok "hidden lg:flex lg:flex-col" di bawah). */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tanya via WhatsApp"
                title="Tanya via WhatsApp"
                className="lg:hidden flex items-center justify-center w-9 h-9 border border-white/20 text-white/60 hover:border-[#cab170]/60 transition"
              >
                <WhatsApp className="w-4 h-4 text-green-400" />
              </a>
              <button
                type="button"
                disabled={sharing}
                onClick={handleShare}
                aria-label={sharing ? "Membagikan produk" : "Share Produk"}
                title="Share Produk"
                className="lg:hidden flex items-center justify-center w-9 h-9 border border-white/20 text-white/40 hover:border-[#cab170]/60 transition disabled:opacity-40"
              >
                {sharing ? (
                  <span
                    aria-hidden="true"
                    className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin"
                  />
                ) : (
                  <ShareIcon className="w-4 h-4" />
                )}
              </button>
              <FavoriteButton
                size="lg"
                active={favoriteKodes.has(product.kode)}
                onToggle={() => toggleFavorite(product.kode)}
                className="flex-shrink-0 border border-white/15"
              />
            </div>
          </div>

          {(terlarisLabel || isBaru || isSoldOut || isLimitedStok) && (
            <div className="flex flex-wrap gap-2 mt-2 lg:mt-4">
              {terlarisLabel && (
                <span className="animate-chip-in px-3 py-1 font-editorial text-xs tracking-[0.2em] text-white bg-gradient-to-r from-[#c2410c] to-[#ea580c] uppercase shadow-[0_0_10px_rgba(234,88,12,0.35)]">
                  &#128293; {terlarisLabel}
                </span>
              )}
              {isBaru && (
                <span className="animate-chip-in px-3 py-1 font-editorial text-xs tracking-[0.2em] text-black bg-[#cab170] uppercase">
                  Baru
                </span>
              )}
              {isSoldOut && (
                <span className="animate-chip-in px-3 py-1 font-editorial text-xs tracking-[0.2em] text-red-500/85 border border-red-500/40 uppercase">
                  Sold Out
                </span>
              )}
              {isLimitedStok && (
                <span className="animate-chip-in px-3 py-1 font-editorial text-xs tracking-[0.2em] text-red-400 border border-red-500/50 uppercase">
                  Stok Terbatas
                </span>
              )}
            </div>
          )}

          <div className="w-10 h-px mt-3 mb-3 lg:mt-6 lg:mb-6 bg-[#cab170]/25" />

          {product.bahan && (
            <p className="font-editorial text-white/35 text-sm lg:text-base tracking-[0.1em] mb-2 lg:mb-7">
              {product.bahan}
            </p>
          )}

          {variants.length > 0 && (
            <>
              {/* Mobile (< lg): chip ukuran ringkas TAPI tetap menyertakan
                  LD/PB (1 baris per chip, format ringkas) — putaran 1
                  sempat menghilangkan LD/PB sama sekali, Denny minta
                  dikembalikan ("banyak informasi yang hilang"). Desktop
                  TIDAK berubah, tetap daftar lengkap (blok kedua di
                  bawah). */}
              <div className="mb-3 lg:hidden">
                <p className="font-editorial text-[10px] tracking-[0.3em] text-white/35 uppercase mb-2">
                  Ukuran
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <span
                      key={v.size}
                      className="px-2.5 py-1.5 font-editorial text-[11px] text-white/80 border border-white/25 uppercase leading-tight whitespace-nowrap"
                    >
                      {v.size}
                      <span className="text-white/40 normal-case ml-1">
                        · LD{v.ld} PB{v.pb}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="hidden lg:block mb-8">
                <p className="font-editorial text-sm tracking-[0.3em] text-white/35 uppercase mb-4">
                  Ukuran
                </p>
                <div className="flex flex-col divide-y divide-white/5">
                  {variants.map((v) => (
                    <div key={v.size} className="flex items-center justify-between py-3.5">
                      <span className="font-editorial text-lg text-white/80">{v.size}</span>
                      <div className="flex gap-5">
                        <span className="font-editorial text-base text-white/50">
                          <span className="text-white/25 text-xs tracking-[0.1em] mr-1.5">LD</span>
                          {v.ld} cm
                        </span>
                        <span className="font-editorial text-base text-white/50">
                          <span className="text-white/25 text-xs tracking-[0.1em] mr-1.5">PB</span>
                          {v.pb} cm
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Seri Warna — redesign putaran 4 (2026-07): putaran 3 sempat
              dibuat tampil juga di HP (w-full, hidden lg:block dihapus) —
              Denny minta itu DIKEMBALIKAN ke desktop-only, karena di HP
              foto ini sudah otomatis ada di strip thumbnail gallery di
              bawah (redundant, "kan udah ada di bawah strip gallery").
              Untuk desktop: putaran 3 juga sempat dibuat w-full aspect-
              [3/2] — ternyata terlalu tinggi, bikin sidebar butuh scroll
              ("kebesaran, jadinya perlu discroll"). Sekarang: TETAP
              persegi panjang (landscape aspect-[3/2], bukan potret sempit
              kayak semula), tapi lebar dikunci (w-40/48, bukan w-full)
              supaya tingginya proporsional kecil — hasil akhirnya malah
              LEBIH PENDEK dari section aslinya (sebelum redesign apa pun)
              walau lebih lebar, jadi aman tanpa scroll. */}
          {product.seri_warna && (
            <div className="hidden lg:block mb-6">
              <p className="font-editorial text-sm tracking-[0.3em] text-white/35 uppercase mb-3">
                Seri Warna
              </p>
              <button
                type="button"
                onClick={openSeriWarna}
                className="block w-40 xl:w-48 aspect-[3/2] overflow-hidden border border-white/15 hover:border-[#cab170]/60 transition"
              >
                <img
                  src={cldUrl(product.seri_warna, { width: 400 })}
                  alt={`Seri warna ${product.nama}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3">
            {/* WA & Share — sekarang DESKTOP ONLY (hidden lg:flex). Versi
                mobile (ikon-saja) sudah dipindah ke header row dekat
                tombol favorit (redesign putaran 3, lihat di atas) supaya
                lebih dekat & hemat ruang vertikal di HP. */}
            <div className="hidden lg:flex lg:flex-col lg:gap-3">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tanya via WhatsApp"
                title="Tanya via WhatsApp"
                className="flex items-center justify-center gap-3 w-full py-4 font-editorial text-base tracking-[0.2em] uppercase border border-white/20 text-white/60 hover:border-[#cab170]/60 hover:text-[#cab170] transition"
              >
                <WhatsApp className="w-5 h-5 text-green-400 shrink-0" />
                <span>Tanya via WhatsApp</span>
              </a>
              <button
                type="button"
                disabled={sharing}
                onClick={handleShare}
                aria-label={sharing ? "Membagikan produk" : "Share Produk"}
                title="Share Produk"
                className="flex items-center justify-center gap-3 w-full py-4 font-editorial text-base tracking-[0.2em] uppercase border border-white/20 text-white/40 hover:border-[#cab170]/60 hover:text-[#cab170] transition disabled:opacity-40"
              >
                <span>{sharing ? "MEMBAGIKAN..." : "SHARE PRODUK"}</span>
              </button>
            </div>

            {(prevKode || nextKode) && (
              <div className="flex items-stretch gap-3 pt-2 mt-1 lg:pt-3 border-t border-white/5">
                {prevKode ? (
                  <Link
                    to={`/code/${prevKode}`}
                    className="flex-1 py-2 lg:py-3 text-center font-editorial text-xs tracking-[0.2em] text-white/40 uppercase hover:text-[#cab170] transition"
                  >
                    ← Sebelumnya
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
                {nextKode ? (
                  <Link
                    to={`/code/${nextKode}`}
                    className="flex-1 py-2 lg:py-3 text-center font-editorial text-xs tracking-[0.2em] text-white/40 uppercase hover:text-[#cab170] transition"
                  >
                    Selanjutnya →
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
              </div>
            )}
          </div>
        </aside>

        <div className="relative flex-1 min-h-0 lg:flex-none lg:min-h-0">
          {ambientBlurSrc && (
            <div
              className="hidden lg:block fixed inset-0 z-0 pointer-events-none overflow-hidden lg:left-[380px] xl:left-[440px]"
            >
              <img
                src={ambientBlurSrc}
                alt=""
                aria-hidden
                className="w-full h-full object-cover blur-md opacity-30"
              />
              <div className="absolute inset-0 bg-black/70" />
            </div>
          )}

          {media.length > 0 ? (
            // PENTING (fix redesign putaran 2): container ini WAJIB flex-col
            // di mobile, BUKAN cuma "h-full" polos. Sebelumnya HeroImage/video
            // dikasih className h-full sebagai block sibling biasa dari strip
            // thumbnail di bawahnya — karena bukan flex, img "h-full" itu
            // ambil SELURUH tinggi container utk dirinya sendiri, mendorong
            // strip thumbnail keluar dari area yang kelihatan (ke-clip oleh
            // overflow-hidden di <main>, lihat komentar "no-scroll" di atas).
            // Makanya strip sempat tidak pernah muncul di HP walau class
            // "hidden lg:flex" sudah dihapus. Sekarang: wrapper foto/video
            // dikasih flex-1 min-h-0 (otomatis ambil SISA tinggi setelah
            // strip), strip dikasih shrink-0 (tinggi tetap, selalu muat).
            <div className="relative z-10 h-full flex flex-col lg:h-auto lg:block">
              {/* Badge Video / jumlah foto — sinyal cepat sebelum user
                  lihat/klik apa pun, konsisten dengan badge di katalog
                  utama (yang sebelumnya TIDAK terbawa ke halaman detail). */}
              {(product.video || photoCount > 1) && (
                <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 pointer-events-none">
                  {product.video && (
                    <span className="px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/90 border border-white/30 bg-black/50 backdrop-blur uppercase">
                      &#9654; Video
                    </span>
                  )}
                  {photoCount > 1 && (
                    <span className="px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/90 border border-white/30 bg-black/50 backdrop-blur uppercase">
                      {photoCount} Foto
                    </span>
                  )}
                </div>
              )}

              {/* Counter posisi mengambang — selalu terlihat di hero (bukan
                  cuma di dalam lightbox), supaya user tahu ada berapa
                  banyak slide sebelum buka lightbox/geser thumbnail. */}
              {media.length > 1 && (
                <div className="absolute top-4 right-4 z-20 px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/70 bg-black/50 backdrop-blur pointer-events-none">
                  {activeIndex + 1} / {media.length}
                </div>
              )}

              <div className="relative flex-1 min-h-0 lg:flex-none lg:min-h-0">
                {activeMedia.type === "video" ? (
                  <video
                    key={activeMedia.src}
                    src={activeMedia.src}
                    poster={activeMedia.poster}
                    controls
                    autoPlay={false}
                    playsInline
                    className="w-full h-full object-cover block bg-black lg:h-auto"
                    style={{ maxHeight: "90vh" }}
                  />
                ) : (
                  <HeroImage
                    key={activeMedia.src}
                    src={activeMedia.src}
                    blurSrc={activeMedia.blurSrc}
                    alt={activeMedia.alt}
                    priority={activeIndex === 0}
                    onClick={() => setLightboxIndex(activeIndex)}
                  />
                )}
              </div>

              {/* Thumbnail strip — navigasi cepat lintas foto & video.
                  Redesign putaran 2: SEKARANG TETAP TAMPIL di HP juga
                  (putaran 1 sempat menyembunyikannya di HP demi ruang,
                  Denny minta dikembalikan) — thumbnail dikecilkan khusus
                  di HP (w-12 h-16) supaya tidak makan ruang terlalu
                  banyak; desktop tetap w-16 h-20 seperti semula. shrink-0
                  supaya strip TIDAK ikut diperas flex-1 di atas & selalu
                  punya tinggi tetap yang muat di layar (lihat komentar fix
                  di atas). */}
              {media.length > 1 && (
                <div className="shrink-0 flex gap-1.5 lg:gap-2 overflow-x-auto px-3 py-2 lg:px-4 lg:py-4 bg-black scrollbar-none">
                  {media.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      aria-label={m.type === "video" ? "Lihat video produk" : `Lihat foto ${i + 1}`}
                      aria-current={i === activeIndex}
                      className={
                        "relative flex-shrink-0 w-12 h-16 lg:w-16 lg:h-20 overflow-hidden border-2 transition " +
                        (i === activeIndex
                          ? "border-[#cab170]"
                          : "border-white/10 opacity-60 hover:opacity-100")
                      }
                    >
                      <img
                        src={m.type === "video" ? m.poster : cldUrl(m.src, { width: 150 })}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {m.type === "video" && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-white text-xs">&#9654;</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative z-10 flex items-center justify-center h-full lg:h-screen">
              <p className="font-editorial text-white/20 text-base tracking-[0.3em]">
                FOTO BELUM TERSEDIA
              </p>
            </div>
          )}
        </div>
      </div>

      <PhotoLightbox
        media={media}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={navigateLightbox}
      />
    </main>
  );
}
