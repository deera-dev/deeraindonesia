import { fmtDate } from "../utils";

export const CARD_W_MM = 58;
export const CARD_H_MM = 98;

const GREEN = "#1B492D";
// Logo SVG (DEERA + PRODUCTION) viewBox 2419x848 — path flourish dekoratif
// di sisi kanan jauh (x>~1710) dipotong lewat window crop di bawah supaya
// logo tetap ringkas di kartu 58mm, tulisan "PRODUCTION" (sudah menyatu di
// file SVG-nya) tetap ikut terbawa karena full height (0-848) dipertahankan.
const LOGO_H_MM = 9;
const LOGO_CROP_W_MM = 18.3;

const NOTE_LINES = [
  "Pastikan model dan jumlah potongan sesuai.",
  "Mohon simpan kartu ini dengan baik.",
  "Kartu wajib disertakan saat penyetoran hasil jahit.",
];

function FieldRow({ children }) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: `0.25mm solid ${GREEN}`,
        paddingBottom: "0.4mm",
        marginBottom: "1.4mm",
        gap: "3mm",
      }}
    >
      {children}
    </div>
  );
}

function FieldInline({ label, value, grow = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "1.3mm",
        flex: grow ? "1 1 auto" : "0 0 auto",
        minWidth: 0,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "2.5mm", color: GREEN, whiteSpace: "nowrap" }}>{label}</span>
      <span
        style={{
          fontSize: "2.4mm",
          color: "#111",
          textTransform: "uppercase",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function KartuJahitContent({ card, qrDataUrl }) {
  const tukangPotong = card.tukangPotongNama ?? card.produksi_batch?.tukang_potong_nama ?? "";
  const tanggalProduksi = fmtDate(card.produksi_batch?.tanggal_produksi);

  return (
    <div
      style={{
        width: `${CARD_W_MM}mm`,
        height: `${CARD_H_MM}mm`,
        position: "relative",
        background: "#fff",
        color: "#111",
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
        border: `1mm solid ${GREEN}`,
        overflow: "hidden",
      }}
    >
      <img
        src="/kartu-jahit-logo-watermark.svg"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-9mm",
          right: "-11mm",
          width: "44mm",
          opacity: 0.07,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          padding: "3mm",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2mm" }}>
          <div
            role="img"
            aria-label="DEERA Production"
            style={{
              width: `${LOGO_CROP_W_MM}mm`,
              height: `${LOGO_H_MM}mm`,
              overflow: "hidden",
              backgroundImage: "url(/kartu-jahit-logo-text.svg)",
              backgroundSize: "auto 100%",
              backgroundPosition: "left top",
              backgroundRepeat: "no-repeat",
              flexShrink: 0,
            }}
          />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: "2.3mm", color: "#111", whiteSpace: "nowrap" }}>
              {tanggalProduksi}
            </div>
            <div style={{ fontSize: "1.4mm", color: GREEN, marginTop: "0.8mm", whiteSpace: "nowrap" }}>
              Dipotong oleh
            </div>
            <div style={{ fontWeight: 700, fontSize: "2.2mm", color: "#111", marginTop: "0.2mm", whiteSpace: "nowrap" }}>
              {tukangPotong || "-"}
            </div>
          </div>
        </div>
        <div style={{ borderTop: `0.6mm solid ${GREEN}`, margin: "1.8mm 0 2mm" }} />

        <FieldRow>
          <FieldInline label="Penjahit :" value="" grow />
        </FieldRow>
        <FieldRow>
          <FieldInline label="Kode :" value={card.kode_produk ?? ""} grow />
          <FieldInline label="Ukuran :" value={card.size ?? ""} />
        </FieldRow>
        <FieldRow>
          <FieldInline label="Warna :" value={card.warna && card.warna !== "_" ? card.warna : "-"} grow />
          <FieldInline label="Jumlah :" value={card.qty ? String(card.qty) : ""} />
        </FieldRow>

        <div style={{ marginBottom: "1.4mm" }}>
          <div style={{ fontWeight: 700, fontSize: "2.5mm", color: GREEN, marginBottom: "0.6mm" }}>
            Info Tambahan :
          </div>
          <div style={{ borderBottom: `0.25mm solid ${GREEN}`, height: "3mm" }} />
          <div style={{ borderBottom: `0.25mm solid ${GREEN}`, height: "3mm", marginTop: "1mm" }} />
        </div>

        <div style={{ flex: 1 }} />

        {qrDataUrl && (
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: "1.5mm" }}>
            <img src={qrDataUrl} alt={`Barcode kartu ${card.id}`} style={{ width: "24mm", height: "24mm" }} />
          </div>
        )}

        <div>
          <div style={{ fontWeight: 700, fontSize: "2.1mm", color: GREEN, marginBottom: "0.6mm" }}>Note</div>
          <div style={{ fontSize: "1.6mm", lineHeight: 1.4, color: "#333" }}>
            {NOTE_LINES.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
