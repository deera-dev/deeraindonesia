import { forwardRef } from "react";
import { fmtRp, fmtTanggal } from "../../../shared/lib/format";

/**
 * GajianShareCard.jsx — Kartu ringkasan gajian (tema gelap) yang di-capture
 * jadi PNG oleh ShareModal. Dulu fungsi biasa dipanggil manual dengan ref
 * sebagai argumen kedua; sekarang forwardRef yang sebenarnya.
 */
const GajianShareCard = forwardRef(function GajianShareCard(
  { gajian, totals, perKaryawan, tambahan, pettycash, kasbonDeds, totalRequest },
  ref,
) {
  const isFinal = gajian.status === "final";
  const totalGaji = isFinal ? (gajian.total_gaji ?? 0) : (totals?.gaji ?? 0);
  const pc = isFinal ? (gajian.pettycash ?? 0) : (Number(pettycash) || 0);
  const tambs = ((isFinal ? gajian.tambahan : tambahan) ?? []).filter((t) => Number(t.jumlah) > 0);
  const kasbs = ((isFinal ? gajian.kasbon_deductions : kasbonDeds) ?? []).filter((k) => Number(k.jumlah) > 0);
  const treq = isFinal ? (gajian.total_request ?? 0) : totalRequest;
  const dedByNama = {};
  for (const k of kasbs) {
    const nama = k.nama || "—";
    dedByNama[nama] = (dedByNama[nama] ?? 0) + (Number(k.jumlah) || 0);
  }

  const timRows = [
    ["Tim Potong", isFinal ? gajian.total_potong : totals?.potong, totals?.potong],
    ["Tim Jahit", isFinal ? gajian.total_jahit : totals?.jahit, totals?.jahit],
    ["Tim Finishing", isFinal ? gajian.total_finishing : totals?.finishing, totals?.finishing],
    ["Tim QC", isFinal ? gajian.total_qa : totals?.qa, totals?.qa],
    ["Tim Kreatif", isFinal ? gajian.total_kreatif : totals?.kreatif, totals?.kreatif],
    ["CMT Luar", isFinal ? gajian.total_cmt : totals?.cmt, totals?.cmt],
  ].filter(([, v]) => (v ?? 0) > 0);

  const hasTambahan = pc > 0 || tambs.length > 0 || kasbs.length > 0;

  return (
    <div
      ref={ref}
      style={{
        width: 420,
        minWidth: 420,
        background: "#18120a",
        color: "#e8dcc8",
        padding: 28,
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p style={{ color: "#CAB170", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", margin: 0 }}>Deera Indonesia</p>
        <p style={{ fontSize: 20, fontWeight: 600, margin: "4px 0 0" }}>Ringkasan Gajian</p>
        <p style={{ fontSize: 12, color: "#a89a82", margin: "2px 0 0" }}>{fmtTanggal(gajian.tanggal_sabtu)}</p>
        {isFinal && (
          <span style={{ display: "inline-block", marginTop: 8, fontSize: 10, letterSpacing: 1, color: "#34d399", border: "1px solid #34d399", borderRadius: 999, padding: "2px 10px" }}>
            FINAL
          </span>
        )}
      </div>

      <div style={{ borderTop: "1px solid #3a2f1f", borderBottom: "1px solid #3a2f1f", padding: "14px 0", marginBottom: 14 }}>
        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#CAB170", margin: "0 0 8px" }}>Rincian Per Tim</p>
        {timRows.map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
            <span style={{ color: "#a89a82" }}>{label}</span>
            <span>{fmtRp(val ?? 0)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: "1px solid #3a2f1f" }}>
          <span>Total Gaji</span>
          <span style={{ color: "#CAB170" }}>{fmtRp(totalGaji)}</span>
        </div>
      </div>

      {hasTambahan && (
        <div style={{ borderBottom: "1px solid #3a2f1f", paddingBottom: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#CAB170", margin: "0 0 8px" }}>Tambahan &amp; Potongan</p>
          {pc > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              {/* Permintaan Denny 2026-09: wording konsisten dgn TabRingkasan.jsx */}
              <span style={{ color: "#a89a82" }}>+ Uang Denny &amp; Wulan Terpakai</span>
              <span>{fmtRp(pc)}</span>
            </div>
          )}
          {tambs.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: "#a89a82" }}>+ {t.label || "Tambahan"}</span>
              <span>{fmtRp(t.jumlah)}</span>
            </div>
          ))}
          {kasbs.map((k, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: "#f87171" }}>− Kasbon {k.nama || ""}</span>
              <span style={{ color: "#f87171" }}>−{fmtRp(k.jumlah)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "#241a0e", border: "1px solid #CAB170", borderRadius: 4, padding: "12px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#CAB170", letterSpacing: 1, textTransform: "uppercase" }}>Total Mingguan</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#CAB170" }}>{fmtRp(treq)}</span>
      </div>

      {perKaryawan.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#CAB170", margin: "0 0 10px" }}>Rincian Per Karyawan</p>
          {perKaryawan.map(([nama, data]) => {
            const potongan = dedByNama[nama] ?? 0;
            const transfer = Math.max(data.total - potongan, 0);
            return (
              <div key={nama} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #2a2014" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{nama}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#CAB170" }}>{fmtRp(transfer)}</span>
                </div>
                {(data.nama_bank || data.no_rekening) && (
                  <p style={{ fontSize: 11, color: "#a89a82", margin: "2px 0 0" }}>
                    {[data.nama_bank, data.no_rekening].filter(Boolean).join(" · ")}
                  </p>
                )}
                {potongan > 0 && (
                  <p style={{ fontSize: 11, color: "#f87171", margin: "2px 0 0" }}>
                    {fmtRp(data.total)} − Kasbon {fmtRp(potongan)}
                  </p>
                )}
                {data.rincian.length > 0 && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #2a2014" }}>
                    {data.rincian.map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#a89a82", padding: "1px 0" }}>
                        <span>{r.label}</span>
                        <span>{fmtRp(r.sub)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 10, color: "#6b5d47", marginTop: 16, marginBottom: 0 }}>
        {fmtTanggal(gajian.tanggal_sabtu)} · Deera Indonesia
      </p>
    </div>
  );
});

export default GajianShareCard;
