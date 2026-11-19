import { Fragment } from "react";
import { createPortal } from "react-dom";
import { groupRowsByKode } from "../utils";

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function SuratJalanCmtModal({ group, onClose }) {
  if (!group) return null;

  const kodeGroups = groupRowsByKode(group.rows);
  const totalQty = (group.rows ?? []).reduce((s, r) => s + (Number(r.qty) || 0), 0);

  return createPortal(
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #sj-cmt-overlay { display: block !important; position: static !important; background: none !important; }
          #sj-cmt-overlay > * { display: block !important; }
          #sj-cmt-actions, #sj-cmt-header { display: none !important; }
          #sj-cmt-wrapper {
            position: static !important;
            max-height: none !important;
            box-shadow: none !important;
            width: auto !important;
            max-width: none !important;
          }
          #sj-cmt-body { overflow: visible !important; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      <div
        id="sj-cmt-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      >
        <div className="absolute inset-0" onClick={onClose} />
        <div
          id="sj-cmt-wrapper"
          className="relative bg-white w-full max-w-2xl mx-auto shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col"
        >
          <div
            id="sj-cmt-header"
            className="flex-shrink-0 bg-skin-header px-4 py-3 flex items-center justify-between"
          >
            <div>
              <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
                Surat Jalan CMT
              </span>
              <span className="ml-2 text-xs text-skin-accent-text font-mono">{group.kirimNo}</span>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition text-xl leading-none"
            >
              ✕
            </button>
          </div>

          <div id="sj-cmt-body" className="overflow-y-auto flex-1 bg-white">
            <div
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 13,
                color: "#1a1a1a",
                background: "#fff",
                padding: "32px 36px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingBottom: 16,
                  borderBottom: "3px solid #a8925a",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: "bold",
                      letterSpacing: 4,
                      color: "#a8925a",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    DEERA
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                      color: "#888",
                      marginTop: 2,
                    }}
                  >
                    INDONESIA
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: "bold",
                      letterSpacing: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    Surat Jalan
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Potongan ke CMT</div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#a8925a",
                      marginTop: 3,
                      letterSpacing: 1,
                    }}
                  >
                    {group.kirimNo}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", border: "1px solid #ddd", marginBottom: 20 }}>
                <div style={{ flex: 1, padding: "12px 16px" }}>
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      color: "#a8925a",
                      fontWeight: "bold",
                      marginBottom: 5,
                    }}
                  >
                    Vendor (Penerima)
                  </div>
                  <div style={{ fontSize: 15, fontWeight: "bold" }}>{group.namaVendor}</div>
                </div>
                <div style={{ width: 1, background: "#ddd" }} />
                <div style={{ flex: 1, padding: "12px 16px" }}>
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      color: "#a8925a",
                      fontWeight: "bold",
                      marginBottom: 5,
                    }}
                  >
                    Tanggal Kirim
                  </div>
                  <div style={{ fontSize: 13, fontWeight: "bold" }}>
                    {fmtDate(group.tanggalKirim)}
                  </div>
                  {group.estimasiSelesai && (
                    <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>
                      Estimasi selesai: {fmtDate(group.estimasiSelesai)}
                    </div>
                  )}
                </div>
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: 16,
                  fontSize: 11.5,
                }}
              >
                <thead>
                  <tr style={{ background: "#a8925a", color: "#fff" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Kode / Ukuran</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Warna</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {kodeGroups.map((kg) => (
                    <Fragment key={kg.kode}>
                      <tr
                        style={{
                          background: "#f5f0e8",
                          borderTop: "1.5px solid #ddd",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        <td
                          colSpan={2}
                          style={{ padding: "7px 10px", fontWeight: 800, fontSize: 12 }}
                        >
                          {kg.kode}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#888",
                            fontSize: 11,
                          }}
                        >
                          {kg.totalQty} pcs
                        </td>
                      </tr>
                      {kg.rows.map((r, idx) => (
                        <tr key={`${kg.kode}-${idx}`} style={{ borderBottom: "1px solid #eee" }}>
                          <td
                            style={{
                              padding: "6px 10px 6px 20px",
                              color: "#444",
                              textTransform: "uppercase",
                            }}
                          >
                            {r.size}
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              color: "#666",
                              textTransform: "uppercase",
                            }}
                          >
                            {r.warna && r.warna !== "_" ? r.warna : "—"}
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              textAlign: "right",
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {r.qty}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#1a1a1a", color: "#fff" }}>
                    <td
                      colSpan={2}
                      style={{
                        padding: "9px 10px",
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: "0.12em",
                      }}
                    >
                      TOTAL
                    </td>
                    <td
                      style={{
                        padding: "9px 10px",
                        textAlign: "right",
                        fontWeight: 900,
                        fontSize: 17,
                      }}
                    >
                      {totalQty}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {group.rows?.[0]?.catatan && (
                <div
                  style={{
                    background: "#faf9f7",
                    borderLeft: "3px solid #ddd",
                    padding: "9px 14px",
                    marginBottom: 18,
                    fontSize: 11,
                    color: "#555",
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      color: "#a8925a",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Keterangan
                  </div>
                  {group.rows[0].catatan}
                </div>
              )}

              <div style={{ display: "flex", gap: 32, marginTop: 48 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      color: "#888",
                      marginBottom: 60,
                    }}
                  >
                    Pengirim
                  </div>
                  <div style={{ borderTop: "1px solid #333", paddingTop: 6 }}>
                    <div style={{ fontWeight: "bold", fontSize: 12 }}>DEERA INDONESIA</div>
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      color: "#888",
                      marginBottom: 60,
                    }}
                  >
                    Penerima
                  </div>
                  <div style={{ borderTop: "1px solid #333", paddingTop: 6 }}>
                    <div style={{ fontWeight: "bold", fontSize: 12, textTransform: "uppercase" }}>
                      {group.namaVendor}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 32,
                  borderTop: "1px solid #eee",
                  paddingTop: 10,
                  textAlign: "center",
                  fontSize: 9,
                  color: "#aaa",
                  letterSpacing: 1,
                }}
              >
                DEERA INDONESIA · Dokumen ini digenerate otomatis · {group.kirimNo}
              </div>
            </div>
          </div>

          <div id="sj-cmt-actions" className="flex-shrink-0 border-t-2 border-skin-bdr flex">
            <button
              onClick={onClose}
              className="py-4 px-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text3 hover:text-skin-text transition border-r border-skin-bdr"
            >
              Tutup
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-skin-accent-text hover:bg-skin-accent/10 transition"
            >
              Cetak / Simpan PDF
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
