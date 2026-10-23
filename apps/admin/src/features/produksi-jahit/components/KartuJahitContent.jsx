export const CARD_W_MM = 58;
export const CARD_H_MM = 98;

const GREEN = "#1B492D";

const NOTE_LINES = [
  "Pastikan model dan jumlah potongan sesuai.",
  "Mohon simpan kartu ini dengan baik.",
  "Kartu wajib disertakan saat penyetoran hasil jahit.",
];

function Field({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "1.3mm",
        borderBottom: `0.25mm solid ${GREEN}`,
        paddingBottom: "0.5mm",
        marginBottom: "1.6mm",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "2.6mm", color: GREEN, whiteSpace: "nowrap" }}>{label}</span>
      <span
        style={{
          fontSize: "2.5mm",
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
        <div style={{ textAlign: "center", marginBottom: "1.3mm" }}>
          <img src="/kartu-jahit-logo-text.svg" alt="DEERA" style={{ height: "6.5mm" }} />
          <div style={{ fontSize: "1.5mm", letterSpacing: "0.5mm", color: GREEN, marginTop: "0.4mm" }}>
            PRODUCTION
          </div>
        </div>
        <div style={{ borderTop: `0.6mm solid ${GREEN}`, marginBottom: "2mm" }} />

        <Field label="Penjahit :" value="" />
        <Field label="Kode :" value={card.kode_produk ?? ""} />
        <Field label="T.Potong :" value={tukangPotong} />
        <Field label="Ukuran :" value={card.size ?? ""} />
        <Field label="Warna :" value={card.warna && card.warna !== "_" ? card.warna : "-"} />
        <Field label="Jumlah :" value={card.qty ? `${card.qty} pcs` : ""} />
        <Field label="Info Tambahan :" value="" />

        <div style={{ marginTop: "0.3mm" }}>
          <div style={{ fontWeight: 700, fontSize: "2.2mm", color: GREEN, marginBottom: "0.7mm" }}>Note</div>
          <div style={{ fontSize: "1.7mm", lineHeight: 1.4, color: "#333" }}>
            {NOTE_LINES.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {qrDataUrl && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "2mm" }}>
            <img src={qrDataUrl} alt={`Barcode kartu ${card.id}`} style={{ width: "26mm", height: "26mm" }} />
          </div>
        )}
      </div>
    </div>
  );
}
