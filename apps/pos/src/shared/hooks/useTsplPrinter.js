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
 * ── DPI: 203 (BUKAN 300 — dicoba lalu di-REVERT 2026-08) ───────────────────
 * Sempat dicoba ganti ke asumsi 300dpi (921 dots utk 78mm) karena diduga itu
 * akar masalah "tidak center"/"space kosong" di foto struk. TERNYATA SALAH —
 * dites cetak fisik oleh Denny, hasilnya konten TERPOTONG di sisi kanan +
 * beberapa baris jadi tumpang-tindih/rusak ("3 pcs x Rp 220.000p 660.000").
 * Ini membuktikan printer fisik Denny MEMANG 203dpi (623 dots @78mm, seperti
 * asumsi ASLI sebelum dicoba-coba) — lebar 921 dots melebihi kapasitas print
 * head yang sesungguhnya, jadi apa pun yang dikirim di luar ~623 dots
 * terpotong/korup. SUDAH DI-REVERT ke 203dpi. Kalau "tidak center" muncul
 * lagi, itu BUKAN soal dpi — kemungkinan besar cuma distorsi foto (kertas
 * struk melengkung/miring saat difoto membuat garis lurus kelihatan miring),
 * bukan bug cetakan yang sesungguhnya.
 *
 * ── Pilihan lebar kertas ──────────────────────────────────────────────────
 * Bisa dipilih user via PAPER_WIDTHS di bawah — "78" (default sejak
 * 2026-08, keputusan Denny) atau "100" (dots TIDAK berubah, sudah divalidasi
 * lewat cetakan fisik berkali-kali).
 */

import { useState } from "react";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { formatHarga } from "@deera/shared/lib/constants";
import { effectiveQty, formatStrukDateTime } from "../lib/salesUtils";

// ── Konstanta layout ─────────────────────────────────────────────────────────
// 100 mm @ 203 DPI = ~800 dots — SUDAH divalidasi lewat cetakan fisik
// berkali-kali (lihat catatan dpi di atas — 300dpi sempat dicoba, terbukti
// SALAH lewat tes cetak nyata, sudah direvert).
const MARGIN = 20;

// Pilihan lebar kertas — key adalah nilai mm yang dikirim apa adanya ke
// command TSPL `SIZE {mm} mm,...`. "78" = default (2026-08), "100" = opsi
// lama (dots TIDAK berubah).
export const PAPER_WIDTHS = {
  100: { label: "100mm", dots: 800 },
  78: { label: "78mm (Bawaan)", dots: 623 },
};
const DEFAULT_PAPER_WIDTH = "78";

// Dimensi built-in TSPL fonts (fixed-width per char).
//
// ── LEBAR (w) DIKALIBRASI ULANG dari cetakan fisik (2026-08) ───────────────
// Angka lama (12/16/24 dot/char) itu TEBAKAN dari tabel "nominal cell size"
// TSPL generik — printer clone Denny (BP-TD110BT) TIDAK ada dokumentasi
// resmi lebar font aslinya, jadi tebakan itu tidak pernah divalidasi ke
// hardware. Efeknya: teks rata-kanan/center dihitung terlalu lebar dari
// aslinya → selalu berhenti SEBELUM tepi kanan sungguhan (space kosong di
// kanan, "space-between" terlihat tidak penuh) DAN preview (canvas, pakai
// FONT yang SAMA) jadi tidak match hasil cetak asli.
//
// Dikalibrasi ulang Denny 2026-08: ukur pakai penggaris fisik, teks
// "Rp 1.840.000" (12 karakter, font "4", ym=2) panjangnya ~18-20mm di
// kertas asli — BUKAN ~36mm seperti dihitung dari w=24 lama. w=13
// (≈19mm ÷ 12 char × 7,99 dot/mm) dipakai sbg font "4", lalu "2"/"3"
// SEMPAT diturunkan proporsional dari rasio yang sama (w_baru/w_lama ≈
// 0,54) → font "2" jadi w=7, font "3" jadi w=9.
//
// KOREKSI SUSULAN font "2" (2026-08, lanjutan — blok ajakan katalog multi-
// baris center-aligned terlihat "zigzag"/tidak center horizontal): w=7 hasil
// turunan proporsional TERBUKTI SALAH — Denny ukur langsung fisik baris
// "Kunjungi website" (16 karakter, font "2", xm=1) = 19mm, jauh lebih lebar
// dari perkiraan lama (16×7=112 dot ≈ 14mm). w BARU = round(19mm ÷ 16 char ×
// 7,99 dot/mm) = 9 — kebetulan PERSIS sama dgn font "3" (kemungkinan
// printer clone Denny cuma punya sedikit ukuran lebar font fisik berbeda,
// tidak linear turun sehalus yang diasumsikan dulu). Font "3" & "4" TIDAK
// diubah di sini — "4" sudah diukur langsung (bukan turunan) & terbukti
// akurat; "3" masih turunan proporsional yang SAMA seperti "2" dulu, jadi
// KEMUNGKINAN juga meleset, tapi belum ada pengukuran fisik baru utk "3"
// secara spesifik — kalau blok ajakan katalog (yg pakai font "3" di baris
// "deera.id") masih terlihat tidak center setelah fix ini, ukur baris itu
// fisik & lapor supaya font "3" bisa dikalibrasi ulang juga (JANGAN
// ekstrapolasi w="3" tanpa pengukuran — font "3" dipakai di banyak tempat
// lain termasuk fitsOneRow() qty×harga, blast radius-nya besar kalau salah
// tebak lagi).
//
// TINGGI (h) TIDAK berubah — itu dikontrol via ym (TEXT_YM dkk), sudah
// divalidasi terpisah lewat cetakan fisik & tidak ada masalah di situ.
//
// Diexport supaya TsplPrintPreview.jsx (canvas preview visual struk) bisa
// pakai metrik yang SAMA PERSIS dengan yang dipakai generateTsplString() saat
// menghitung posisi x/y — supaya preview akurat, bukan cuma tebak-tebakan.
export const FONT = {
  2: { w: 9, h: 20 },
  3: { w: 9, h: 24 },
  4: { w: 13, h: 32 },
};

// BLE service FF00 — hanya ff02 yang write
const FF00_SVC = "0000ff00-0000-1000-8000-00805f9b34fb";
const FF02_CHAR = "0000ff02-0000-1000-8000-00805f9b34fb";

// Kertas fisik "Putus (per struk)" Denny: 100mm × 150mm per label, gap 2mm
// (dikonfirmasi Denny 2026-08 — dulu ditebak gapMm=3, salah). heightMm FIXED
// di sini (150) — SENGAJA TIDAK dihitung dari panjang konten seperti mode
// continuous (lihat generateTsplString() di bawah), karena kertas ini
// pre-cut di jarak TETAP: kalau kita kirim SIZE height yang lebih besar dari
// 150mm (dulu dihitung dinamis dari konten, bisa jauh lebih panjang), printer
// & kertas jadi TIDAK SINKRON — hasil cetak terpotong di titik acak / jadi
// 2-3 halaman berantakan (keluhan Denny). Dengan height FIXED=150mm, titik
// potong cetakan selalu sinkron dengan gap fisik kertas yang sesungguhnya.
export const LABEL_TYPES = {
  continuous: { label: "Kontinu (roll terus)", gapMm: 0 },
  gapped: { label: "Putus (per struk)", gapMm: 2, heightMm: 150 },
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

  // Teks rata-kanan berdiri sendiri — dipakai sbg FALLBACK utk baris
  // qty×harga + total per-item kalau keduanya ternyata TIDAK muat 1 baris
  // tanpa tabrakan (lihat fitsOneRow() & pemakaiannya di BLOK Items).
  function tRight(y, f, text, xm = 1, ym = 1) {
    const charW = FONT[f].w * xm;
    const x = W_DOT - MARGIN - text.length * charW;
    return `TEXT ${Math.max(MARGIN, x)},${y},"${f}",0,${xm},${ym},"${text}"\r\n`;
  }

  // Cek apakah leftText (mulai dari MARGIN) & rightText (rata-kanan) muat
  // dalam 1 baris TANPA saling tabrakan, dgn jarak aman minimal `gapDots` di
  // antaranya. Dipakai supaya baris qty×harga+total per-item BISA digabung 1
  // baris (permintaan Denny 2026-08, "harga dibuat 1 baris") untuk nominal
  // yang muat, tapi otomatis fallback ke 2 baris kalau nominalnya kepanjangan
  // (mis. qty 2 digit / harga besar) — supaya TIDAK PERNAH tabrakan/tumpang
  // tindih di hasil cetak, apa pun isinya.
  function fitsOneRow(leftFont, leftText, rightFont, rightText, xm = 1, gapDots = 12) {
    const leftEndX = MARGIN + FONT[leftFont].w * xm * leftText.length;
    const rightStartX = W_DOT - MARGIN - FONT[rightFont].w * xm * rightText.length;
    return leftEndX + gapDots <= rightStartX;
  }

  // Garis penuh dari tepi ke tepi
  function tLine(y, h = 2) {
    return `BAR 0,${y},${W_DOT},${h}\r\n`;
  }

  // Garis TEGAK (vertikal) dari y1 ke y2 di posisi x — dipakai sbg pemisah
  // kolom kiri/kanan (mis. blok 2 rekening berdampingan, permintaan Denny
  // 2026-08 "2 kolom dengan batas dibagian tengahnya"). BAR TSPL sama utk
  // horizontal & vertikal — cuma beda w (lebar, kecil) vs h (tinggi, besar).
  function vLine(x, y1, y2, w = 2) {
    return `BAR ${x},${y1},${w},${y2 - y1}\r\n`;
  }

  // Highlight "background hitam, teks putih" (teknik REVERSE: gambar TEXT
  // dulu spt biasa, lalu REVERSE area yang sama supaya kebalik jadi putih
  // di atas hitam) — SEKARANG hanya dipakai utk baris Total (brand DEERA
  // sudah TIDAK pakai background hitam lagi, permintaan Denny 2026-08
  // "DEERA aja tapi besar dan tanpa background hitam juga").
  function tHighlight(startY, endY, pad = 6) {
    return `REVERSE 0,${startY - pad},${W_DOT},${endY - startY + pad * 2}\r\n`;
  }

  // Baris kiri dgn 2 segmen font BERBEDA (label kecil menempel ke value besar
  // di kanannya, TIDAK rata-kanan spt tRowMixed) — dipakai utk baris
  // "Yth. NAMA" dan "BCA 2060425542" di redesign padat 2026-08, supaya info
  // penting (nama pembeli/no rekening) tetap besar TAPI tidak butuh baris
  // sendiri utk labelnya.
  function tLeftMixed(x, y, labelFont, label, valueFont, value, xm = 1, ym = 1) {
    const labelW = FONT[labelFont].w * xm * (label.length + 1); // +1 = spasi
    return (
      `TEXT ${x},${y},"${labelFont}",0,${xm},${ym},"${label}"\r\n` +
      `TEXT ${x + labelW},${y},"${valueFont}",0,${xm},${ym},"${value}"\r\n`
    );
  }

  const isRetur = sale.type === "retur";
  // Tukar Tambah (permintaan Denny 2026-09) — items berisi GABUNGAN item
  // beli baru (isRetur:false) & item retur (isRetur:true), lihat catatan di
  // StrukContent.jsx utk kenapa total dihitung dari field eksplisit
  // (saleSubtotal/returTotal/total), bukan sum ulang tanda +/- di sini.
  const isTukarTambah = sale.type === "tukar_tambah";
  const netTotal = sale.total ?? 0;
  const isRefundToBuyer = isTukarTambah && netTotal < 0;
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
  // ym=3/4 utk item & Total (permintaan Denny sebelumnya) ternyata KETERLALUAN
  // pas dicetak fisik ("terlalu besar") — diturunkan lagi 2026-08. List
  // pembelian (kode/ukuran, qty×harga, total per item) & nama pembeli
  // kembali ke ym=2 (sama seperti teks umum, TIDAK ada emphasis ekstra lagi
  // — sudah lumayan besar). Grand Total tetap SATU tingkat lebih besar
  // (ym=3, bukan 4) supaya masih paling menonjol (dibantu jg oleh highlight
  // REVERSE hitam-putih yg sudah ada), tanpa bikin tinggi struk membengkak.
  // xm TIDAK ikut berubah (tetap 1) — cuma ym yang naik/turun, lebar baris
  // (tCenter/tRow/tRowMixed/tRight, yg cuma pakai `.w * xm`) tidak terpengaruh.
  const TEXT_YM_ITEM = 2;
  const TEXT_YM_TOTAL = 3;
  // Konstanta spasi — DIPADATKAN (redesign 2026-08, "professional & clean,
  // hemat kertas, sebisa mungkin 1 halaman"). Ukuran FONT/ym TIDAK ikut
  // dikecilkan (itu bagian yang harus tetap kebaca jelas) — penghematan
  // murni datang dari jarak antar baris & baris/section yang tidak esensial
  // dihapus, BUKAN dari mengecilkan teks.
  // LINE_PAD/DIVIDER_GAP dipadatkan LAGI 2026-08 (foto struk fisik asli
  // Denny menunjukkan masih banyak jarak vertikal kosong yang tidak
  // dimanfaatkan — 3 item + 2 rekening tercetak 170mm di kertas 78mm).
  const LINE_PAD = 2; // dulu 4 (sebelumnya 8)
  const DIVIDER_GAP = 4; // dulu 6 (sebelumnya 14)
  function lineGap(font, ym = TEXT_YM, pad = LINE_PAD) {
    return FONT[font].h * ym + pad;
  }

  let cmds = [];
  let y = 0;
  const add = (str) => cmds.push(str);
  const gap = (px) => {
    y += px;
  };

  // ── Multi-halaman utk kertas "gapped" (pre-cut, gap tetap) ────────────────
  // Kertas fisik Denny: 100×150mm per label, gap 2mm (LABEL_TYPES.gapped).
  // Kalau konten struk lebih panjang dari 1 label (150mm), di-split OTOMATIS
  // jadi beberapa blok SIZE/GAP/CLS/…/PRINT berurutan — masing-masing blok
  // = 1 label fisik yang lengkap & valid, printer lanjut otomatis ke label
  // berikutnya (sensor gap fisik). pageBreak() SELALU dipanggil di AWAL tiap
  // item/rekening/section (lihat titik panggilnya di bawah) — TIDAK PERNAH
  // di tengah satu item/blok, supaya tidak ada highlight/baris yang terpotong
  // separuh di 2 halaman berbeda. Mode "continuous" tidak terpengaruh sama
  // sekali (pageBreak() no-op kalau labelType !== "gapped").
  const DOTS_PER_MM = 8; // 203dpi ≈ 7,99 dots/mm — pola pembulatan sama spt PAPER_WIDTHS
  const GAPPED_PAGE_HEIGHT_DOTS = (LABEL_TYPES.gapped.heightMm ?? 150) * DOTS_PER_MM;
  const PAGE_BOTTOM_MARGIN_DOTS = 40; // jarak aman dari tepi bawah label sblm dianggap "penuh"
  const pages = [];
  function pageBreak() {
    if (labelType !== "gapped") return;
    if (y <= GAPPED_PAGE_HEIGHT_DOTS - PAGE_BOTTOM_MARGIN_DOTS) return;
    pages.push(cmds);
    cmds = [];
    y = 0;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Desain "Versi B" (preview cetak / TSPL asli) — REDESIGN 2026-08:
  // "professional & clean, hemat kertas, sebisa mungkin 1 halaman", tapi
  // teks TETAP besar & jelas (permintaan Denny). Dipadatkan dari desain
  // sebelumnya dengan cara: (1) hapus baris/label yang tidak esensial (mis.
  // "Yth." kosong tanpa nama, "Staff:"/"Lokasi:" jadi 2 baris terpisah), (2)
  // gabung label+value jadi 1 baris via tLeftMixed() di beberapa tempat
  // (Yth./nama, bank/no rekening), (3) hapus spacer blank() yang murni
  // dekoratif, (4) footer dipersingkat jadi 1 baris (bukan kalimat panjang
  // yang wrap 2 baris). FONT/ym TIDAK dikecilkan sama sekali — penghematan
  // murni dari spasi, bukan dari mengecilkan teks. Urutan tetap sama:
  //   Judul → Tanggal → garis → DEERA → garis → Yth./nama +
  //   Staff-Lokasi → garis → Items → garis → Total → garis →
  //   Transfer (per rekening) → garis → Ajakan website/IG → garis → WA →
  //   Footer
  // ════════════════════════════════════════════════════════════════════════════

  gap(10); // margin atas — dipadatkan dari 48

  // — Judul + tanggal —
  add(
    tCenter(
      y,
      "4",
      isTukarTambah ? "Struk Tukar Tambah" : isRetur ? "Struk Retur" : "Struk Pembelian",
      1,
      TEXT_YM,
    ),
  );
  gap(lineGap("4"));
  add(tCenter(y, "3", formatStrukDateTime(sale.created_at), 1, TEXT_YM));
  gap(lineGap("3"));

  add(tLine(y, 1));
  gap(DIVIDER_GAP);

  // — Brand: "DEERA" polos, BESAR, TANPA background hitam (permintaan Denny
  // 2026-08 lanjutan "DEERA Graceful Elegance nya dijadiin DEERA aja tapi
  // besar dan tanpa background hitam juga"). Riwayat singkat: "DEERA"
  // polos kecil → letter-spacing "D E E R A" + garis ornamen + tagline +
  // bingkai emblem + REVERSE (disukai) → dicoba logo asli bitmap
  // (berkali-kali, "gak terlihat" bagus) → balik ke teks+bingkai+REVERSE
  // → SEKARANG disederhanakan lagi: cuma "DEERA" polos (bukan letter-
  // spaced), font besar (ym setara Total), TANPA tagline/ornamen/bingkai/
  // background hitam — pakai tCenter() spy otomatis center scr horizontal.
  //
  // Vertical centering (permintaan Denny 2026-08 lanjutan, diukur fisik pakai
  // penggaris "tinggi garis line antara text deera atas dan bawah itu 13mm,
  // text DEERA nya tidak tengah verticalnya"): jarak antar 2 garis divider di
  // atas & bawah "DEERA" TETAP ~13mm/~102 dot (BRAND_PAD*2 + tinggi teks =
  // 3+96+3 = 102, PERSIS sama dgn sebelumnya 4+96+2 = 102 — jadi posisi
  // section2 setelahnya TIDAK bergeser), tapi padding SEKARANG SIMETRIS
  // (BRAND_PAD dot di kedua sisi, dulu asimetris: 4 dot di atas [DIVIDER_GAP]
  // vs cuma 2 dot di bawah [LINE_PAD default lineGap()]) — supaya blok teks
  // "DEERA" benar2 center di tengah gap, bukan nempel ke divider atas.
  const BRAND_PAD = 3;
  add(tCenter(y, "4", "DEERA", 1, TEXT_YM_TOTAL));
  gap(lineGap("4", TEXT_YM_TOTAL, BRAND_PAD));

  add(tLine(y, 1));
  // Blok info pembeli (Yth./Staff-Lokasi) diberi padding LEBIH LEBAR dari
  // divider di atas & bawahnya (permintaan Denny 2026-08 lanjutan, diukur
  // fisik pakai penggaris "tinggi bar Yth nama pembeli dan staff lokasi itu
  // 11mm, itu juga terlalu mepet garis textnya") — dulu cuma DIVIDER_GAP=4
  // dot di atas & LINE_PAD=2 dot di bawah (nyaris nempel ke garis), sekarang
  // INFO_PAD=10 dot di kedua sisi supaya ada jarak napas yg jelas dari garis
  // pembatas.
  const INFO_PAD = 10;
  gap(INFO_PAD);

  // — Info pembeli & transaksi — dipadatkan jadi maks 2 baris (dulu bisa 4
  // baris + 1 divider internal). Baris "Yth." DIHAPUS SAMA SEKALI kalau
  // buyer_name kosong (dulu tetap tampil "Yth." tanpa nama, buang 1 baris
  // percuma — kasus umum utk pembeli walk-in tanpa nama terdaftar).
  if (sale.buyer_name) {
    add(tLeftMixed(MARGIN, y, "3", "Yth.", "4", sale.buyer_name.toUpperCase(), 1, TEXT_YM_ITEM));
    gap(lineGap("4", TEXT_YM_ITEM));
  }
  // Label "Staff:"/"Lokasi:" ditambahkan eksplisit (permintaan Denny
  // 2026-08 lanjutan — sebelumnya cuma nilai polos tanpa label, kurang
  // jelas). Font DIKECILIN ke "2" (paling kecil, ym=1, dulu font "3" ym=2)
  // SENGAJA — supaya baris ini jadi jelas info sekunder & nama pembeli
  // (Yth. .../di atas, font "4") tetap yang paling menonjol di mata.
  // "·" (middle dot) TIDAK dipakai lagi sbg pemisah — font bawaan printer
  // TSPL tidak punya glyph utk karakter itu, hasil cetak fisik jadi garbled
  // ("TT"/kotak, terkonfirmasi dari foto struk asli Denny 2026-08). Pakai
  // " - " (ASCII biasa) supaya PASTI kebaca di printer manapun.
  add(
    tLeft(
      MARGIN,
      y,
      "2",
      `Staff: ${sale.created_by_name?.toUpperCase() ?? "-"}  -  Lokasi: ${locLabel}`,
      1,
      1,
    ),
  );
  gap(lineGap("2", 1, INFO_PAD));

  add(tLine(y, 1));
  gap(DIVIDER_GAP);

  // — Items: kode-ukuran (bold) + baris qty×harga+total gaya "space-between"
  // (qty×harga rata-kiri, total rata-kanan — sama spt CSS justify-content:
  // space-between, permintaan Denny 2026-08 lanjutan "space kosong bisa
  // terisi"). qty×harga font "3" (UKURAN ASLI — sempat dikecilin ke "2"
  // tapi itu bukan akar masalahnya, lihat kalibrasi FONT.w di atas file:
  // dengan lebar font yang SUDAH DIKALIBRASI dari pengukuran fisik, font
  // "3" pun muat nyaman 1 baris tanpa perlu dikecilin). Total tetap besar
  // & menonjol di font "4". fitsOneRow() TETAP jadi pengaman WAJIB (bukan
  // opsional) — digabung paksa tanpa cek lebar terbukti bisa tabrakan di
  // kertas fisik (kejadian nyata, lihat catatan revert dpi di atas file),
  // jadi utk nominal yang tetap kepanjangan (qty/harga ekstrem), otomatis
  // fallback ke 2 baris.
  items.forEach((item, idx) => {
    pageBreak();
    const qty = effectiveQty(item);
    const lineTotal = qty * item.harga;
    const kode = (item.kode ?? "").toUpperCase();
    const size = (item.size ?? "").toUpperCase();
    const qtyText = `   ${qty} pcs x Rp ${formatHarga(item.harga)}`;
    const totalText = item.isRetur ? `- Rp ${formatHarga(lineTotal)}` : `Rp ${formatHarga(lineTotal)}`;
    // Permintaan Denny 2026-09: item retur ditulis "(RETUR)" nempel di
    // belakang nama item (bukan prefix "RETUR - " terpisah di depan) — sama
    // spt StrukContent.jsx.
    const label = item.isRetur
      ? `${idx + 1}. ${kode} - ${size} (RETUR)`
      : `${idx + 1}. ${kode} - ${size}`;

    add(tLeft(MARGIN, y, "4", label, 1, TEXT_YM_ITEM));
    gap(lineGap("4", TEXT_YM_ITEM));

    if (fitsOneRow("3", qtyText, "4", totalText, 1)) {
      add(tRowMixed(y, "3", qtyText, "4", totalText, 1, TEXT_YM_ITEM));
      gap(lineGap("4", TEXT_YM_ITEM));
    } else {
      add(tLeft(MARGIN, y, "3", qtyText, 1, TEXT_YM_ITEM));
      gap(lineGap("3", TEXT_YM_ITEM));
      add(tRight(y, "4", totalText, 1, TEXT_YM_ITEM));
      gap(lineGap("4", TEXT_YM_ITEM));
    }
  });

  pageBreak();
  add(tLine(y, 1));
  gap(DIVIDER_GAP);

  // — Tukar Tambah (permintaan Denny 2026-09): breakdown Subtotal Beli Baru /
  // Diskon / Retur SEBELUM baris Total ter-highlight — sama spt StrukContent.jsx,
  // dihitung dari field eksplisit (bukan sum ulang tanda +/- item di atas).
  if (isTukarTambah) {
    // Permintaan Denny 2026-09: label "Subtotal" polos (bukan "Subtotal Baru").
    add(tRow(y, "3", "Subtotal", `Rp ${formatHarga(sale.saleSubtotal ?? 0)}`, 1, TEXT_YM));
    gap(lineGap("3", TEXT_YM));
    if ((sale.discount ?? 0) > 0) {
      add(tRow(y, "3", "Diskon", `- Rp ${formatHarga(sale.discount)}`, 1, TEXT_YM));
      gap(lineGap("3", TEXT_YM));
    }
    add(tRow(y, "3", "Retur", `- Rp ${formatHarga(sale.returTotal ?? 0)}`, 1, TEXT_YM));
    gap(lineGap("3", TEXT_YM));
  }

  // — Total — background hitam, teks putih (highlight, permintaan Denny).
  // Tukar Tambah: netTotal bisa negatif (toko kembalikan uang ke pembeli) —
  // ditampilkan sbg "Uang Kembali" dgn nilai absolut, sama spt StrukContent.jsx.
  // Permintaan Denny 2026-09: label tetap "Total" polos utk Tukar Tambah
  // (bukan "Total Bersih") — sama spt StrukContent.jsx.
  const totalLabel = isRefundToBuyer ? "Uang Kembali" : isRetur ? "Total Retur" : "Total";
  const totalStartY = y;
  add(tRow(y, "4", totalLabel, `Rp ${formatHarga(Math.abs(netTotal))}`, 1, TEXT_YM_TOTAL));
  gap(lineGap("4", TEXT_YM_TOTAL));
  add(tHighlight(totalStartY, y, 3));
  gap(3);

  add(tLine(y, 1));
  gap(DIVIDER_GAP);

  // — Transfer: grid 2 KOLOM (redesign 2026-08 lanjutan — permintaan Denny
  // "2 baris, tapi 2 kolom dengan batas dibagian tengahnya"). Tiap PASANGAN
  // rekening dicetak berdampingan: baris atas = no rekening kiri & kanan,
  // baris bawah = nama pemilik kiri & kanan (SEJAJAR dgn no rekening di
  // atasnya — jadi TIDAK ambigu, beda dari desain sebelumnya yg sempat
  // menumpuk no lalu nama berurutan tanpa kolom). Garis vertikal (vLine)
  // memisah kolom kiri/kanan spy jelas 2 rekening yg berbeda. Kalau jumlah
  // rekening GANJIL, entry terakhir yg tidak berpasangan dicetak full-width
  // (no+nama 1 baris gabung, tanpa kolom/garis vertikal — tidak ada pasangan
  // utk dibagi).
  if (STORE_INFO.rekening.length > 0) {
    pageBreak();
    const rekening = STORE_INFO.rekening;
    const midX = Math.floor(W_DOT / 2);
    const colGap = 10; // jarak dari garis tengah ke awal kolom kanan
    for (let i = 0; i < rekening.length; i += 2) {
      const left = rekening[i];
      const right = rekening[i + 1];
      pageBreak();
      if (right) {
        const blockTopY = y;
        add(tLeft(MARGIN, y, "3", `${left.bank} ${left.no}`, 1, TEXT_YM));
        add(tLeft(midX + colGap, y, "3", `${right.bank} ${right.no}`, 1, TEXT_YM));
        gap(lineGap("3"));
        add(tLeft(MARGIN, y, "2", `a.n. ${left.atas_nama}`, 1, TEXT_YM));
        add(tLeft(midX + colGap, y, "2", `a.n. ${right.atas_nama}`, 1, TEXT_YM));
        gap(lineGap("2"));
        add(vLine(midX, blockTopY - 4, y - 4));
      } else {
        // Entry ganjil terakhir — full-width, no+nama 1 baris gabung spt
        // sebelumnya (tLeftMixed), tanpa kolom/garis vertikal.
        add(tLeftMixed(MARGIN, y, "3", `${left.bank} ${left.no}`, "2", `a.n. ${left.atas_nama}`, 1, TEXT_YM));
        gap(lineGap("3"));
      }
    }

    add(tLine(y, 1));
    gap(DIVIDER_GAP);
  }

  // — Ajakan lihat katalog: TEKS POLOS, TANPA QR bitmap (permintaan Denny
  // 2026-08 lanjutan "gausah pake barcode deh, text aja, kunjungi website
  // deera.id buat lihat katalog lengkap, terus instagram @deeraindonesia,
  // whatsapp, sama terimakasih aja") — riwayat: sempat pakai QR bitmap asli
  // (dari public/qr-katalog.svg via QR_KATALOG di logoBitmaps.js, macam2
  // teknik polaritas dicoba), TAPI Denny minta dihapus total & diganti
  // ajakan teks murni ke website. WA & ucapan terima kasih TETAP di footer
  // seperti sebelumnya (tidak dipindah/diduplikasi ke sini).
  //
  // Permintaan Denny 2026-08 lanjutan (diukur fisik pakai penggaris "tinggi
  // line atas ke bawah 18mm ... bagian ini masih tidak center"): (1) "Kunjungi
  // website" DIKECILIN ke font "2"/ym=1 — DISAMAKAN dgn ukuran "untuk lihat
  // katalog lengkap" (dulu font "3"/ym=2, lebih besar — 'dibuat sama aja
  // sizenya'), (2) "untuk lihat katalog lengkap" DIPECAH jadi 2 baris ("untuk
  // lihat" / "katalog lengkap", 1 baris kepanjangan — 'dibuat 2 baris aja'),
  // (3) padding ATAS & BAWAH blok ini SEKARANG SIMETRIS (AJAKAN_PAD dot di
  // kedua sisi, dulu asimetris: cuma DIVIDER_GAP=4 dot di atas vs LINE_PAD=2
  // dot di bawah) — supaya blok teks benar2 center di antara 2 garis divider,
  // sama spt fix serupa di brand "DEERA" & blok Yth./Staff-Lokasi di atas.
  const AJAKAN_PAD = 10;
  pageBreak();
  gap(AJAKAN_PAD - DIVIDER_GAP); // koreksi top padding (DIVIDER_GAP sudah ditambahkan oleh divider penutup rekening di atas) jadi AJAKAN_PAD
  add(tCenter(y, "2", "Kunjungi website", 1, 1));
  gap(lineGap("2", 1));
  if (STORE_INFO.website) {
    add(tCenter(y, "3", STORE_INFO.website, 1, TEXT_YM));
    gap(lineGap("3"));
  }
  add(tCenter(y, "2", "untuk lihat", 1, 1));
  gap(lineGap("2", 1));
  add(tCenter(y, "2", "katalog lengkap", 1, 1));
  gap(lineGap("2", 1, STORE_INFO.instagram ? undefined : AJAKAN_PAD));
  if (STORE_INFO.instagram) {
    add(tCenter(y, "2", STORE_INFO.instagram, 1, 1));
    gap(lineGap("2", 1, AJAKAN_PAD));
  }

  add(tLine(y, 1));
  gap(DIVIDER_GAP);

  // — Footer: WA + ucapan terima kasih. `website` DIHAPUS dari baris ini
  // (permintaan Denny 2026-08 lanjutan "tambahin juga qr katalog, buat
  // mirip dengan versi A") — sekarang sudah tampil di section QR katalog
  // di atas, jadi tidak perlu duplikat lagi di footer (sama spt Versi A/
  // StrukContent.jsx yang footernya cuma "WA: ...", website ada di blok QR).
  const contactParts = [];
  if (STORE_INFO.wa) contactParts.push(`WA ${STORE_INFO.wa}`);
  if (contactParts.length > 0) {
    pageBreak();
    // " - " (bukan "·") — lihat catatan di baris Staff/Lokasi di atas.
    add(tCenter(y, "3", contactParts.join("  -  "), 1, TEXT_YM));
    gap(lineGap("3"));
  }

  pageBreak();
  // Permintaan Denny 2026-09: footer Tukar Tambah cukup generik "Terima
  // kasih atas transaksi Anda!" (tanpa sebut "tukar tambah") — sama spt
  // StrukContent.jsx.
  const thankMsg = isTukarTambah
    ? "Terima kasih atas transaksi Anda!"
    : isRetur
      ? "Terima kasih atas retur Anda"
      : "Terima kasih telah berbelanja!";
  add(tCenter(y, "3", thankMsg, 1, TEXT_YM));
  gap(lineGap("3"));

  // Selesaikan halaman TERAKHIR (utk continuous, ini satu-satunya halaman).
  pages.push(cmds);

  // ── Assemble ───────────────────────────────────────────────────────────────
  if (labelType === "gapped") {
    // Kertas fisik pre-cut (100×150mm, gap 2mm) — SETIAP halaman WAJIB pakai
    // height FIXED 150mm (LABEL_TYPES.gapped), bukan dihitung dari konten.
    // Kalau konten struk lebih panjang dari 1 label, sudah di-split otomatis
    // (lihat pageBreak() di atas) jadi beberapa blok SIZE/GAP/CLS/…/PRINT
    // berurutan — masing-masing = 1 label fisik yang lengkap & valid, printer
    // lanjut otomatis ke label berikutnya via sensor gap. Sebelumnya SATU
    // PRINT job dgn SIZE height dihitung dari total konten (bisa jauh
    // >150mm) → tidak sinkron dgn gap fisik kertas, hasil cetak terpotong
    // acak/berantakan (keluhan Denny 2026-08).
    const fixedHeightMm = LABEL_TYPES.gapped.heightMm;
    const header = [`SIZE ${paperWidthMm} mm,${fixedHeightMm} mm\r\n`, `GAP ${gapMm} mm,0 mm\r\n`, `CLS\r\n`].join(
      "",
    );
    return pages.map((pageCmds) => header + pageCmds.join("") + `PRINT 1,1\r\n`).join("");
  }

  // Mode "continuous" (roll terus): SATU halaman, height dihitung DINAMIS
  // dari panjang konten (y) — benar utk roll tanpa gap fisik, printer cuma
  // potong sesuai command PRINT. pages[0] === seluruh cmds (pageBreak() no-op
  // di mode ini, tidak pernah split).
  const heightMm = Math.ceil((y + 8) / 8);
  const tsplHeader = [`SIZE ${paperWidthMm} mm,${heightMm} mm\r\n`, `GAP ${gapMm} mm,0 mm\r\n`, `CLS\r\n`].join(
    "",
  );

  return tsplHeader + pages[0].join("") + `PRINT 1,1\r\n`;
}

// Konversi "binary string" (tiap code unit = 1 byte, 0-255 — mis. hasil
// atob(), ATAU string ASCII biasa) jadi Uint8Array LEWAT charCodeAt,
// BUKAN TextEncoder(). WAJIB dipakai (bukan TextEncoder) sejak bitmap logo
// asli ditambahkan (2026-08) — TextEncoder meng-encode string sbg UTF-8,
// yg memecah byte manapun >=128 (SANGAT umum muncul di data bitmap) jadi
// 2+ byte, MERUSAK data biner yg dikirim ke printer fisik. charCodeAt aman
// krn SELURUH command TSPL kita (teks ASCII 7-bit + data bitmap 0-255)
// sudah 1 code unit = 1 byte, tidak pernah butuh UTF-8 sama sekali.
function binaryStringToBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

// Diekspor (bukan cuma dipakai internal oleh printBle) SUPAYA test bisa
// memverifikasi LANGSUNG bahwa jalur biner asli (yg benar2 dikirim ke
// printer via BLE) memang byte-safe utk data bitmap — bukan cuma
// memverifikasi previewTspl() (string, TIDAK pernah lewat konversi ini).
export function generateTspl(sale, labelType = "continuous", paperWidthMm = DEFAULT_PAPER_WIDTH) {
  return binaryStringToBytes(generateTsplString(sale, labelType, paperWidthMm));
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
