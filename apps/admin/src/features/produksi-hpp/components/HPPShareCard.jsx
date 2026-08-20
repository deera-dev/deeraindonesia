/**
 * HPPShareCard.jsx
 * Kartu yang di-capture ke PNG saat share HPP detail.
 * Menampilkan foto produk PENUH + rincian HPP:
 * - Bahan: nama + qty/baju × harga/satuan (detail sama seperti HPPCard)
 * - Total Biaya Bahan = total_hpp − biaya_lain (aggregate, selalu akurat)
 * - Biaya Lain: SELURUH komponen non-bahan (upah, bordir, studio, kancing,
 *   plastik, hangtag, tali hangtag, merk, pin, kain keras, Poin Denny,
 *   Poin Haikal) — lihat catatan bug-fix di bawah.
 * - TOTAL HPP: tpl.total_hpp (nilai kanonikal dari DB)
 *
 * ── Perbaikan bug "Poin tidak masuk Total HPP" (lihat
 * LAPORAN_INVESTIGASI_HPP_POIN.md) ──────────────────────────────────────────
 * `biayaLain` di sini SEBELUMNYA hanya berisi upah_jahit/bordir/biaya_studio/
 * kancing — TIDAK termasuk plastik/hangtag/tali_hangtag/merk/pin/kain_keras/
 * poin_denny/poin_haikal. Karena `biayaBahan` dihitung sebagai
 * `total_hpp − totalBiayaLain` (pendekatan agregat, WAJIB dipertahankan per
 * CLAUDE.md §13 — jangan hitung subtotal bahan per-item, supaya tidak
 * ter-inflasi oleh qty motif), komponen yang hilang dari `biayaLain` tadi
 * diam-diam ikut "tertelan" ke angka "Total Biaya Bahan" — bukan berarti
 * hilang dari Total HPP (yang selalu dibaca langsung dari tpl.total_hpp,
 * jadi angka Total HPP di kartu ini SUDAH benar sejak awal), tapi salah
 * label: biaya kemasan + Poin ditampilkan seolah-olah biaya bahan.
 * Diperbaiki dengan memakai biayaLainBreakdown() yang sama persis dengan
 * yang dipakai HPPForm saat menyimpan, dijalankan atas `tpl.config_snapshot`
 * (Harga Dasar yang dibekukan saat template disimpan) — sehingga "Total
 * Biaya Bahan" sekarang murni biaya bahan, dan Poin muncul eksplisit di
 * seksi "Biaya Lain".
 */
import { forwardRef } from "react";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { fmtRp, fmt4, calcQtyPerBaju, biayaLainBreakdown } from "../utils";

const HPPShareCard = forwardRef(function HPPShareCard({ tpl, produk }, ref) {
  const imgSrc = produk?.image ? cldUrl(produk.image, { width: 600 }) : null;

  // Seluruh komponen biaya non-bahan (nilai ini langsung tersimpan di DB /
  // config_snapshot, selalu akurat per-baju) — SATU sumber kebenaran yang
  // sama dengan calcTotal() di utils.js, supaya tidak ada rumus kedua yang
  // diam-diam berbeda.
  const biayaLain = biayaLainBreakdown({
    upah_jahit: tpl.upah_jahit,
    bordir: tpl.bordir,
    kancing_qty: tpl.kancing_qty,
    kancing_extra: tpl.kancing_extra,
    biaya_studio: tpl.biaya_studio,
    config: tpl.config_snapshot ?? {},
  })
    .filter((b) => b.val > 0)
    .map((b) => ({ label: b.label, value: b.val }));

  const totalBiayaLain = biayaLain.reduce((s, b) => s + b.value, 0);

  // Biaya bahan = total_hpp − biaya lain (selalu akurat, tidak perlu recalc per-item)
  const biayaBahan = Math.max(0, (tpl.total_hpp ?? 0) - totalBiayaLain);
  const bahanItems = tpl.bahan_items ?? [];

  return (
    <div
      ref={ref}
      style={{ width: 320, fontFamily: "serif", background: "#0f0b07", color: "#e8e0d0" }}
    >
      {/* Header brand */}
      <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #3a2e1e" }}>
        <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.3em", color: "#7a6a50", textTransform: "uppercase" }}>
          DEERA INDONESIA — RINCIAN HPP
        </p>
      </div>

      {/* Foto produk — FULL */}
      {imgSrc && (
        <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", background: "#1a1208" }}>
          <img
            src={imgSrc}
            alt={tpl.kode_produk}
            crossOrigin="anonymous"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
          />
        </div>
      )}

      {/* Produk info */}
      <div style={{ padding: "14px 20px 0" }}>
        <p style={{ margin: "0 0 2px", fontSize: 18, color: "#CAB170", lineHeight: 1 }}>{tpl.kode_produk}</p>
        <p style={{ margin: "0 0 6px", fontSize: 12, color: "#a09070" }}>{produk?.nama ?? "—"}</p>
      </div>

      {/* Pemakaian Bahan */}
      {bahanItems.length > 0 && (
        <div style={{ padding: "10px 20px 0", borderTop: "1px solid #3a2e1e", margin: "10px 20px 0" }}>
          <p style={{ margin: "0 0 8px", fontSize: 9, color: "#5a4e38", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Pemakaian Bahan
          </p>
          {bahanItems.map((b, i) => {
            const qpb = Number(b.qty_per_baju) || calcQtyPerBaju(b);
            // b.satuan_ukur sengaja TIDAK dipakai di sini — itu field satuan
            // konversi utk breakdown per-warna (lihat HppTemplateDetailSheet.jsx
            // baris "Warna: qty satuan_ukur/baju"), BUKAN satuan tampilan
            // baris utama qty/baju × harga/satuan. Baris utama harus pakai
            // b.satuan (mis. "yard") — dulu salah pakai satuan_ukur ("cm")
            // sehingga sebagian bahan tampil "cm/baju" padahal seharusnya
            // "yard/baju", beda dari HppTemplateDetailSheet.jsx yg benar.
            const satuan = b.satuan || "yard";
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <p style={{ margin: "0 0 2px", fontSize: 12, color: "#c0b090", fontWeight: "bold" }}>
                  {b.nama_bahan}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: "#7a6a50" }}>
                  {fmt4(qpb)} {satuan}/baju × {fmtRp(b.harga_satuan)}/{satuan}
                </p>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px solid #2a2010" }}>
            <span style={{ fontSize: 11, color: "#a09070" }}>Total Biaya Bahan</span>
            <span style={{ fontSize: 11, color: "#c0b090", fontWeight: "bold" }}>{fmtRp(biayaBahan)}</span>
          </div>
        </div>
      )}

      {/* Biaya Lain */}
      {biayaLain.length > 0 && (
        <div style={{ padding: "10px 20px 0", borderTop: "1px solid #2a2010", margin: "8px 20px 0" }}>
          <p style={{ margin: "0 0 6px", fontSize: 9, color: "#5a4e38", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Biaya Lain
          </p>
          {biayaLain.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "#a09070" }}>{item.label}</span>
              <span style={{ fontSize: 11, color: "#c0b090", fontWeight: "bold" }}>{fmtRp(item.value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div style={{ margin: "10px 20px 0", padding: "10px 0 0", borderTop: "1px solid #CAB170" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: "#e8e0d0", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Total HPP
          </span>
          <span style={{ fontSize: 20, color: "#CAB170", fontWeight: "bold" }}>
            {fmtRp(tpl.total_hpp)}
          </span>
        </div>
        {tpl.catatan && (
          <p style={{ margin: "6px 0 0", fontSize: 10, color: "#6a5e48", fontStyle: "italic" }}>
            {tpl.catatan}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px 14px", marginTop: 10, borderTop: "1px solid #3a2e1e" }}>
        <p style={{ margin: 0, fontSize: 9, color: "#5a4e38", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          deera.id
        </p>
      </div>
    </div>
  );
}
);

export default HPPShareCard;
