/**
 * useTsplPrinter.js
 * Hook untuk print struk ke thermal printer via TSPL v1.
 *
 * KENAPA WEB BLUETOOTH GAGAL:
 *   Printer thermal TSC umumnya menggunakan Classic Bluetooth (SPP/RFCOMM),
 *   BUKAN Bluetooth Low Energy (BLE). Web Bluetooth API hanya support BLE GATT,
 *   sehingga tidak bisa berkomunikasi dengan SPP printer.
 *
 * SOLUSI — 3 metode tersedia:
 *   1. Web Serial API  : pair printer ke Windows/macOS → OS buat COM port →
 *                        Web Serial akses COM port tersebut. RECOMMENDED.
 *   2. Web Bluetooth   : untuk printer yang punya mode BLE (NUS/TSC BLE).
 *   3. Download .prn   : download file TSPL, kirim manual via app lain.
 *
 * CARA PAKAI Web Serial:
 *   1. Pair printer ke Windows (Settings → Bluetooth → Add device)
 *   2. Cek Device Manager → Ports (COM & LPT) → catat COM port-nya
 *   3. Buka Struk → klik tombol printer → pilih metode "Serial/COM"
 *   4. Pilih port dari dialog → print
 *
 * Spesifikasi printer:
 *   - Lebar kertas : 100 mm
 *   - Area cetak   : 95 mm (2.5mm margin tiap sisi)
 *   - Resolusi     : 203 dpi ≈ 8 dots/mm
 *   - Method       : Thermal direct (SET RIBBON OFF)
 */

import { useState } from "react";
import { STORE_INFO } from "@deera/shared/lib/storeInfo";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { formatHarga } from "@deera/shared/lib/constants";

// ── Konstanta printer ─────────────────────────────────────────────────────────
const PAPER_WIDTH_MM   = 100;
const PRINT_WIDTH_MM   = 95;
const OFFSET_DOTS      = 20;
const DOTS_PER_MM      = 8;
const PRINT_WIDTH_DOTS = PRINT_WIDTH_MM * DOTS_PER_MM; // 760 dots

export const LABEL_TYPES = {
  continuous: { label: "Kontinu (roll terus)", gapMm: 0 },
  gapped:     { label: "Putus (per struk)",    gapMm: 3 },
};

// BLE profiles (untuk printer yang punya BLE mode)
const BLE_SERVICES = [
  { name: "Nordic UART",   svc: "6e400001-b5a3-f393-e0a9-e50e24dcca9e", char: "6e400002-b5a3-f393-e0a9-e50e24dcca9e" },
  { name: "TSC BLE Serial",svc: "000018f0-0000-1000-8000-00805f9b34fb", char: "00002af1-0000-1000-8000-00805f9b34fb" },
  { name: "Generic FF00",  svc: "0000ff00-0000-1000-8000-00805f9b34fb", char: "0000ff02-0000-1000-8000-00805f9b34fb" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function encode(str) {
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i) & 0xff;
  return buf;
}

async function writeSerial(port, data) {
  const writer = port.writable.getWriter();
  try {
    // Tulis dalam chunk supaya buffer tidak overflow
    const CHUNK = 128;
    for (let i = 0; i < data.length; i += CHUNK) {
      await writer.write(data.slice(i, i + CHUNK));
    }
  } finally {
    writer.releaseLock();
  }
}

async function writeBle(characteristic, data) {
  // BLE MTU default = 23 bytes, payload = 20 bytes (3 bytes header overhead).
  // Chunk harus ≤ 20 bytes agar printer menerima data utuh.
  // writeValueWithoutResponse lebih cocok untuk streaming data ke printer
  // (tidak perlu tunggu acknowledgment tiap paket → lebih cepat dan stabil).
  const CHUNK = 20;
  const useWithout = characteristic.properties?.writeWithoutResponse ?? false;

  let offset = 0;
  while (offset < data.length) {
    const chunk = data.slice(offset, offset + CHUNK);
    try {
      if (useWithout) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        // writeValueWithResponse tersedia di Chrome ≥ 85
        await (characteristic.writeValueWithResponse
          ? characteristic.writeValueWithResponse(chunk)
          : characteristic.writeValue(chunk));
      }
    } catch {
      // fallback ke writeValue (deprecated tapi masih didukung)
      await characteristic.writeValue(chunk);
    }
    offset += CHUNK;
    // Beri jeda 30ms antar chunk — cukup untuk buffer printer
    if (offset < data.length) await new Promise(r => setTimeout(r, 30));
  }
}

function esc(str) {
  return String(str ?? "").replace(/[^\x20-\x7E]/g, "?").replace(/"/g, "'");
}

// ── Kalkulasi tinggi halaman ──────────────────────────────────────────────────
function calcPageHeightMm(sale) {
  const items    = sale.items ?? [];
  const discount = sale.discount ?? 0;
  let h = 0;
  h += 12; // header label
  h += 14; // nama toko besar
  h += 10; // tagline
  h += 8;  // garis
  h += 8;  // tanggal
  if (sale.buyer_name)       h += 8;
  if (sale.created_by_name)  h += 8;
  h += 8;  // lokasi
  h += 6;  // garis
  for (const item of items) {
    h += 9;  // kode + ukuran
    h += 9;  // qty × harga
  }
  h += 6;  // garis
  if (discount > 0) { h += 8 + 8 + 6; }
  h += 14; // TOTAL
  h += 8;  // garis
  h += (STORE_INFO.rekening.length) * 22;
  h += 8;  // garis
  h += 8;  // WA
  h += 12; // footer + padding
  return h + 5; // +5mm buffer
}

// ── Generator TSPL ───────────────────────────────────────────────────────────
export function generateTspl(sale, labelType = "continuous") {
  const isRetur  = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "-";
  const discount = sale.discount ?? 0;
  const cfg      = LABEL_TYPES[labelType] ?? LABEL_TYPES.continuous;

  function effectiveQty(item) {
    return item.warna ? item.warna.reduce((s, w) => s + w.qty, 0) : (item.qty ?? 0);
  }

  const subtotal = (sale.items ?? []).reduce((s, item) =>
    s + effectiveQty(item) * item.harga, 0);

  const dt = sale.created_at
    ? new Date(sale.created_at).toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "-";

  const pageHMm = calcPageHeightMm(sale);
  const cmd = [];

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (labelType === "continuous") {
    cmd.push(`SIZE ${PAPER_WIDTH_MM} mm,0 mm`);
    cmd.push("GAP 0 mm,0 mm");
  } else {
    cmd.push(`SIZE ${PAPER_WIDTH_MM} mm,${pageHMm} mm`);
    cmd.push(`GAP ${cfg.gapMm} mm,0 mm`);
  }
  cmd.push("DIRECTION 0");
  cmd.push("SET RIBBON OFF");
  cmd.push("SET CUTTER OFF");
  cmd.push(`REFERENCE ${OFFSET_DOTS},0`);
  cmd.push("CLS");

  let y = 10;

  // ── Header ────────────────────────────────────────────────────────────────
  const headerLabel = isRetur ? "STRUK RETUR" : "STRUK PEMBELIAN";
  cmd.push(`TEXT ${Math.floor(PRINT_WIDTH_DOTS / 2)},${y},"3",0,1,1,"${esc(headerLabel)}"`);
  y += 40;
  cmd.push(`TEXT ${Math.floor(PRINT_WIDTH_DOTS / 2)},${y},"4",0,2,2,"DEERA"`);
  y += 56;
  cmd.push(`TEXT ${Math.floor(PRINT_WIDTH_DOTS / 2)},${y},"3",0,1,1,"${esc(STORE_INFO.tagline)}"`);
  y += 40;
  cmd.push(`BAR 0,${y},${PRINT_WIDTH_DOTS},2`);
  y += 14;

  // ── Info ─────────────────────────────────────────────────────────────────
  const COL2 = 88;
  function row(label, value, bold) {
    cmd.push(`TEXT 0,${y},"3",0,1,1,"${esc(label)}:"`);
    cmd.push(`TEXT ${COL2},${y},"${bold ? "4" : "3"}",0,1,1,"${esc(value)}"`);
    y += 32;
  }
  row("Tgl", dt);
  if (sale.buyer_name)      row("Pembeli", sale.buyer_name.toUpperCase(), true);
  if (sale.buyer_hp)        row("No HP",   sale.buyer_hp);
  if (sale.created_by_name) row("Kasir",   sale.created_by_name.toUpperCase());
  row("Lokasi", locLabel);
  y += 4;
  cmd.push(`BAR 0,${y},${PRINT_WIDTH_DOTS},1`);
  y += 14;

  // ── Items ─────────────────────────────────────────────────────────────────
  for (const item of (sale.items ?? [])) {
    const qty  = effectiveQty(item);
    const tot  = qty * item.harga;
    cmd.push(`TEXT 0,${y},"4",0,1,1,"${esc(`${(item.kode ?? "").toUpperCase()}  ${(item.size ?? "").toUpperCase()}`)}"`);
    y += 36;
    const qStr = `  ${qty} pcs x Rp ${formatHarga(item.harga)}`;
    const tStr = `Rp ${formatHarga(tot)}`;
    const tX   = Math.max(PRINT_WIDTH_DOTS - tStr.length * 10, 200);
    cmd.push(`TEXT 0,${y},"3",0,1,1,"${esc(qStr)}"`);
    cmd.push(`TEXT ${tX},${y},"3",0,1,1,"${esc(tStr)}"`);
    y += 36;
  }
  cmd.push(`BAR 0,${y},${PRINT_WIDTH_DOTS},1`);
  y += 14;

  // ── Diskon ────────────────────────────────────────────────────────────────
  if (discount > 0) {
    const sStr = `Rp ${formatHarga(subtotal)}`;
    const dStr = `- Rp ${formatHarga(discount)}`;
    cmd.push(`TEXT 0,${y},"3",0,1,1,"Subtotal"`);
    cmd.push(`TEXT ${Math.max(PRINT_WIDTH_DOTS - sStr.length * 10, 200)},${y},"3",0,1,1,"${esc(sStr)}"`);
    y += 32;
    cmd.push(`TEXT 0,${y},"3",0,1,1,"Diskon"`);
    cmd.push(`TEXT ${Math.max(PRINT_WIDTH_DOTS - dStr.length * 10, 200)},${y},"3",0,1,1,"${esc(dStr)}"`);
    y += 32;
    cmd.push(`BAR 0,${y},${PRINT_WIDTH_DOTS},2`);
    y += 14;
  }

  // ── Total ─────────────────────────────────────────────────────────────────
  const totLabel = isRetur ? "TOTAL RETUR" : "TOTAL";
  const totVal   = `Rp ${formatHarga(sale.total)}`;
  cmd.push(`TEXT 0,${y},"4",0,1,1,"${esc(totLabel)}"`);
  cmd.push(`TEXT ${Math.max(PRINT_WIDTH_DOTS - totVal.length * 14, 300)},${y},"4",0,1,1,"${esc(totVal)}"`);
  y += 52;
  cmd.push(`BAR 0,${y},${PRINT_WIDTH_DOTS},2`);
  y += 16;

  // ── Rekening ──────────────────────────────────────────────────────────────
  for (const r of STORE_INFO.rekening) {
    cmd.push(`TEXT 0,${y},"3",0,1,1,"Transfer ${esc(r.bank)}:"`);
    y += 32;
    cmd.push(`TEXT 0,${y},"4",0,1,1,"${esc(r.no)}"`);
    y += 40;
    cmd.push(`TEXT 0,${y},"3",0,1,1,"a.n. ${esc(r.atas_nama)}"`);
    y += 40;
  }
  cmd.push(`BAR 0,${y},${PRINT_WIDTH_DOTS},1`);
  y += 14;

  // ── Footer ────────────────────────────────────────────────────────────────
  cmd.push(`TEXT 0,${y},"3",0,1,1,"WA: ${esc(STORE_INFO.wa)}"`);
  y += 32;
  const footer = isRetur ? "Terima kasih atas retur Anda" : "Terima kasih telah berbelanja!";
  cmd.push(`TEXT 0,${y},"3",0,1,1,"${esc(footer)}"`);
  y += 48;

  // ── Print ─────────────────────────────────────────────────────────────────
  cmd.push("PRINT 1");
  cmd.push("");

  return cmd.join("\r\n");
}

// ── Hook utama ────────────────────────────────────────────────────────────────
export function useTsplPrinter() {
  const [busy,   setBusy]  = useState(false);
  const [error,  setError] = useState(null);

  // ── Metode 1: Web Serial (untuk Classic BT COM port / USB) ────────────────
  async function printSerial(sale, labelType = "continuous") {
    if (!navigator.serial) {
      setError("Web Serial tidak didukung di browser ini. Gunakan Chrome/Edge di desktop.");
      return false;
    }

    setBusy(true);
    setError(null);
    let port;

    try {
      // Minta user pilih COM port
      port = await navigator.serial.requestPort();

      // Buka port — baud rate TSC default 9600, tapi bisa 115200
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none" });

      const tspl = generateTspl(sale, labelType);
      console.log("[TSPL Serial] Commands:\n", tspl);

      await writeSerial(port, encode(tspl));

      // Tunggu sebentar supaya data dikirim sebelum port ditutup
      await new Promise(r => setTimeout(r, 500));
      return true;

    } catch (err) {
      if (err.name === "NotFoundError") return false; // user cancel
      setError("Gagal print via Serial: " + (err.message || String(err)));
      console.error("[TSPL Serial] Error:", err);
      return false;
    } finally {
      try { if (port) await port.close(); } catch {}
      setBusy(false);
    }
  }

  // ── Metode 2: Web Bluetooth BLE (untuk printer yang punya BLE mode) ───────
  async function printBle(sale, labelType = "continuous") {
    if (!navigator.bluetooth) {
      setError("Web Bluetooth tidak tersedia. Pastikan: (1) buka via Chrome/Edge, (2) akses lewat HTTPS, (3) Bluetooth HP aktif.");
      return false;
    }

    setBusy(true);
    setError(null);
    let server;

    try {
      const allSvcUUIDs = BLE_SERVICES.map(s => s.svc);
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: allSvcUUIDs,
      });

      server = await device.gatt.connect();

      let characteristic = null;
      for (const profile of BLE_SERVICES) {
        try {
          const svc  = await server.getPrimaryService(profile.svc);
          characteristic = await svc.getCharacteristic(profile.char);
          console.log(`[TSPL BLE] Terhubung via ${profile.name}`);
          break;
        } catch { /* coba berikutnya */ }
      }

      if (!characteristic) {
        throw new Error(
          "Printer terdeteksi tapi interface BLE tidak dikenali.\n" +
          "Coba: matikan & nyalakan printer, lalu hubungkan ulang."
        );
      }

      const tspl = generateTspl(sale, labelType);
      await writeBle(characteristic, encode(tspl));
      return true;

    } catch (err) {
      if (err.name === "NotFoundError") return false;
      setError(err.message || String(err));
      console.error("[TSPL BLE] Error:", err);
      return false;
    } finally {
      try { server?.device?.gatt?.disconnect(); } catch {}
      setBusy(false);
    }
  }

  // ── Metode 3: Download file .prn ──────────────────────────────────────────
  function downloadTspl(sale, labelType = "continuous") {
    const tspl   = generateTspl(sale, labelType);
    const blob   = new Blob([tspl], { type: "text/plain" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    const date   = sale.date ?? new Date().toISOString().split("T")[0];
    a.href       = url;
    a.download   = `struk-${date}.prn`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  return {
    printSerial,
    printBle,
    downloadTspl,
    busy,
    error,
    clearError: () => setError(null),
    // compat alias
    connecting: busy,
  };
}
