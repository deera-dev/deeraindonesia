import { cldUrl } from "@deera/shared/lib/cloudinary";
import { forwardRef } from "react";

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
