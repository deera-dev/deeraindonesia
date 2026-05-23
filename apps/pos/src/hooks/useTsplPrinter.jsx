/**
 * useTsplPrinter.jsx
 * Hook print struk ke thermal printer via ESC/POS + BLE.
 *
 * Library: react-thermal-printer (ESC/POS, bukan TSPL)
 * Transport: Web Bluetooth BLE → Generic FF00 / Nordic UART / TSC BLE
 *
 * ESC/POS adalah protokol standar Epson yang dipakai mayoritas thermal
 * printer modern. Jika TSPL commands sebelumnya tidak nge-print, kemungkinan
 * besar printer ini bicara ESC/POS.
 *
 * Spesifikasi: Blueprint BP-TD110BT — 100 mm paper, 203 dpi, direct thermal
 */

import { useState } from "react";
import { Printer, Text, Row, Line, Br, render } from "react-thermal-printer";
import { STORE_INFO }      from "@deera/shared/lib/storeInfo";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { formatHarga }     from "@deera/shared/lib/constants";

// Lebar karakter per baris.
// 100mm paper, Font A 203dpi ≈ 12 dots/char → 800/12 ≈ 66 chars.
// 48 = nilai konservatif; naikkan ke 56 jika margin terlalu lebar.
const PRINTER_WIDTH = 48;

export const LABEL_TYPES = {
  continuous: { label: "Kontinu (roll terus)", gapMm: 0 },
  gapped:     { label: "Putus (per struk)",    gapMm: 3 },
};

const BLE_SERVICES = [
  { name: "Nordic UART",         svc: "6e400001-b5a3-f393-e0a9-e50e24dcca9e", char: "6e400002-b5a3-f393-e0a9-e50e24dcca9e" },
  { name: "TSC BLE Serial",      svc: "000018f0-0000-1000-8000-00805f9b34fb", char: "00002af1-0000-1000-8000-00805f9b34fb" },
  // ff01 = write (TX), ff02 = notify (RX) — coba ff01 dulu
  { name: "Generic FF00 (ff01)", svc: "0000ff00-0000-1000-8000-00805f9b34fb", char: "0000ff01-0000-1000-8000-00805f9b34fb" },
  { name: "Generic FF00 (ff02)", svc: "0000ff00-0000-1000-8000-00805f9b34fb", char: "0000ff02-0000-1000-8000-00805f9b34fb" },
];

function effectiveQty(item) {
  return item.warna
    ? item.warna.reduce((s, w) => s + w.qty, 0)
    : (item.qty ?? 0);
}

function formatDt(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

async function writeBle(characteristic, data) {
  const CHUNK      = 20;
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

async function generateEscPos(sale) {
  const isRetur  = sale.type === "retur";
  const locLabel = LOCATION_LABELS[sale.location] ?? sale.location ?? "-";
  const discount = sale.discount ?? 0;
  const items    = sale.items ?? [];

  const subtotal = items.reduce(
    (s, item) => s + effectiveQty(item) * item.harga, 0
  );

  const receipt = (
    <Printer type="epson" width={PRINTER_WIDTH}>

      {/* Header toko */}
      <Text align="center">
        {isRetur ? "--- STRUK RETUR ---" : "--- STRUK PEMBELIAN ---"}
      </Text>
      <Text align="center" bold size={{ width: 2, height: 2 }}>DEERA</Text>
      <Text align="center">{STORE_INFO.tagline}</Text>
      <Line />

      {/* Info transaksi */}
      <Row left="Tanggal" right={formatDt(sale.created_at)} />
      {sale.buyer_name && (
        <Row left="Pembeli" right={sale.buyer_name.toUpperCase()} />
      )}
      {sale.buyer_hp && (
        <Row left="No HP" right={sale.buyer_hp} />
      )}
      {sale.created_by_name && (
        <Row left="Kasir" right={sale.created_by_name.toUpperCase()} />
      )}
      <Row left="Lokasi" right={locLabel} />
      <Line />

      {/* Items */}
      {items.flatMap((item, idx) => {
        const qty       = effectiveQty(item);
        const lineTotal = qty * item.harga;
        return [
          <Text key={`n${idx}`} bold>
            {`${(item.kode ?? "").toUpperCase()}  ${(item.size ?? "").toUpperCase()}`}
          </Text>,
          <Row
            key={`r${idx}`}
            left={`  ${qty} pcs x Rp ${formatHarga(item.harga)}`}
            right={`Rp ${formatHarga(lineTotal)}`}
          />,
        ];
      })}
      <Line />

      {/* Diskon */}
      {discount > 0 && [
        <Row key="sub" left="Subtotal" right={`Rp ${formatHarga(subtotal)}`} />,
        <Row key="dis" left="Diskon"   right={`- Rp ${formatHarga(discount)}`} />,
        <Line key="ldis" />,
      ]}

      {/* Total */}
      <Text bold size={{ width: 2, height: 2 }}>
        {isRetur ? "TOTAL RETUR" : "TOTAL"}
      </Text>
      <Text bold size={{ width: 2, height: 2 }} align="right">
        {`Rp ${formatHarga(sale.total)}`}
      </Text>
      <Line />

      {/* Rekening */}
      {STORE_INFO.rekening.flatMap((r, i) => [
        <Text key={`rb${i}`}>{`Transfer ${r.bank}:`}</Text>,
        <Text key={`rn${i}`} bold>{r.no}</Text>,
        <Text key={`ra${i}`}>{`a.n. ${r.atas_nama}`}</Text>,
        <Br   key={`br${i}`} />,
      ])}
      <Line />

      {/* Footer */}
      <Text align="center">{`WA: ${STORE_INFO.wa}`}</Text>
      {STORE_INFO.website ? (
        <Text align="center">{STORE_INFO.website}</Text>
      ) : null}
      <Br />
      <Text align="center" bold>
        {isRetur
          ? "Terima kasih atas retur Anda"
          : "Terima kasih telah berbelanja!"}
      </Text>
      <Br />
      <Br />
      <Br />

    </Printer>
  );

  return await render(receipt);
}

export function useTsplPrinter() {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState(null);

  async function printBle(sale, labelType = "continuous") {
    if (!navigator.bluetooth) {
      setError(
        "Web Bluetooth tidak tersedia. " +
        "Pastikan: (1) Chrome/Edge, (2) HTTPS, (3) Bluetooth aktif."
      );
      return false;
    }

    setBusy(true);
    setError(null);
    let server;

    try {
      console.log("[ESC/POS] Generating receipt...");
      const bytes = await generateEscPos(sale);
      console.log(`[ESC/POS] ${bytes.length} bytes`);

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLE_SERVICES.map(s => s.svc),
      });

      server = await device.gatt.connect();

      // ── Diagnostik: log semua service & characteristic ──────────────────
      try {
        const allSvcs = await server.getPrimaryServices();
        console.log("[ESC/POS BLE] Primary services:", allSvcs.map(s => s.uuid));
        for (const s of allSvcs) {
          try {
            const chars = await s.getCharacteristics();
            for (const c of chars) {
              const p = c.properties;
              console.log(
                `[ESC/POS BLE]  svc=${s.uuid} char=${c.uuid}`,
                `write=${p.write} writeWithoutResponse=${p.writeWithoutResponse}`,
                `notify=${p.notify} read=${p.read} indicate=${p.indicate}`,
              );
            }
          } catch {}
        }
      } catch (diagErr) {
        console.warn("[ESC/POS BLE] Diagnostik gagal:", diagErr);
      }
      // ────────────────────────────────────────────────────────────────────

      let characteristic = null;
      for (const profile of BLE_SERVICES) {
        try {
          const svc  = await server.getPrimaryService(profile.svc);
          characteristic = await svc.getCharacteristic(profile.char);
          console.log(`[ESC/POS BLE] Terhubung via ${profile.name}`);
          break;
        } catch { /* coba berikutnya */ }
      }

      if (!characteristic) {
        throw new Error(
          "Printer terdeteksi tapi interface BLE tidak dikenali.\n" +
          "Coba matikan & nyalakan printer lalu hubungkan ulang."
        );
      }

      await writeBle(characteristic, bytes);
      return true;

    } catch (err) {
      if (err.name === "NotFoundError") return false;
      setError(err.message || String(err));
      console.error("[ESC/POS BLE] Error:", err);
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
    connecting: busy,
  };
}
