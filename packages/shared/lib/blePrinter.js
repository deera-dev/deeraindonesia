/**
 * blePrinter.js — koneksi & pengiriman data ke printer thermal TSPL via Web Bluetooth
 * (BLE service FF00/ff02). Dipakai POS (struk) dan Admin (label produk).
 */

// BLE service FF00 — hanya ff02 yang write
export const FF00_SVC = "0000ff00-0000-1000-8000-00805f9b34fb";
const FF02_CHAR = "0000ff02-0000-1000-8000-00805f9b34fb";


// ── BLE write CEPAT utk data gambar (BITMAP) ─────────────────────────────────
// Struk gambar ±80 KB: write-WITHOUT-response, paket besar, jeda pendek.
// Kalau paket ditolak (MTU lebih kecil) ukuran paket otomatis dibagi dua
// sampai minimal 20 byte, melanjutkan dari posisi yang sama.
export const FAST_CHUNK_START = 180;
// Jeda antar paket: 0 — Web Bluetooth sudah menunggu tiap paket selesai ditulis.
// (Pilihan Normal/Turbo dihapus 2026-10-08: Turbo 244 byte tidak mencetak.)
export const FAST_DELAY_MS = 0;

export async function writeBleFast(
  characteristic,
  data,
  { onProgress, chunk: chunkStart = FAST_CHUNK_START, delay = FAST_DELAY_MS } = {},
) {
  const props = characteristic.properties ?? {};
  const noResp = !!(props.writeWithoutResponse && characteristic.writeValueWithoutResponse);
  const write = (chunk) =>
    noResp
      ? characteristic.writeValueWithoutResponse(chunk)
      : characteristic.writeValueWithResponse
        ? characteristic.writeValueWithResponse(chunk)
        : characteristic.writeValue(chunk);

  let size = chunkStart;
  let offset = 0;
  while (offset < data.length) {
    const chunk = data.slice(offset, offset + size);
    try {
      await write(chunk);
    } catch (err) {
      if (size <= 20) throw err;
      size = Math.max(20, Math.floor(size / 2));
      continue; // ulangi dari offset yang sama dgn paket lebih kecil
    }
    offset += chunk.length;
    onProgress?.(Math.min(offset / data.length, 1));
    if (noResp && delay > 0 && offset < data.length) await new Promise((r) => setTimeout(r, delay));
  }
}

// ── BLE connect helper ───────────────────────────────────────────────────────
// Langsung ke ff02 tanpa delay — printer BP-TD110BT timeout cepat
// jika kita terlalu lama sebelum mulai kirim data.

//
// Percepatan (2026-10-08, "OpenLabel < 3 detik"): (1) koneksi DIPAKAI ULANG
// antar cetak (diputus otomatis setelah 60 dtk menganggur), (2) printer yang
// pernah dipilih DIINGAT (id di localStorage) dan disambung langsung lewat
// navigator.bluetooth.getDevices() tanpa dialog pilih perangkat, (3) kalau
// keduanya tidak tersedia, jatuh ke requestDevice seperti semula.
const LS_PRINTER_ID = "deera-bt-printer-id";
const IDLE_DISCONNECT_MS = 60000;
let _conn = null;
let _idleTimer = null;

function readSavedPrinterId() {
  try {
    return localStorage.getItem(LS_PRINTER_ID);
  } catch {
    return null;
  }
}
function savePrinterId(id) {
  try {
    if (id) localStorage.setItem(LS_PRINTER_ID, id);
  } catch {
    /* ignore */
  }
}

export function disconnectPrinter() {
  clearTimeout(_idleTimer);
  try {
    _conn?.server?.device?.gatt?.disconnect();
  } catch {
    /* ignore */
  }
  _conn = null;
}

export function scheduleIdleDisconnect() {
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(disconnectPrinter, IDLE_DISCONNECT_MS);
}

async function openChar(server) {
  const svc = await server.getPrimaryService(FF00_SVC);
  return svc.getCharacteristic(FF02_CHAR);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export async function bleConnect() {
  clearTimeout(_idleTimer);
  if (_conn?.server?.device?.gatt?.connected === true) return _conn;
  _conn = null;

  // Printer yang pernah dipilih → sambung langsung tanpa dialog.
  const savedId = readSavedPrinterId();
  if (savedId && typeof navigator.bluetooth.getDevices === "function") {
    try {
      const known = (await navigator.bluetooth.getDevices()).find((d) => d.id === savedId);
      if (known) {
        const server = await withTimeout(known.gatt.connect(), 8000);
        const char = await openChar(server);
        _conn = { server, char };
        return _conn;
      }
    } catch {
      /* jatuh ke dialog pilih perangkat */
    }
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [FF00_SVC],
  });
  const server = await device.gatt.connect();
  const char = await openChar(server);
  savePrinterId(device.id);
  _conn = { server, char };
  return _conn;
}

