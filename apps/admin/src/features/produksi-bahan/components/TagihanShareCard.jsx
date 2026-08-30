/**
 * TagihanShareCard.jsx
 * Kartu tagihan bahan baku (SEMUA bulan jatuh tempo belum lunas sekaligus),
 * di-capture ke PNG oleh TagihanShareModal.jsx. Isinya SENGAJA dibuat persis
 * sama cakupannya dengan generateTagihanWA() (teks WA) — permintaan Denny
 * 2026-08: "share imagenya dibuat 1 modal aja dengan share text ini" (gambar
 * & teks harus menampilkan info yang sama, bukan gambar per-bulan terpisah
 * seperti sebelumnya). Gaya visual (background gelap #0f0b07 + aksen gold
 * #CAB170, inline style bukan Tailwind) SENGAJA meniru HPPShareCard.jsx
 * supaya konsisten dengan kartu share lain di codebase ini.
 *
 * Props:
 * - groups : array hasil groupTagihanPerBulan() — [{ bulan, total, items }]
 */
import { forwardRef } from "react";
import { fmtRp, fmtBulan, fmtTanggalLengkap, hargaSatuanEfektif } from "../utils";

const TagihanShareCard = forwardRef(function TagihanShareCard({ groups }, ref) {
  const list = groups ?? [];
  const grandTotal = list.reduce((s, g) => s + g.total, 0);

  return (
    <div
      ref={ref}
      style={{ width: 360, fontFamily: "serif", background: "#0f0b07", color: "#e8e0d0" }}
    >
      {/* Header brand + grand total */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #3a2e1e" }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.3em",
            color: "#7a6a50",
            textTransform: "uppercase",
          }}
        >
          DEERA INDONESIA — TAGIHAN BAHAN
        </p>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 11, color: "#a09070", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Total Semua Tagihan
          </span>
          <span style={{ fontSize: 18, color: "#CAB170", fontWeight: "bold", whiteSpace: "nowrap" }}>
            {fmtRp(grandTotal)}
          </span>
        </div>
      </div>

      {/* Per bulan */}
      {list.map((g) => (
        <div key={g.bulan} style={{ padding: "12px 20px 4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 10,
              paddingBottom: 6,
              borderBottom: "1px solid #3a2e1e",
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#e8e0d0", fontWeight: "bold" }}>
              📅 Jatuh Tempo {fmtBulan(`${g.bulan}-01`)}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#CAB170", fontWeight: "bold", whiteSpace: "nowrap" }}>
              {fmtRp(g.total)}
            </p>
          </div>

          {(g.items ?? []).map((r, i) => (
            <div key={r.id ?? i} style={{ padding: "10px 0", borderBottom: "1px solid #2a2010" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#c0b090", fontWeight: "bold" }}>
                  {r.nama_bahan}
                  {r.motif ? ` / ${r.motif}` : ""}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#e8e0d0", fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {fmtRp(r.total_harga)}
                </p>
              </div>
              {/* Qty TIDAK diulang di baris "Beli" — sudah ada di baris
                  "harga/satuan × qty" di bawah (permintaan Denny 2026-08:
                  "600 yard diatas redundant karena udah ada info dibawahnya
                  harga x yard"). Tanggal Beli & Tempo digabung satu baris. */}
              <p style={{ margin: "3px 0 0", fontSize: 10, color: "#7a6a50" }}>
                Beli {fmtTanggalLengkap(r.tanggal)} ·{" "}
                <span style={{ color: "#CAB170" }}>Tempo: {fmtTanggalLengkap(r.jatuh_tempo)}</span>
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#7a6a50" }}>
                {fmtRp(hargaSatuanEfektif(r))}/{r.satuan} × {r.jumlah} {r.satuan}
              </p>
            </div>
          ))}
        </div>
      ))}

      {/* Footer */}
      <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #3a2e1e", marginTop: 4 }}>
        <p
          style={{
            margin: 0,
            fontSize: 9,
            color: "#5a4e38",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          deera.id
        </p>
      </div>
    </div>
  );
});

export default TagihanShareCard;
