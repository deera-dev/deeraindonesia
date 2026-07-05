/**
 * ProductShareCard.jsx
 * Kartu yang di-capture ke PNG saat share produk.
 * Menampilkan gambar produk + info lengkap (kode, nama, bahan, ukuran+LD/PB+harga, warna, URL).
 */
import { forwardRef } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { formatHarga } from "@deera/shared/lib/constants";

const BASE_URL = "https://deera.id";

const ProductShareCard = forwardRef(function ProductShareCard({ product: p }, ref) {
  const imgSrc = p.image ? cldUrl(p.image, { width: 600 }) : null;
  const variants = (p.variants ?? []).filter((v) => v.harga > 0);

  return (
    <div
      ref={ref}
      style={{ width: 320, fontFamily: "serif", background: "#0f0b07", color: "#e8e0d0" }}
    >
      {/* Header brand */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #3a2e1e" }}>
        <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.3em", color: "#7a6a50", textTransform: "uppercase" }}>
          DEERA INDONESIA
        </p>
      </div>

      {/* Foto produk */}
      {imgSrc && (
        <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", background: "#1a1208" }}>
          <img
            src={imgSrc}
            alt={p.kode}
            crossOrigin="anonymous"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
          />
        </div>
      )}

      {/* Info produk */}
      <div style={{ padding: "16px 20px 20px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 22, color: "#CAB170", lineHeight: 1 }}>{p.kode}</p>
        <p style={{ margin: "0 0 6px", fontSize: 14, color: "#c0b090", lineHeight: 1.3 }}>{p.nama}</p>
        {p.bahan && (
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "#6a5e48", letterSpacing: "0.06em" }}>{p.bahan}</p>
        )}

        {/* Ukuran + LD/PB + Harga */}
        {variants.length > 0 && (
          <div style={{ borderTop: "1px solid #3a2e1e", paddingTop: 10 }}>
            <p style={{ margin: "0 0 6px", fontSize: 9, color: "#5a4e38", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Ukuran &amp; Harga
            </p>
            {variants.map((v, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, color: "#a09070", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {v.size}
                  </span>
                  <span style={{ fontSize: 13, color: "#CAB170", fontWeight: "bold" }}>
                    Rp {formatHarga(v.harga)}
                  </span>
                </div>
                {(v.ld || v.pb) && (
                  <p style={{ margin: "1px 0 0", fontSize: 10, color: "#5a4e38" }}>
                    LD {v.ld ?? "-"} | PB {v.pb ?? "-"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Warna */}
        {p.warna?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <p style={{ margin: "0 0 4px", fontSize: 9, color: "#5a4e38", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              {p.warna.length} Warna
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {p.warna.map((w, i) => (
                <span key={i} style={{ fontSize: 10, color: "#a09070", border: "1px solid #3a2e1e", padding: "2px 6px" }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Catalog URL */}
        <div style={{ marginTop: 12, borderTop: "1px solid #3a2e1e", paddingTop: 10 }}>
          <p style={{ margin: "0 0 2px", fontSize: 9, color: "#5a4e38", letterSpacing: "0.2em", textTransform: "uppercase" }}>Foto &amp; Detail</p>
          <p style={{ margin: 0, fontSize: 11, color: "#7a6a50" }}>{BASE_URL}/code/{p.kode}</p>
        </div>
      </div>
    </div>
  );
});

export default ProductShareCard;
