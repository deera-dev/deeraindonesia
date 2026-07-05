/**
 * PettycashShareCard.jsx
 * Kartu ringkasan petty cash yang di-capture ke PNG.
 */
import { forwardRef } from "react";
import { fmtRp, fmtTanggalPendek } from "../../../shared/lib/format";

const PettycashShareCard = forwardRef(function PettycashShareCard({ rows, fromDate, toDate, saldo }, ref) {
  const periodeLabel = fromDate === toDate
    ? fmtTanggalPendek(fromDate)
    : `${fmtTanggalPendek(fromDate)} — ${fmtTanggalPendek(toDate)}`;

  return (
    <div
      ref={ref}
      style={{ width: 320, fontFamily: "serif", background: "#0f0b07", color: "#e8e0d0" }}
    >
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #3a2e1e" }}>
        <p style={{ margin: "0 0 4px", fontSize: 10, letterSpacing: "0.3em", color: "#7a6a50", textTransform: "uppercase" }}>
          DEERA INDONESIA
        </p>
        <p style={{ margin: 0, fontSize: 18, color: "#CAB170", lineHeight: 1 }}>Petty Cash</p>
      </div>

      {/* Periode */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #3a2e1e" }}>
        <p style={{ margin: 0, fontSize: 10, color: "#7a6a50", letterSpacing: "0.2em", textTransform: "uppercase" }}>Periode</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#c0b090" }}>{periodeLabel}</p>
      </div>

      {/* Saldo all-time */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #3a2e1e" }}>
        <p style={{ margin: "0 0 2px", fontSize: 10, color: "#7a6a50", letterSpacing: "0.15em", textTransform: "uppercase" }}>Saldo Sekarang</p>
        <p style={{ margin: 0, fontSize: 20, color: saldo >= 0 ? "#CAB170" : "#f87171", fontWeight: "bold", lineHeight: 1.2 }}>
          {fmtRp(saldo)}
        </p>
      </div>

      {/* Detail transaksi */}
      {rows.length > 0 && (
        <div style={{ padding: "12px 20px 0" }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, color: "#7a6a50", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Transaksi ({rows.length})
          </p>
          {rows.map((r, i) => (
            <div key={r.id ?? i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                <p style={{ margin: 0, fontSize: 11, color: "#c0b090", lineHeight: 1.3 }}>
                  {r.keterangan || r.kategori || "—"}
                </p>
                <p style={{ margin: 0, fontSize: 9, color: "#5a4e38" }}>{fmtTanggalPendek(r.tanggal)}</p>
              </div>
              <span style={{ fontSize: 11, color: r.jenis === "isi" ? "#4ade80" : "#f87171", fontWeight: "bold", whiteSpace: "nowrap" }}>
                {r.jenis === "isi" ? "+" : "-"}{fmtRp(r.jumlah)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "12px 20px 14px", marginTop: 8, borderTop: "1px solid #3a2e1e" }}>
        <p style={{ margin: 0, fontSize: 9, color: "#5a4e38", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Laporan internal Deera Indonesia
        </p>
      </div>
    </div>
  );
});

export default PettycashShareCard;
