import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";
import { effectiveQty, formatStrukDateTime } from "../lib/salesUtils";

function LogoStruk() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <img src="/logo.png" alt="" style={{ maxWidth: 54, height: 54, objectFit: "contain" }} />
      <img
        src="/logo-deera.png"
        alt="DEERA"
        style={{ maxWidth: 200, height: 48, objectFit: "contain" }}
      />
    </div>
  );
}

function Divider({ dashed = false }) {
  return (
    <div style={{ borderTop: dashed ? "1px dashed #000" : "2px solid #000", margin: "8px 0" }} />
  );
}

function MetaRow({ label, value, bold = false, valueFontSize }) {
  return (
    <div style={{ display: "flex", gap: 4, fontSize: 15, marginBottom: 4, lineHeight: 1.4 }}>
      <span style={{ width: 68, flexShrink: 0, color: "#555" }}>{label}</span>
      <span style={{ color: "#555" }}>:</span>
      <span style={{ fontWeight: bold ? 700 : 400, fontSize: valueFontSize }}>{value}</span>
    </div>
  );
}

export default function StrukContent({ sale }) {
  const isRetur = sale.type === "retur";
  const isTukarTambah = sale.type === "tukar_tambah";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";
  const discount = sale.discount ?? 0;
  const subtotal = (sale.items ?? []).reduce((s, item) => s + effectiveQty(item) * item.harga, 0);
  const netTotal = sale.total ?? 0;
  const isRefundToBuyer = isTukarTambah && netTotal < 0;

  const items = sale.items ?? [];
  const pcsBeli = isTukarTambah
    ? items.filter((item) => !item.isRetur).reduce((s, item) => s + effectiveQty(item), 0)
    : isRetur
      ? 0
      : items.reduce((s, item) => s + effectiveQty(item), 0);
  const pcsRetur = isTukarTambah
    ? items.filter((item) => item.isRetur).reduce((s, item) => s + effectiveQty(item), 0)
    : isRetur
      ? items.reduce((s, item) => s + effectiveQty(item), 0)
      : 0;

  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: 16,
        lineHeight: 1.5,
        color: "#000",
        background: "#fff",
        padding: "18px 16px 22px",
        width: "100%",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <p
          style={{
            fontSize: 13,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {isRetur ? "STRUK RETUR" : "STRUK PEMBELIAN"}
        </p>
        <LogoStruk />
      </div>

      <Divider />

      <div style={{ marginBottom: 8 }}>
        <MetaRow label="TANGGAL" value={formatStrukDateTime(sale.created_at)} valueFontSize={13} />
        <div style={{ borderLeft: "3px solid #000", paddingLeft: 7, margin: "6px 0 5px" }}>
          <p
            style={{
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#555",
              marginBottom: 3,
            }}
          >
            Yth.
          </p>
          <p style={{ fontWeight: 800, fontSize: 24, lineHeight: 1.25 }}>
            {sale.buyer_name?.toUpperCase() || "—"}
          </p>
          {sale.buyer_hp && (
            <p style={{ fontSize: 14, color: "#555", marginTop: 2 }}>{sale.buyer_hp}</p>
          )}
        </div>
        <MetaRow label="STAFF" value={sale.created_by_name?.toUpperCase() || "—"} />
        <MetaRow label="LOKASI" value={locLabel} />
      </div>

      <Divider dashed />

      <div style={{ margin: "8px 0" }}>
        {(sale.items ?? []).map((item, idx) => {
          const qty = effectiveQty(item);
          return (
            <div key={idx} style={{ marginBottom: 10 }}>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 20,
                  marginBottom: 4,
                  color: item.isRetur ? "#EA580C" : undefined,
                }}
              >
                {idx + 1}. {item.kode?.toUpperCase()} — {item.size?.toUpperCase()}
                {item.isRetur ? " (RETUR)" : ""}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                  fontSize: 17,
                  paddingLeft: 8,
                }}
              >
                <span style={{ whiteSpace: "nowrap" }}>
                  {qty} pcs × Rp {formatHarga(item.harga)}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 19,
                    whiteSpace: "nowrap",
                    color: item.isRetur ? "#EA580C" : undefined,
                  }}
                >
                  {item.isRetur ? "− " : ""}Rp {formatHarga(qty * item.harga)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 15,
          fontWeight: 700,
          border: "1px dashed #000",
          padding: "6px 8px",
          margin: "4px 0 8px",
        }}
      >
        {isTukarTambah ? (
          <>
            <span>PCS BELI: {pcsBeli}</span>
            <span style={{ color: "#EA580C" }}>PCS RETUR: {pcsRetur}</span>
          </>
        ) : (
          <span>{isRetur ? `TOTAL PCS RETUR: ${pcsRetur}` : `TOTAL PCS: ${pcsBeli}`}</span>
        )}
      </div>

      <Divider dashed />

      {isTukarTambah ? (
        <div style={{ margin: "8px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 15,
              marginBottom: 4,
            }}
          >
            <span>Subtotal</span>
            <span>Rp {formatHarga(sale.saleSubtotal ?? 0)}</span>
          </div>
          {discount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                marginBottom: 4,
              }}
            >
              <span>Diskon</span>
              <span>- Rp {formatHarga(discount)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 15,
              marginBottom: 4,
              color: "#EA580C",
            }}
          >
            <span>Retur</span>
            <span>- Rp {formatHarga(sale.returTotal ?? 0)}</span>
          </div>
        </div>
      ) : (
        discount > 0 && (
          <div style={{ margin: "8px 0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                marginBottom: 4,
              }}
            >
              <span>Subtotal</span>
              <span>Rp {formatHarga(subtotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                marginBottom: 4,
              }}
            >
              <span>Diskon</span>
              <span>- Rp {formatHarga(discount)}</span>
            </div>
          </div>
        )
      )}

      <Divider />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 900,
          fontSize: 28,
          margin: "8px 0 12px",
        }}
      >
        <span>{isRefundToBuyer ? "UANG KEMBALI" : isRetur ? "TOTAL RETUR" : "TOTAL"}</span>
        <span>Rp {formatHarga(Math.abs(netTotal))}</span>
      </div>

      <Divider />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          margin: "12px 0 10px",
          fontSize: 14,
        }}
      >
        {STORE_INFO.rekening.map((r, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              marginBottom: 7,
              paddingLeft: i > 0 ? 12 : 0,
              borderLeft: i > 0 ? "1px dashed #000" : "none",
            }}
          >
            <p style={{ color: "#444" }}>Transfer {r.bank}:</p>
            <p style={{ fontWeight: 800, fontSize: 17, letterSpacing: "0.04em" }}>{r.no}</p>
            <p style={{ color: "#444" }}>a.n. {r.atas_nama}</p>
          </div>
        ))}
      </div>

      <Divider dashed />

      <div style={{ textAlign: "center", margin: "14px 0" }}>
        <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>
          <span style={{ display: "block" }}>Lihat koleksi</span>
          <span style={{ display: "block" }}>lengkap Deera</span>
        </p>
        <img
          src="/qr-katalog.svg"
          alt="QR katalog Deera"
          style={{ width: 100, height: 100, margin: "8px auto 6px", display: "block" }}
        />
        <p style={{ fontSize: 12, color: "#555", lineHeight: 1.4 }}>
          <span style={{ display: "block" }}>Scan untuk melihat</span>
          <span style={{ display: "block" }}>katalog lengkap</span>
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>www.{STORE_INFO.website}</p>
        {STORE_INFO.instagram && (
          <p style={{ fontSize: 12, color: "#555" }}>{STORE_INFO.instagram}</p>
        )}
      </div>

      <Divider dashed />

      <div style={{ textAlign: "center", fontSize: 14, marginTop: 10, color: "#333" }}>
        <p>WA: {STORE_INFO.wa}</p>
        <p style={{ marginTop: 8, fontWeight: 700, letterSpacing: "0.05em" }}>
          {isTukarTambah
            ? "Terima kasih atas transaksi Anda!"
            : isRetur
              ? "Terima kasih atas retur Anda"
              : "Terima kasih telah berbelanja!"}
        </p>
      </div>
    </div>
  );
}
