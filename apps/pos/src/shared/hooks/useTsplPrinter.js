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
 */

import { useState } from "react";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { formatHarga } from "@deera/shared/lib/constants";

// ── Konstanta layout ─────────────────────────────────────────────────────────
// 100 mm @ 203 DPI = ~800 dots
const W_DOT = 800;
const MARGIN = 20;

// Dimensi built-in TSPL fonts (fixed-width per char, approx)
// Font "2" = 12×20 | "3" = 16×24 | "4" = 24×32
const FONT = {
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

// ── Helper ───────────────────────────────────────────────────────────────────

function effectiveQty(item) {
  return item.warna ? item.warna.reduce((s, w) => s + w.qty, 0) : (item.qty ?? 0);
}

function formatDt(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── TSPL builder helpers ─────────────────────────────────────────────────────

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
  const charW = FONT[f].w * xm;
  const rightX = W_DOT - MARGIN - rightText.length * charW;
  return (
    `TEXT ${MARGIN},${y},"${f}",0,${xm},${ym},"${leftText}"\r\n` +
    `TEXT ${Math.max(MARGIN, rightX)},${y},"${f}",0,${xm},${ym},"${rightText}"\r\n`
  );
}

// Garis penuh dari tepi ke tepi
function tLine(y, h = 2) {
  return `BAR 0,${y},${W_DOT},${h}\r\n`;
}

// Garis dengan margin
function tBar(y, h = 2) {
  return `BAR ${MARGIN},${y},${W_DOT - MARGIN * 2},${h}\r\n`;
}

// Double line — untuk pemisah section penting
function tDoubleLine(y) {
  return `BAR 0,${y},${W_DOT},2\r\nBAR 0,${y + 5},${W_DOT},2\r\n`;
}

// ── TSPL receipt generator ───────────────────────────────────────────────────

function generateTspl(sale, labelType = "continuous") {
  const isRetur = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "-";
  const discount = sale.discount ?? 0;
  const items = sale.items ?? [];
  const subtotal = items.reduce((s, item) => s + effectiveQty(item) * item.harga, 0);
  const gapMm = LABEL_TYPES[labelType]?.gapMm ?? 0;

  const cmds = [];
  let y = 0;
  const add = (str) => cmds.push(str);
  const gap = (px) => {
    y += px;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // BLOK 1 — Brand header (inverted: teks putih di atas blok hitam)
  // Teknik: TEXT dulu → REVERSE area yang sama → teks jadi putih
  // DEERA + tagline keduanya dalam satu blok hitam
  // ════════════════════════════════════════════════════════════════════════════
  //   y=8  : "DEERA" font "2" xm=4 ym=2 → charW=48, charH=40 (font "2" terbukti center)
  //   y=56 : tagline font "2" xm=1 ym=1 → h=20
  //   total blok = 8 + 40 + 8 + 20 + 8 = 84
  const HDR_H = 84;

  add(tCenter(8, "2", "DEERA", 4, 2));
  if (STORE_INFO.tagline) {
    add(tCenter(56, "2", STORE_INFO.tagline));
  }
  add(`REVERSE 0,0,${W_DOT},${HDR_H}\r\n`);
  gap(HDR_H);

  // ════════════════════════════════════════════════════════════════════════════
  // BLOK 2 — Tipe struk
  // ════════════════════════════════════════════════════════════════════════════
  gap(8);

  // Label tipe struk — sedikit lebih kecil, centered
  const typeLabel = isRetur ? "[ STRUK RETUR ]" : "[ STRUK PEMBELIAN ]";
  add(tCenter(y, "2", typeLabel));
  gap(26);

  add(tLine(y, 3));
  gap(10);

  // ════════════════════════════════════════════════════════════════════════════
  // BLOK 3 — Info transaksi
  // ════════════════════════════════════════════════════════════════════════════
  add(tLeft(MARGIN, y, "2", formatDt(sale.created_at)));
  gap(26);

  // Pembeli — label kecil + nama besar (xm=2 ym=2 = tebal & menonjol)
  if (sale.buyer_name) {
    add(tLeft(MARGIN, y, "2", "Pembeli:"));
    gap(24);
    add(tLeft(MARGIN, y, "2", sale.buyer_name.toUpperCase(), 2, 2));
    gap(46);
    if (sale.buyer_hp) {
      add(tLeft(MARGIN, y, "2", sale.buyer_hp));
      gap(26);
    }
    gap(4);
  }

  // Staff & lokasi dalam satu baris (kiri: staff, kanan: lokasi)
  const staffVal = sale.created_by_name?.toUpperCase() ?? "-";
  add(tRow(y, "2", `Staff: ${staffVal}`, locLabel));
  gap(26);

  add(tBar(y, 1));
  gap(10);

  // ════════════════════════════════════════════════════════════════════════════
  // BLOK 4 — Items
  // ════════════════════════════════════════════════════════════════════════════
  items.forEach((item, idx) => {
    const qty = effectiveQty(item);
    const lineTotal = qty * item.harga;
    const kode = (item.kode ?? "").toUpperCase();
    const size = (item.size ?? "").toUpperCase();

    // Nomor urut + kode — font 3 (lebih besar, "bold" feel)
    add(tLeft(MARGIN, y, "3", `${idx + 1}. ${kode}  ${size}`));
    gap(30);

    // Detail harga — right-aligned total
    add(
      tRow(y, "2", `   ${qty} pcs x Rp ${formatHarga(item.harga)}`, `Rp ${formatHarga(lineTotal)}`),
    );
    gap(26);

    // Spacer kecil antar item
    if (idx < items.length - 1) gap(4);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // BLOK 5 — Subtotal + Diskon (jika ada)
  // ════════════════════════════════════════════════════════════════════════════
  if (discount > 0) {
    add(tBar(y, 1));
    gap(8);
    add(tRow(y, "2", "Subtotal", `Rp ${formatHarga(subtotal)}`));
    gap(26);
    add(tRow(y, "2", "Diskon", `- Rp ${formatHarga(discount)}`));
    gap(26);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BLOK 6 — Total (double border, teks besar)
  // ════════════════════════════════════════════════════════════════════════════
  add(tDoubleLine(y));
  gap(14);

  const totalLabel = isRetur ? "TOTAL RETUR" : "TOTAL";
  const totalStr = `Rp ${formatHarga(sale.total)}`;
  add(tLeft(MARGIN, y, "3", totalLabel, 1, 2));
  const totalX = W_DOT - MARGIN - totalStr.length * 16;
  add(tLeft(Math.max(MARGIN, totalX), y, "3", totalStr, 1, 2));
  gap(56);

  add(tDoubleLine(y));
  gap(14);

  // ════════════════════════════════════════════════════════════════════════════
  // BLOK 7 — Rekening / Metode pembayaran
  // ════════════════════════════════════════════════════════════════════════════
  gap(4);
  add(tCenter(y, "2", "- TRANSFER -"));
  gap(26);

  STORE_INFO.rekening.forEach((r) => {
    add(tLeft(MARGIN, y, "2", r.bank));
    gap(24);
    // No. rekening — sedikit lebih besar
    add(tLeft(MARGIN, y, "3", r.no));
    gap(30);
    add(tLeft(MARGIN, y, "2", `a.n. ${r.atas_nama}`));
    gap(28);
  });

  add(tLine(y, 2));
  gap(10);

  // ════════════════════════════════════════════════════════════════════════════
  // BLOK 8 — Footer
  // ════════════════════════════════════════════════════════════════════════════
  if (STORE_INFO.wa) {
    add(tCenter(y, "2", `WA: ${STORE_INFO.wa}`));
    gap(26);
  }
  if (STORE_INFO.website) {
    add(tCenter(y, "2", STORE_INFO.website));
    gap(26);
  }

  add(tBar(y, 1));
  gap(8);

  const thankMsg = isRetur ? "Terima kasih atas retur Anda" : "Terima kasih telah berbelanja!";
  add(tCenter(y, "2", thankMsg));
  gap(40);

  // ── Assemble ───────────────────────────────────────────────────────────────
  const heightMm = Math.ceil((y + 8) / 8);
  const tsplHeader = [`SIZE 100 mm,${heightMm} mm\r\n`, `GAP ${gapMm} mm,0 mm\r\n`, `CLS\r\n`].join(
    "",
  );

  return new TextEncoder().encode(tsplHeader + cmds.join("") + `PRINT 1,1\r\n`);
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

  async function printBle(sale, labelType = "continuous") {
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
      const bytes = generateTspl(sale, labelType);
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
