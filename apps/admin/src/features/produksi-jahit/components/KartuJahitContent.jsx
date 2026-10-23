export const CARD_W_MM = 58;
export const CARD_H_MM = 98;

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
        gap: "1.5mm",
        borderBottom: "0.25mm solid #000",
        paddingBottom: "0.8mm",
        marginBottom: "2.4mm",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "2.9mm", whiteSpace: "nowrap" }}>{label}</span>
      <span
        style={{
          fontSize: "2.7mm",
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
  const tukangPotong = card.produksi_batch?.tukang_potong_nama || "";

  return (
    <div
      style={{
        width: `${CARD_W_MM}mm`,
        height: `${CARD_H_MM}mm`,
        background: "#fff",
        color: "#000",
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
        padding: "3.5mm",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2mm" }}>
        <div>
          <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "5mm", letterSpacing: "0.5mm" }}>
            DEERA
          </div>
          <div style={{ fontSize: "1.8mm", letterSpacing: "0.6mm" }}>PRODUCTION</div>
        </div>
        {qrDataUrl && (
          <img src={qrDataUrl} alt={`Barcode kartu ${card.id}`} style={{ width: "16mm", height: "16mm" }} />
        )}
      </div>
      <div style={{ borderTop: "0.5mm solid #000", marginBottom: "3mm" }} />

      <Field label="T.Potong :" value={tukangPotong} />
      <Field label="Model :" value={card.nama_produk ?? ""} />
      <Field label="Ukuran :" value={card.size ?? ""} />
      <Field label="Warna :" value={card.warna && card.warna !== "_" ? card.warna : "-"} />
      <Field label="Jumlah :" value={card.qty ? `${card.qty} pcs` : ""} />

      <div style={{ borderTop: "0.5mm solid #000", margin: "2mm 0 3mm" }} />

      <Field label="T.Jahit :" value="" />
      <Field label="Kode :" value={card.kode_produk ?? ""} />

      <div style={{ marginTop: "2mm" }}>
        <div style={{ fontWeight: 700, fontSize: "2.5mm", marginBottom: "1mm" }}>Note</div>
        <div style={{ fontSize: "2mm", lineHeight: 1.45 }}>
          {NOTE_LINES.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
