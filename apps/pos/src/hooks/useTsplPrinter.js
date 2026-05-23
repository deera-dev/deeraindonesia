/**
 * useTsplPrinter.js
 * Hook print struk ke thermal printer Blueprint BP-TD110BT via BLE.
 *
 * Pipeline:
 *   DOM (StrukContent) → PNG (html-to-image) → canvas → 1-bit bitmap
 *   → TSPL BITMAP command (@thermal-label/tspl-core) → BLE GATT write
 *
 * Keuntungan vs pendekatan TEXT command lama:
 *   - WYSIWYG: hasil print sama persis dengan tampilan di layar
 *   - Logo, garis, layout kompleks semua tercetak sempurna
 *   - Tidak bergantung font yang ada di firmware printer
 *   - Karakter Unicode / Rupiah tidak jadi masalah
 *
 * Spesifikasi printer:
 *   - Lebar kertas : 100 mm
 *   - Area cetak   : 95 mm
 *   - Resolusi     : 203 dpi ≈ 8 dots/mm
 *   - Mode cetak   : Thermal direct (SET RIBBON OFF)
 */

import { useState } from "react";
import { toPng } from "html-to-image";
import {
  buildSize,
  buildGap,
  buildDirection,
  buildReference,
  buildSetRibbon,
  buildSetCutter,
  buildCls,
  buildBitmapHeader,
  BITMAP_TAIL,
  buildPrint,
  concatBytes,
} from "@thermal-label/tspl-core";

// ── Konstanta printer ─────────────────────────────────────────────────────────
const PAPER_WIDTH_MM   = 100;
const PRINT_WIDTH_MM   = 95;
const DOTS_PER_MM      = 8;                               // 203 dpi ≈ 8 dots/mm
const PRINT_WIDTH_DOTS = PRINT_WIDTH_MM * DOTS_PER_MM;   // 760 dots

export const LABEL_TYPES = {
  continuous: { label: "Kontinu (roll terus)", gapMm: 0 },
  gapped:     { label: "Putus (per struk)",    gapMm: 3 },
};

// BLE profiles yang dicoba secara berurutan
const BLE_SERVICES = [
  { name: "Nordic UART",    svc: "6e400001-b5a3-f393-e0a9-e50e24dcca9e", char: "6e400002-b5a3-f393-e0a9-e50e24dcca9e" },
  { name: "TSC BLE Serial", svc: "000018f0-0000-1000-8000-00805f9b34fb", char: "00002af1-0000-1000-8000-00805f9b34fb" },
  { name: "Generic FF00",   svc: "0000ff00-0000-1000-8000-00805f9b34fb", char: "0000ff02-0000-1000-8000-00805f9b34fb" },
];

// ── BLE write: chunk 20 bytes (MTU 23 − 3 header) ────────────────────────────
async function writeBle(characteristic, data) {
  const CHUNK = 20;
  const useWithout = characteristic.properties?.writeWithoutResponse ?? false;

  let offset = 0;
  while (offset < data.length) {
    const chunk = data.slice(offset, offset + CHUNK);
    try {
      if (useWithout) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await (characteristic.writeValueWithResponse
          ? characteristic.writeValueWithResponse(chunk)
          : characteristic.writeValue(chunk));
      }
    } catch {
      await characteristic.writeValue(chunk);
    }
    offset += CHUNK;
    if (offset < data.length) await new Promise(r => setTimeout(r, 30));
  }
}

// ── Render DOM → 1-bit raster ─────────────────────────────────────────────────
/**
 * Merender elemen DOM menjadi raster 1-bit siap kirim ke printer TSPL.
 *
 * Langkah:
 * 1. toPng() → data URL PNG (pixelRatio 3× untuk kualitas)
 * 2. Gambar ke canvas → resize ke lebar print 760 dots
 * 3. RGBA → grayscale → Floyd-Steinberg dithering → 1-bit
 * 4. Pack bits ke bytes dengan polaritas TSPL (0=gelap, 1=putih)
 *
 * @param {HTMLElement} domElement
 * @returns {{ raster: Uint8Array, widthBytes: number, heightDots: number }}
 */
async function renderToBitmap(domElement) {
  // 1. Render DOM ke PNG
  const dataUrl = await toPng(domElement, {
    quality: 1,
    pixelRatio: 3,
    backgroundColor: "#ffffff",
  });

  // 2. Load ke Image lalu gambar ke canvas dengan lebar target
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload  = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const targetWidth  = PRINT_WIDTH_DOTS;                           // 760 px
  const scale        = targetWidth / img.naturalWidth;
  const targetHeight = Math.ceil(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width  = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const { data: rgba } = ctx.getImageData(0, 0, targetWidth, targetHeight);

  // 3. RGBA → luminance (grayscale float)
  const gray = new Float32Array(targetWidth * targetHeight);
  for (let i = 0; i < targetWidth * targetHeight; i++) {
    gray[i] =
      0.299 * rgba[i * 4] +
      0.587 * rgba[i * 4 + 1] +
      0.114 * rgba[i * 4 + 2];
  }

  // 4. Floyd-Steinberg dithering → binary (0=gelap, 255=putih)
  const THRESHOLD = 128;
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const idx = y * targetWidth + x;
      const old = Math.max(0, Math.min(255, gray[idx]));
      const px  = old > THRESHOLD ? 255 : 0;
      gray[idx] = px;
      const err = old - px;
      if (x + 1 < targetWidth)
        gray[idx + 1]                += err * (7 / 16);
      if (y + 1 < targetHeight && x > 0)
        gray[idx + targetWidth - 1]  += err * (3 / 16);
      if (y + 1 < targetHeight)
        gray[idx + targetWidth]      += err * (5 / 16);
      if (y + 1 < targetHeight && x + 1 < targetWidth)
        gray[idx + targetWidth + 1]  += err * (1 / 16);
    }
  }

  // 5. Pack bits → bytes
  //    Polaritas TSPL: bit 0 = titik gelap (tercetak), bit 1 = putih
  //    → pixel putih (255) = 1, pixel gelap (0) = 0
  const widthBytes = Math.ceil(targetWidth / 8);
  const raster     = new Uint8Array(widthBytes * targetHeight);

  for (let y = 0; y < targetHeight; y++) {
    for (let bx = 0; bx < widthBytes; bx++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = bx * 8 + bit;
        // Piksel di luar lebar = putih; piksel putih di-set 1
        const isWhite = x >= targetWidth || gray[y * targetWidth + x] > THRESHOLD;
        if (isWhite) byte |= (1 << (7 - bit));
      }
      raster[y * widthBytes + bx] = byte;
    }
  }

  return { raster, widthBytes, heightDots: targetHeight };
}

// ── Build wire bytes TSPL ─────────────────────────────────────────────────────
/**
 * Merakit semua perintah TSPL + raster menjadi satu Uint8Array
 * siap dikirim ke printer via BLE.
 *
 * Menggunakan builder dari @thermal-label/tspl-core untuk akurasi
 * byte sesuai TSPL II spec.
 */
function buildTsplJob(raster, widthBytes, heightDots, labelType) {
  const cfg     = LABEL_TYPES[labelType] ?? LABEL_TYPES.continuous;
  const heightMm = Math.ceil(heightDots / DOTS_PER_MM) + 5; // +5mm buffer

  // Setup: SIZE, GAP, DIRECTION, konfigurasi hardware
  const setup = concatBytes(
    labelType === "continuous"
      ? buildSize(PAPER_WIDTH_MM, 0)
      : buildSize(PAPER_WIDTH_MM, heightMm),

    labelType === "continuous"
      ? buildGap(0, 0)
      : buildGap(cfg.gapMm, 0),

    buildDirection(),          // DIRECTION 0,0
    buildReference(0, 0),     // origin di pojok kiri atas
    buildSetRibbon("OFF"),    // direct thermal (tanpa ribbon)
    buildSetCutter("OFF"),    // tanpa pemotong otomatis
    buildCls(),               // bersihkan buffer
  );

  // Bitmap: header + raster + tail
  const bitmapPart = concatBytes(
    buildBitmapHeader(0, 0, widthBytes, heightDots, 0),
    raster,
    BITMAP_TAIL,
  );

  // Print
  const printCmd = buildPrint(1);

  return concatBytes(setup, bitmapPart, printCmd);
}

// ── Hook utama ────────────────────────────────────────────────────────────────
export function useTsplPrinter() {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState(null);

  /**
   * Print struk via BLE ke printer thermal.
   *
   * @param {object}      sale       - Data transaksi
   * @param {string}      labelType  - "continuous" | "gapped"
   * @param {HTMLElement} domElement - Ref ke elemen struk yang akan dirender
   * @returns {boolean} true jika berhasil
   */
  async function printBle(sale, labelType = "continuous", domElement = null) {
    if (!navigator.bluetooth) {
      setError(
        "Web Bluetooth tidak tersedia. Pastikan: " +
        "(1) buka via Chrome/Edge, (2) HTTPS, (3) Bluetooth HP aktif."
      );
      return false;
    }
    if (!domElement) {
      setError("Elemen struk tidak ditemukan. Coba buka struk kembali.");
      return false;
    }

    setBusy(true);
    setError(null);
    let server;

    try {
      // Render dulu sebelum koneksi BLE supaya user melihat progres
      console.log("[TSPL BLE] Merender struk ke bitmap...");
      const { raster, widthBytes, heightDots } = await renderToBitmap(domElement);
      const wireBytes = buildTsplJob(raster, widthBytes, heightDots, labelType);

      console.log(
        `[TSPL BLE] Bitmap: ${widthBytes * 8}×${heightDots} dots, ` +
        `${wireBytes.length} bytes total`
      );

      // Scan & connect BLE
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
        } catch { /* profile tidak cocok, coba berikutnya */ }
      }

      if (!characteristic) {
        throw new Error(
          "Printer terdeteksi tapi interface BLE tidak dikenali.\n" +
          "Coba: matikan & nyalakan printer, lalu hubungkan ulang."
        );
      }

      // Kirim wire bytes
      await writeBle(characteristic, wireBytes);
      return true;

    } catch (err) {
      if (err.name === "NotFoundError") return false; // user cancel pilih device
      setError(err.message || String(err));
      console.error("[TSPL BLE] Error:", err);
      return false;
    } finally {
      try { server?.device?.gatt?.disconnect(); } catch {}
      setBusy(false);
    }
  }

  return {
    printBle,
    busy,
    error,
    clearError: () => setError(null),
    connecting: busy, // compat alias
  };
}
