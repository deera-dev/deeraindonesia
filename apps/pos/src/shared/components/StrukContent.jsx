/**
 * StrukContent.jsx — Konten visual struk (untuk print, PNG, share).
 *
 * Berisi: LogoStruk, Divider, MetaRow, StrukContent
 * Di-render di dalam contentRef agar bisa di-capture oleh html-to-image.
 */
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
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "—";
  const discount = sale.discount ?? 0;
  const subtotal = (sale.items ?? []).reduce((s, item) => s + effectiveQty(item) * item.harga, 0);

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
      {/* ── Header toko ── */}
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

      {/* ── Info transaksi ── */}
      <div style={{ marginBottom: 8 }}>
        {/* Value tanggal sengaja dikecilin (13px, dulu ikut default 15px)
            karena formatnya sekarang lebih panjang ("13 Agustus 2026, 23:42 WIB"). */}
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
          {/* Nama pembeli sengaja dibuat jauh lebih besar (24px, dulu 18px)
              — ini salah satu info paling penting di struk, permintaan
              Denny 2026-08 supaya kebaca jelas walau mata minus/plus. */}
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

      {/* ── Items ── */}
      <div style={{ margin: "8px 0" }}>
        {(sale.items ?? []).map((item, idx) => {
          const qty = effectiveQty(item);
          return (
            // List pembelian (kode+ukuran, qty×harga, total per item) sengaja
            // dibuat lebih besar dari sebelumnya — ini bagian paling penting
            // yang dicek pembeli/kasir, permintaan Denny 2026-08. qty×harga
            // & total TETAP 1 baris kiri-kanan (Denny tidak suka versi baris
            // penuh terpisah) — wrap berantakan sebelumnya diatasi dengan
            // melebarkan modal struk (max-w-xs → max-w-sm, lihat Struk.jsx)
            // + whiteSpace:"nowrap" di sini supaya kalaupun kepepet, teksnya
            // overflow rapi (bukan patah di tengah kata).
            <div key={idx} style={{ marginBottom: 10 }}>
              <p style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>
                {idx + 1}. {item.kode?.toUpperCase()} — {item.size?.toUpperCase()}
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
                <span style={{ fontWeight: 700, fontSize: 19, whiteSpace: "nowrap" }}>
                  Rp {formatHarga(qty * item.harga)}
                </span>
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
      )}

      {/* Garis di atas TOTAL — SELALU tampil (dulu hanya muncul kalau ada
          diskon) supaya total selalu terlihat jelas ada spacer/pemisahnya. */}
      <Divider />

      {/* ── Total ── */}
      {/* Grand total dibuat satu tingkat lebih besar lagi (28px, dulu 22px)
          — tetap harus jadi angka paling menonjol di seluruh struk. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 900,
          fontSize: 28,
          margin: "8px 0 12px",
        }}
      >
        <span>{isRetur ? "TOTAL RETUR" : "TOTAL"}</span>
        <span>Rp {formatHarga(sale.total)}</span>
      </div>

      <Divider />

      {/* ── Rekening ── */}
      {/* Beberapa rekening ditata space-between + garis vertikal putus-putus
          di antaranya supaya tidak mepet (dulu terlalu rapat). */}
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

      {/* ── QR ajakan lihat katalog ── */}
      {/* Ukuran cetak fisik QR ≈ 25×25mm (permintaan Denny) — disamakan ke
          ~100px di layar/PNG capture (≈25mm @ 96dpi) supaya proporsional.
          "www.deera.id" & @deeraindonesia sudah mewakili STORE_INFO.website,
          jadi baris website polos di footer di bawah sengaja dihapus (dulu
          duplikat). */}
      <div style={{ textAlign: "center", margin: "14px 0" }}>
        <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>
          {/* 2 baris via <span> block (bukan satu teks + <br/>) supaya tiap
              baris tetap jadi elemen queryable sendiri-sendiri di test. */}
          <span style={{ display: "block" }}>Lihat koleksi</span>
          <span style={{ display: "block" }}>lengkap Deera</span>
        </p>
        {/* display:"block" + margin kiri-kanan "auto" WAJIB ditulis eksplisit
            di sini — Tailwind preflight sudah set `img{display:block}` yang
            bikin `textAlign:"center"` di parent tidak ngefek ke <img>
            (cuma ngefek ke elemen inline), jadi kalau tidak di-override QR
            akan nempel kiri, bukan di tengah. */}
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

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", fontSize: 14, marginTop: 10, color: "#333" }}>
        <p>WA: {STORE_INFO.wa}</p>
        <p style={{ marginTop: 8, fontWeight: 700, letterSpacing: "0.05em" }}>
          {isRetur ? "Terima kasih atas retur Anda" : "Terima kasih telah berbelanja!"}
        </p>
      </div>
    </div>
  );
}
