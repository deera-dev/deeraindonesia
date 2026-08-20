/**
 * useTsplPrinter.jsx
 * Hook print struk ke thermal printer via TSPL + BLE.
 *
 * Protokol: TSPL (TSC Printer Script Language) — plain ASCII commands
 * Transport: Web Bluetooth BLE → Generic FF00 / ff02 (write char)
 *
 * Blueprint BP-TD110BT: 100 mm paper, 203 dpi, TSPL, BLE Generic FF00
 *   - ff01: notify (printer→HP)
 *   - ff02: write (HP→printer) ← ini yang kita pakai
 *   - ff03: notify (printer→HP)
 *
 * ── Pilihan lebar kertas ──────────────────────────────────────────────────
 * Bisa dipilih user via PAPER_WIDTHS di bawah — "78" (default sejak
 * 2026-08, keputusan Denny) atau "100" (opsi lama, dots TIDAK berubah).
 * Dot count per lebar dihitung dari 203 dpi ≈ 7,992 dots/mm, dibulatkan
 * ke integer terdekat (100mm → 799,2 ≈ 800; 78mm → 623,4 ≈ 623) — pola
 * pembulatan yang SAMA seperti komentar lama "100 mm @ 203 DPI = ~800
 * dots". MARGIN (jarak dari tepi kertas) TETAP 20 dot untuk kedua lebar,
 * tidak ikut di-scale — tidak diminta berubah, dan margin absolut yang
 * sama tetap wajar dipakai di kertas lebih sempit.
 */

import { useState } from "react";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { formatHarga } from "@deera/shared/lib/constants";
import { effectiveQty, formatStrukDateTime } from "../lib/salesUtils";

// ── Konstanta layout ─────────────────────────────────────────────────────────
// 100 mm @ 203 DPI = ~800 dots — dots-nya sendiri TIDAK berubah dari
// sebelumnya, hanya default paperWidth-nya yang sekarang 78mm (lihat bawah).
const MARGIN = 20;

// Pilihan lebar kertas — key adalah nilai mm yang dikirim apa adanya ke
// command TSPL `SIZE {mm} mm,...`. "78" = default (2026-08), "100" = opsi
// lama (dots TIDAK berubah).
export const PAPER_WIDTHS = {
  100: { label: "100mm", dots: 800 },
  78: { label: "78mm (Bawaan)", dots: 623 },
};
const DEFAULT_PAPER_WIDTH = "78";

// Dimensi built-in TSPL fonts (fixed-width per char, approx)
// Font "2" = 12×20 | "3" = 16×24 | "4" = 24×32
// Diexport supaya TsplPrintPreview.jsx (canvas preview visual struk) bisa
// pakai metrik yang SAMA PERSIS dengan yang dipakai generateTsplString() saat
// menghitung posisi x/y — supaya preview akurat, bukan cuma tebak-tebakan.
export const FONT = {
  2: { w: 12, h: 20 },
  3: { w: 16, h: 24 },
  4: { w: 24, h: 32 },
};

// BLE service FF00 — hanya ff02 yang write
const FF00_SVC = "0000ff00-0000-1000-8000-00805f9b34fb";
const FF02_CHAR = "0000ff02-0000-1000-8000-00805f9b34fb";

export const LABEL_TYPES = {
  continuous: { label: "Kontinu (roll terus)", gapMm: 0 },
  gapped: { label: "Putus (per struk)", gapMm: 3 },
};

// ── TSPL receipt generator ───────────────────────────────────────────────────
//
// generateTsplString() membangun command TSPL mentah sebagai STRING (dipakai
// baik oleh generateTspl() untuk di-encode jadi bytes sebelum dikirim BLE,
// MAUPUN oleh previewTspl() — dipakai TsplPrintPreview.jsx (tab "Versi B" di
// Struk.jsx) buat gambar preview visual, TANPA perlu koneksi Bluetooth.

function generateTsplString(sale, labelType = "continuous", paperWidthMm = DEFAULT_PAPER_WIDTH) {
  // W_DOT sekarang bergantung pada lebar kertas terpilih — dipindah jadi
  // variabel lokal (dulu module-level const) supaya helper builder TSPL di
  // bawah (tLeft/tCenter/tRow/tRowMixed/tLine/wrapText) bisa dibuat sbg
  // closure yang otomatis memakai lebar yang benar untuk panggilan ini,
  // TANPA mengubah signature/isi panggilan mereka di seluruh fungsi ini.
  const W_DOT = PAPER_WIDTHS[paperWidthMm]?.dots ?? PAPER_WIDTHS[DEFAULT_PAPER_WIDTH].dots;

  function tLeft(x, y, f, text, xm = 1, ym = 1) {
    return `TEXT ${x},${y},"${f}",0,${xm},${ym},"${text}"\r\n`;
  }

  function tCenter(y, f, text, xm = 1, ym = 1) {
    const charW = FONT[f].w * xm;
    const textW = text.length * charW;
    const x = Math.max(MARGIN, Math.floor((W_DOT - textW) / 2));
    return `TEXT ${x},${y},"${f}",0,${xm},${ym},"${text}"\r\n`;
  }

  function tRow(y, f, leftText, rightText, xm = 1, ym = 1) {
    return tRowMixed(y, f, leftText, f, rightText, xm, ym);
  }

  // Baris kiri-kanan dgn font BERBEDA di tiap sisi (mis. label normal, nilai
  // "bold"/font lebih besar) — rightX dihitung pakai lebar font sisi kanan
  // supaya tetap rata-kanan yang akurat.
  function tRowMixed(y, leftFont, leftText, rightFont, rightText, xm = 1, ym = 1) {
    const rightCharW = FONT[rightFont].w * xm;
    const rightX = W_DOT - MARGIN - rightText.length * rightCharW;
    return (
      `TEXT ${MARGIN},${y},"${leftFont}",0,${xm},${ym},"${leftText}"\r\n` +
      `TEXT ${Math.max(MARGIN, rightX)},${y},"${rightFont}",0,${xm},${ym},"${rightText}"\r\n`
    );
  }

  // Teks rata-kanan berdiri sendiri (bukan pasangan kiri-kanan spt tRow) —
  // dipakai utk baris "Rp xxx.xxx" total per-item, supaya baris qty×harga
  // dan total-nya bisa dipisah ke 2 baris beda (lihat komentar BLOK Items)
  // dan tidak pernah tabrakan meskipun nominalnya panjang.
  function tRight(y, f, text, xm = 1, ym = 1) {
    const charW = FONT[f].w * xm;
    const x = W_DOT - MARGIN - text.length * charW;
    return `TEXT ${Math.max(MARGIN, x)},${y},"${f}",0,${xm},${ym},"${text}"\r\n`;
  }

  // Garis penuh dari tepi ke tepi
  function tLine(y, h = 2) {
    return `BAR 0,${y},${W_DOT},${h}\r\n`;
  }

  // Highlight "background hitam, teks putih" (teknik REVERSE: gambar TEXT
  // dulu spt biasa, lalu REVERSE area yang sama supaya kebalik jadi putih
  // di atas hitam) — dipakai utk section DEERA/tagline & baris Total,
  // permintaan Denny 2026-08 spy menonjol spt versi lama.
  function tHighlight(startY, endY, pad = 6) {
    return `REVERSE 0,${startY - pad},${W_DOT},${endY - startY + pad * 2}\r\n`;
  }

  // Pecah teks panjang jadi beberapa baris (per kata) supaya muat di lebar
  // kertas — TSPL TIDAK auto-wrap, jadi kalimat panjang (mis. footer website)
  // harus dipotong manual sebelum dikirim, kalau tidak akan terpotong/nabrak.
  function wrapText(text, font, xm = 1) {
    const maxChars = Math.max(1, Math.floor((W_DOT - MARGIN * 2) / (FONT[font].w * xm)));
    const words = text.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > maxChars && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  const isRetur = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "-";
  const items = sale.items ?? [];
  const gapMm = LABEL_TYPES[labelType]?.gapMm ?? 0;

  // Tinggi cetak FISIK teks = dot-height font × ym — keluhan Denny "kecil
  // pas di print" diperbaiki dengan menaikkan ym (bukan xm/font tier lagi).
  // Kenapa ym, bukan xm: xm menambah lebar per karakter (risiko tabrakan
  // horizontal di kertas 78mm yang sudah sempit), sedangkan ym cuma
  // menambah tinggi glyph — teks jadi 2x lebih tinggi & jelas kebaca pas
  // dicetak, TANPA mengubah lebar apa pun (semua perhitungan lebar di
  // tCenter/tRow/tRowMixed/tRight cuma pakai `.w * xm`, tidak pernah ym).
  const TEXT_YM = 2;
  // Info PALING penting di struk — list pembelian (kode/ukuran, qty×harga,
  // total per item) & nama pembeli — dibuat lebih besar lagi dari teks umum
  // (ym=3, bukan 2) supaya tetap kebaca jelas walau mata minus/plus
  // (permintaan Denny 2026-08). Grand Total dibuat SATU tingkat lebih besar
  // lagi (ym=4) supaya tetap jadi angka paling menonjol di seluruh struk.
  // xm TIDAK ikut berubah (tetap 1) — cuma ym yang dinaikkan, supaya lebar
  // baris (tCenter/tRow/tRowMixed/tRight, yg cuma pakai `.w * xm`) tidak
  // ikut melebar dan tidak berisiko tabrakan horizontal.
  const TEXT_YM_ITEM = 3;
  const TEXT_YM_TOTAL = 4;
  function lineGap(font, ym = TEXT_YM, pad = 8) {
    return FONT[font].h * ym + pad;
  }

  const cmds = [];
  let y = 0;
  const add = (str) => cmds.push(str);
  const gap = (px) => {
    y += px;
  };
  const blank = () => gap(24); // baris kosong (spacer) — ikut disesuaikan seiring teks jadi lebih tinggi

  // ════════════════════════════════════════════════════════════════════════════
  // Desain "Versi B" (preview cetak / TSPL asli) — layout polos rata kiri,
  // TANPA logo/gambar (printer TSPL cuma bisa TEXT/BAR), sesuai spesifikasi
  // Denny 2026-08. Urutan PERSIS dari atas ke bawah:
  //   Judul → Tanggal → garis → DEERA + tagline → garis → Yth./nama →
  //   Staff/Lokasi → garis → Items → garis → Total → garis →
  //   Transfer (per rekening, masing2 diberi garis) → WA → garis → Footer
  // ════════════════════════════════════════════════════════════════════════════

  // Margin atas sebelum judul — supaya tidak mepet ke tepi kertas kalau
  // hasil cetak terpotong (permintaan Denny 2026-08). Sengaja cukup besar;
  // tidak masalah kalau struk jadi sedikit lebih panjang.
  gap(48);

  // Font dinaikkan satu tingkat dari desain awal (2→3, 3→4), DAN ym=2 di
  // semua teks (lihat TEXT_YM di atas) — permintaan Denny 2026-08 supaya
  // Versi B setebal/sejelas Versi A walau kertas 78mm DAN tetap kebaca
  // jelas pas benar-benar dicetak (bukan cuma di layar). gap (tinggi baris)
  // dihitung otomatis lewat lineGap() supaya selalu sinkron, tidak tabrakan.

  // — Judul + tanggal —
  add(tCenter(y, "4", isRetur ? "Struk Retur" : "Struk Pembelian", 1, TEXT_YM));
  gap(lineGap("4"));
  add(tCenter(y, "3", formatStrukDateTime(sale.created_at), 1, TEXT_YM));
  gap(lineGap("3"));

  add(tLine(y, 1));
  gap(14);

  // — Brand: DEERA + tagline — background hitam, teks putih (highlight,
  // permintaan Denny). TEXT digambar dulu spt biasa, REVERSE-nya nyusul
  // SETELAH block-nya selesai (lihat tHighlight()).
  const brandStartY = y;
  add(tCenter(y, "4", "DEERA", 1, TEXT_YM));
  gap(lineGap("4"));
  if (STORE_INFO.tagline) {
    add(tCenter(y, "3", STORE_INFO.tagline, 1, TEXT_YM));
    gap(lineGap("3"));
  }
  add(tHighlight(brandStartY, y));
  gap(6);

  add(tLine(y, 1));
  gap(14);

  // — Yth. + nama pembeli —
  add(tLeft(MARGIN, y, "3", "Yth.", 1, TEXT_YM));
  gap(lineGap("3"));
  if (sale.buyer_name) {
    add(tLeft(MARGIN, y, "4", sale.buyer_name.toUpperCase(), 1, TEXT_YM_ITEM));
    gap(lineGap("4", TEXT_YM_ITEM));
  }
  blank();

  // — Staff & Lokasi, masing-masing baris sendiri —
  add(tLeft(MARGIN, y, "3", `Staff: ${sale.created_by_name?.toUpperCase() ?? "-"}`, 1, TEXT_YM));
  gap(lineGap("3"));
  add(tLeft(MARGIN, y, "3", `Lokasi: ${locLabel}`, 1, TEXT_YM));
  gap(lineGap("3"));

  add(tLine(y, 1));
  gap(14);
  blank();

  // — Items: kode-ukuran (bold) + baris qty×harga + baris total (bold) —
  // qty×harga & total SENGAJA dipisah jadi 2 baris beda (bukan 1 baris
  // kiri-kanan spt sebelumnya) — pada font besar (permintaan Denny), teks
  // kiri "N pcs x Rp xxx.xxx" + teks kanan "Rp xxx.xxx" bisa sama-sama
  // panjang dan TABRAKAN di tengah kalau dipaksa satu baris. Split jadi 2
  // baris menghilangkan risiko itu sepenuhnya, apa pun panjang nominalnya.
  items.forEach((item, idx) => {
    const qty = effectiveQty(item);
    const lineTotal = qty * item.harga;
    const kode = (item.kode ?? "").toUpperCase();
    const size = (item.size ?? "").toUpperCase();

    add(tLeft(MARGIN, y, "4", `${idx + 1}. ${kode} - ${size}`, 1, TEXT_YM_ITEM));
    gap(lineGap("4", TEXT_YM_ITEM));
    blank();

    add(tLeft(MARGIN, y, "3", `   ${qty} pcs x Rp ${formatHarga(item.harga)}`, 1, TEXT_YM_ITEM));
    gap(lineGap("3", TEXT_YM_ITEM));
    add(tRight(y, "4", `Rp ${formatHarga(lineTotal)}`, 1, TEXT_YM_ITEM));
    gap(lineGap("4", TEXT_YM_ITEM));
    blank();
  });

  add(tLine(y, 1));
  gap(14);

  // — Total — background hitam, teks putih (highlight, permintaan Denny).
  const totalStartY = y;
  add(tRow(y, "4", isRetur ? "Total Retur" : "Total", `Rp ${formatHarga(sale.total)}`, 1, TEXT_YM_TOTAL));
  gap(lineGap("4", TEXT_YM_TOTAL));
  add(tHighlight(totalStartY, y));
  gap(6);

  add(tLine(y, 1));
  gap(14);

  // — Transfer: satu blok per rekening, masing-masing diberi garis penutup —
  // Label "Transfer" berdiri sendiri (center) DIHAPUS (permintaan Denny
  // 2026-08, terlihat tidak rapi karena beda alignment dgn baris di
  // bawahnya) — nama bank saja sudah cukup menjelaskan bloknya.
  STORE_INFO.rekening.forEach((r) => {
    add(tLeft(MARGIN, y, "3", r.bank, 1, TEXT_YM));
    gap(lineGap("3"));
    add(tLeft(MARGIN, y, "4", r.no, 1, TEXT_YM));
    gap(lineGap("4"));
    add(tLeft(MARGIN, y, "3", `a.n. ${r.atas_nama}`, 1, TEXT_YM));
    gap(lineGap("3"));
    add(tLine(y, 1));
    gap(14);
  });

  // — WA —
  if (STORE_INFO.wa) {
    add(tCenter(y, "3", `WA: ${STORE_INFO.wa}`, 1, TEXT_YM));
    gap(lineGap("3"));
    add(tLine(y, 1));
    gap(14);
  }

  // — Footer: ajakan kunjungi website + ucapan terima kasih —
  if (STORE_INFO.website) {
    const footerLines = wrapText(
      `Kunjungi website untuk melihat katalog lengkap kami: ${STORE_INFO.website}`,
      "3",
    );
    footerLines.forEach((line) => {
      add(tCenter(y, "3", line, 1, TEXT_YM));
      gap(lineGap("3"));
    });
  }

  const thankMsg = isRetur ? "Terima kasih atas retur Anda" : "Terima kasih telah berbelanja!";
  add(tCenter(y, "3", thankMsg, 1, TEXT_YM));
  gap(lineGap("3") + 8);

  // ── Assemble ───────────────────────────────────────────────────────────────
  const heightMm = Math.ceil((y + 8) / 8);
  const tsplHeader = [`SIZE ${paperWidthMm} mm,${heightMm} mm\r\n`, `GAP ${gapMm} mm,0 mm\r\n`, `CLS\r\n`].join(
    "",
  );

  return tsplHeader + cmds.join("") + `PRINT 1,1\r\n`;
}

function generateTspl(sale, labelType = "continuous", paperWidthMm = DEFAULT_PAPER_WIDTH) {
  return new TextEncoder().encode(generateTsplString(sale, labelType, paperWidthMm));
}

// previewTspl() — export publik, dipakai TsplPrintPreview.jsx (tab "Versi B"
// di Struk.jsx) untuk menghasilkan command TSPL mentah yang akan digambar ke
// canvas, TANPA menyentuh Bluetooth sama sekali. Sengaja dibungkus try/catch
// supaya preview tidak pernah melempar error ke komponen (mis. sale tidak lengkap).
export function previewTspl(sale, labelType = "continuous", paperWidthMm = DEFAULT_PAPER_WIDTH) {
  try {
    return generateTsplString(sale, labelType, paperWidthMm);
  } catch (err) {
    return `// Gagal generate preview TSPL: ${err.message || err}`;
  }
}

// ── BLE write (chunked) ──────────────────────────────────────────────────────

async function writeBle(characteristic, data) {
  const CHUNK = 20;
  const canWrite = characteristic.properties?.write ?? false;
  let offset = 0;

  while (offset < data.length) {
    const chunk = data.slice(offset, offset + CHUNK);
    try {
      if (canWrite && characteristic.writeValueWithResponse) {
        await characteristic.writeValueWithResponse(chunk);
      } else if (characteristic.writeValueWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
        if (offset + CHUNK < data.length) await new Promise((r) => setTimeout(r, 50));
      } else {
        await characteristic.writeValue(chunk);
        if (offset + CHUNK < data.length) await new Promise((r) => setTimeout(r, 50));
      }
    } catch {
      await characteristic.writeValue(chunk);
    }
    offset += CHUNK;
  }
}

// ── BLE connect helper ───────────────────────────────────────────────────────
// Langsung ke ff02 tanpa delay — printer BP-TD110BT timeout cepat
// jika kita terlalu lama sebelum mulai kirim data.

async function bleConnect() {
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [FF00_SVC],
  });

  const server = await device.gatt.connect();
  const svc = await server.getPrimaryService(FF00_SVC);
  const char = await svc.getCharacteristic(FF02_CHAR);
  return { server, char };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTsplPrinter() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function printBle(sale, labelType = "continuous", paperWidthMm = DEFAULT_PAPER_WIDTH) {
    if (!navigator.bluetooth) {
      setError(
        "Web Bluetooth tidak tersedia. " +
          "Pastikan: (1) Chrome/Edge, (2) HTTPS, (3) Bluetooth aktif.",
      );
      return false;
    }

    setBusy(true);
    setError(null);
    let server;

    try {
      const bytes = generateTspl(sale, labelType, paperWidthMm);
      console.log(`[TSPL] ${bytes.length} bytes`);

      const conn = await bleConnect();
      server = conn.server;
      console.log("[TSPL BLE] Terhubung via Generic FF00 (ff02)");
      await writeBle(conn.char, bytes);

      return true;
    } catch (err) {
      if (err.name === "NotFoundError") return false;
      setError(err.message || String(err));
      console.error("[TSPL BLE] Error:", err);
      return false;
    } finally {
      try {
        server?.device?.gatt?.disconnect();
      } catch {
        /* ignore */
      }
      setBusy(false);
    }
  }

  return {
    printBle,
    busy,
    error,
    clearError: () => setError(null),
    connecting: busy,
  };
}
