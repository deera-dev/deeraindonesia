
export const FF00_SVC = "0000ff00-0000-1000-8000-00805f9b34fb";
// Service BLE "transparent UART" modul HM-10/HM-11 — chipset lain yang
// SANGAT umum dipakai printer thermal murah selain FF00/FF02 (laporan
// admin: printer CASHCOW CT-321B melempar "No Services matching UUID
// 0000ff00-... found", jadi dia pakai chipset lain). Karakteristik tulis
// dicari otomatis di dalam service yang ketemu (lihat openChar di bawah),
// bukan hardcode UUID characteristic, supaya toleran ke variasi chipset
// tanpa perlu tau UUID characteristic persis tiap merek printer.
const FFE0_SVC = "0000ffe0-0000-1000-8000-00805f9b34fb";
// CT-321B ternyata juga bukan FFE0 — admin konfirmasi lewat
// chrome://bluetooth-internals (Android) & Bluetooth LE Explorer
// (Windows): service asli-nya 49535343-fe7d-4ae5-8fa9-9fafd205e455, yaitu
// "ISSC/Microchip Transparent UART" — profil BLE-serial umum lain lagi,
// dipakai banyak modul printer/scale murah. Characteristic tulisnya tetap
// dicari otomatis (bukan hardcode UUID 49535343-8841-...), krn yang
// kelihatan di scan cuma sisi notify-nya (49535343-1e4d-...).
const ISSC_UART_SVC = "49535343-fe7d-4ae5-8fa9-9fafd205e455";
const CANDIDATE_SERVICES = [FF00_SVC, FFE0_SVC, ISSC_UART_SVC];


export const FAST_CHUNK_START = 180;
export const FAST_DELAY_MS = 0;

// Riwayat tuning flow-control utk printer BLE "jembatan serial" (CASHCOW
// CT-321B & sejenisnya — chip ISSC UART, lihat CANDIDATE_SERVICES di atas),
// dibandingkan dgn app "OpenLabel" (printer sama, data sama — struk yang
// berhasil print dari app kita pun BENAR, tidak corrupt) yang selalu lancar
// & instan:
// 1. Fire-and-forget murni (writeValueWithoutResponse, tanpa delay/sync):
//    CEPAT tapi buffer internal chip bisa kepenuhan krn data dikirim lebih
//    cepat dari yang bisa diproses — sisa paket diam2 hilang/macet TANPA
//    error JS (promise tetap resolve sukses).
// 2. forceResponse (writeValueWithResponse tiap paket, nunggu ack GATT):
//    RELIABEL (flow-control asli dari GATT) tapi tiap paket = 1 round-trip
//    Bluetooth penuh → lambat (220 detik utk struk 112KB).
// 3. Fire-and-forget + delay seragam (mis. 15ms) tiap paket: TETAP lambat
//    (delay ternyata bukan komponen waktu dominan — overhead per-write itu
//    sendiri yang lambat di koneksi ini) DAN merusak kualitas cetak (jeda
//    seragam mengganggu timing internal print head termal printer, hasil
//    jadi tipis/pudar & "slow motion").
// 4. ackEvery (skema SEKARANG): fire-and-forget utk sebagian besar paket
//    (cepat, TANPA delay buatan yg ganggu timing print head), tapi tiap N
//    paket paksa 1 writeValueWithResponse sbg titik sinkron — membatasi
//    berapa banyak data "belum dikonfirmasi" yang bisa menumpuk di buffer
//    chip sebelum di-flush paksa, tanpa bayar ongkos round-trip di SETIAP
//    paket spt opsi 2, dan tanpa delay buatan spt opsi 3.
export async function writeBleFast(
  characteristic,
  data,
  { onProgress, chunk: chunkStart = FAST_CHUNK_START, delay = FAST_DELAY_MS, forceResponse = false, ackEvery = 0 } = {},
) {
  const props = characteristic.properties ?? {};
  const canNoResp = !!(props.writeWithoutResponse && characteristic.writeValueWithoutResponse);
  const canResp = !!(characteristic.writeValueWithResponse || characteristic.writeValue);
  const writeResp = (chunk) =>
    characteristic.writeValueWithResponse ? characteristic.writeValueWithResponse(chunk) : characteristic.writeValue(chunk);

  let size = chunkStart;
  let offset = 0;
  let chunkIndex = 0;
  while (offset < data.length) {
    const chunk = data.slice(offset, offset + size);
    const syncPoint = ackEvery > 0 && (chunkIndex + 1) % ackEvery === 0;
    const useResp = forceResponse || syncPoint || !canNoResp;
    try {
      await (useResp && canResp ? writeResp(chunk) : characteristic.writeValueWithoutResponse(chunk));
    } catch (err) {
      if (size <= 20) throw err;
      size = Math.max(20, Math.floor(size / 2));
      continue;
    }
    offset += chunk.length;
    chunkIndex++;
    onProgress?.(Math.min(offset / data.length, 1));
    if (!useResp && canNoResp && delay > 0 && offset < data.length) await new Promise((r) => setTimeout(r, delay));
  }
}


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
  }
}

export function disconnectPrinter() {
  clearTimeout(_idleTimer);
  try {
    _conn?.server?.device?.gatt?.disconnect();
  } catch {
  }
  _conn = null;
}

export function scheduleIdleDisconnect() {
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(disconnectPrinter, IDLE_DISCONNECT_MS);
}

async function openChar(server) {
  for (const svcUuid of CANDIDATE_SERVICES) {
    let svc;
    try {
      svc = await server.getPrimaryService(svcUuid);
    } catch {
      continue;
    }
    const chars = await svc.getCharacteristics();
    const writable = chars.find((c) => c.properties?.write || c.properties?.writeWithoutResponse);
    if (writable) return writable;
  }
  throw new Error(
    "Printer ini tidak punya service Bluetooth yang dikenali aplikasi (dicoba FF00, FFE0 & ISSC UART). Service ID aslinya perlu dicek pakai app seperti nRF Connect supaya bisa ditambahkan.",
  );
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
    }
  }

  let device;
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: CANDIDATE_SERVICES,
    });
  } catch (err) {
    // Pengguna batal di dialog pilih perangkat juga lempar NotFoundError —
    // tandai di sini (bukan di getPrimaryService/getCharacteristic di
    // bawah) supaya pemanggil bisa beda-in "batal" (diam-diam) dari printer
    // yang BENERAN gagal konek/tidak support servicenya (harus kelihatan
    // errornya, sebelumnya ketimpa diam2 krn nama errornya sama-sama
    // NotFoundError).
    if (err.name === "NotFoundError") {
      const cancelled = new Error("Dibatalkan.");
      cancelled.userCancelled = true;
      throw cancelled;
    }
    throw err;
  }
  const server = await device.gatt.connect();
  const char = await openChar(server);
  savePrinterId(device.id);
  _conn = { server, char };
  return _conn;
}

