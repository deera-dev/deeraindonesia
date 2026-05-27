/**
 * StrukContent.jsx — Konten visual struk (untuk print, PNG, share).
 *
 * Berisi: LogoStruk, Divider, MetaRow, StrukContent
 * Di-render di dalam contentRef agar bisa di-capture oleh html-to-image.
 */
import { formatHarga } from "@deera/shared/lib/constants";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";

function effectiveQty(item) {
  return item.warna ? item.warna.reduce((s, w) => s + w.qty, 0) : (item.qty ?? 0);
}

function LogoStruk() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
      <img src="/logo.png" alt="" style={{ maxWidth: 36, height: 36, objectFit: "contain" }} />
      <img
        src="/logo-deera.png"
        alt="DEERA"
        style={{ maxWidth: 130, height: 32, objectFit: "contain" }}
      />
    </div>
  );
}

function Divider({ dashed = false }) {
  return (
    <div style={{ borderTop: dashed ? "1px dashed #000" : "2px solid #000", margin: "8px 0" }} />
  );
}

function MetaRow({ label, value, bold = false }) {
  return (
    <div style={{ display: "flex", gap: 4, fontSize: 11, marginBottom: 3, lineHeight: 1.4 }}>
      <span style={{ width: 52, flexShrink: 0, color: "#555" }}>{label}</span>
      <span style={{ color: "#555" }}>:</span>
      <span style={{ fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StrukContent({ sale }) {
  const isRetur = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";
  const discount = sale.discount ?? 0;
  const subtotal = (sale.items ?? []).reduce((s, item) => s + effectiveQty(item) * item.harga, 0);

  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.5,
        color: "#000",
        background: "#fff",
        padding: "14px 14px 18px",
        width: "100%",
      }}
    >
      {/* ── Header toko ── */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <p
          style={{
            fontSize: 9,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {isRetur ? "STRUK RETUR" : "STRUK PEMBELIAN"}
        </p>
        <LogoStruk />
      </div>

      <Divider />

      {/* ── Info transaksi ── */}
      <div style={{ marginBottom: 8 }}>
        <MetaRow label="TANGGAL" value={formatDateTime(sale.created_at)} />
        <div style={{ borderLeft: "3px solid #000", paddingLeft: 7, margin: "6px 0 5px" }}>
          <p
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#555",
              marginBottom: 2,
            }}
          >
            Pembeli
          </p>
          <p style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.3 }}>
            {sale.buyer_name?.toUpperCase() || "—"}
          </p>
          {sale.buyer_hp && (
            <p style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{sale.buyer_hp}</p>
          )}
        </div>
        <MetaRow label="STAFF" value={sale.created_by_name?.toUpperCase() || "—"} />
        <MetaRow label="LOKASI" value={locLabel} />
      </div>

      <Divider dashed />

      {/* ── Items ── */}
      <div style={{ margin: "8px 0" }}>
        {(sale.items ?? []).map((item, idx) => {
          const qty = effectiveQty(item);
          return (
            <div key={idx} style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>
                {item.kode?.toUpperCase()} — {item.size?.toUpperCase()}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  paddingLeft: 6,
                }}
              >
                <span>
                  {qty} pcs × Rp {formatHarga(item.harga)}
                </span>
                <span style={{ fontWeight: 600 }}>Rp {formatHarga(qty * item.harga)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Divider dashed />

      {/* ── Subtotal + Diskon ── */}
      {discount > 0 && (
        <div style={{ margin: "8px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              marginBottom: 3,
            }}
          >
            <span>Subtotal</span>
            <span>Rp {formatHarga(subtotal)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              marginBottom: 3,
            }}
          >
            <span>Diskon</span>
            <span>- Rp {formatHarga(discount)}</span>
          </div>
          <Divider />
        </div>
      )}

      {/* ── Total ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 900,
          fontSize: 16,
          margin: "6px 0 10px",
        }}
      >
        <span>{isRetur ? "TOTAL RETUR" : "TOTAL"}</span>
        <span>Rp {formatHarga(sale.total)}</span>
      </div>

      <Divider />

      {/* ── Rekening ── */}
      <div
        className="flex items-center justify-between"
        style={{ margin: "10px 0 8px", fontSize: 10 }}
      >
        {STORE_INFO.rekening.map((r, i) => (
          <div key={i} style={{ marginBottom: 7 }}>
            <p style={{ color: "#444" }}>Transfer {r.bank}:</p>
            <p style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.04em" }}>{r.no}</p>
            <p style={{ color: "#444" }}>a.n. {r.atas_nama}</p>
          </div>
        ))}
      </div>

      <Divider dashed />

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", fontSize: 10, marginTop: 8, color: "#333" }}>
        <p>WA: {STORE_INFO.wa}</p>
        <p style={{ marginTop: 2 }}>{STORE_INFO.website}</p>
        <p style={{ marginTop: 8, fontWeight: 700, letterSpacing: "0.05em" }}>
          {isRetur ? "Terima kasih atas retur Anda" : "Terima kasih telah berbelanja!"}
        </p>
      </div>
    </div>
  );
}
