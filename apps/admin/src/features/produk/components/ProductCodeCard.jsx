/**
 * ProductCodeCard.jsx
 * Kartu foto produk + overlay kode (besar) & ukuran (kecil di bawahnya) —
 * di-capture ke PNG oleh ProductCodeImageModal.jsx & BulkSaveImageModal.jsx
 * (permintaan Denny 2026-08 "tambahin 1 button disamping edit produk,
 * yaitu save image ... foto utama ditambahkan info kode produknya, kode
 * produknya besar dan tambahkan juga ukurannya" — meniru gaya referensi
 * foto produk yang sudah ada: gradient gelap di bawah foto + teks kode
 * serif putih berspasi, kode "D-091-SWI" ditulis "D 091 SWI").
 *
 * Ukuran kanvas dibuat pas rasio kertas A4 potret ("size imagenya itu A4
 * ya" — Denny 2026-08), 794×1123px @ 96dpi. Dengan pixelRatio:3 di
 * toPng() (lihat ProductCodeImageModal.jsx & BulkSaveImageModal.jsx),
 * hasil unduhan jadi ±2382×3369px — cukup tajam utk dicetak A4.
 *
 * Props:
 * - product : objek produk ({ kode, image })
 * - size    : string | null — ukuran terpilih, ditulis lebih kecil di
 *             bawah kode (null = tidak ada baris ukuran sama sekali)
 */
import { forwardRef } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";

export const CARD_WIDTH = 794;
export const CARD_HEIGHT = 1123;

const ProductCodeCard = forwardRef(function ProductCodeCard({ product: p, size }, ref) {
  const imgSrc = p.image ? cldUrl(p.image, { width: 1080 }) : null;
  const kodeSpaced = (p.kode ?? "").replace(/-/g, " ");

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        overflow: "hidden",
        background: "#1a1208",
      }}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt={p.kode}
          crossOrigin="anonymous"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            display: "block",
          }}
        />
      )}

      {/* Overlay gradient bawah + teks kode/ukuran */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "109px 40px 65px",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 67,
            fontWeight: 600,
            letterSpacing: "0.12em",
            lineHeight: 1.15,
            color: "#ffffff",
          }}
        >
          {kodeSpaced}
        </p>
        {size && (
          <p
            style={{
              margin: "20px 0 0",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 32,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#CAB170",
            }}
          >
            {size}
          </p>
        )}
      </div>
    </div>
  );
});

export default ProductCodeCard;
