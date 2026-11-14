
import { useState } from "react";
import { buildImageTspl, dataUrlToGray, grayToBitmap } from "../lib/tsplImage";
import { buildImageEscPos } from "../lib/escposImage";
import { writeBleFast, disconnectPrinter, bleConnect, scheduleIdleDisconnect } from "@deera/shared/lib/blePrinter";

export const PAPER_WIDTHS = {
  100: { label: "100mm", dots: 800 },
  78: { label: "78mm (Bawaan)", dots: 623 },
};
const DEFAULT_PAPER_WIDTH = "78";

// Laporan admin (November 2026): struk ESC/POS (CASHCOW CT-321B dkk)
// kepotong di sisi kanan walau kertas & "lebar kertas" yang dipilih sama
// persis dgn printer TSPL sebelumnya. Sebabnya PAPER_WIDTHS di atas disetel
// utk printer LABEL TSPL (78mm/100mm, sudah terbukti pas di printer itu) —
// printer STRUK ESC/POS beda spek: lebar cetak dalam dots dihitung dari
// resolusi printhead umum 203dpi dikurangi margin kiri-kanan, standar
// industrinya 384 dots utk kertas 58mm dan 576 dots utk 80mm (BUKAN 623/800
// punya printer label). Kirim dots lebih besar dari yg sanggup dicetak
// printer ESC/POS = sisa kanannya didiamkan (bukan wrap), makanya kepotong.
export const ESCPOS_PAPER_WIDTHS = {
  58: { label: "58mm", dots: 384 },
  80: { label: "80mm (Bawaan)", dots: 576 },
};
const DEFAULT_ESCPOS_PAPER_WIDTH = "80";

export function paperWidthsFor(protocol) {
  return protocol === "escpos" ? ESCPOS_PAPER_WIDTHS : PAPER_WIDTHS;
}

export function defaultPaperWidthFor(protocol) {
  return protocol === "escpos" ? DEFAULT_ESCPOS_PAPER_WIDTH : DEFAULT_PAPER_WIDTH;
}

export const LABEL_TYPES = {
  continuous: { label: "Kontinu (roll terus)", gapMm: 0 },
  gapped: { label: "Putus (per struk)", gapMm: 2, heightMm: 150 },
};

// Protokol bahasa perintah printer — admin beli CASHCOW CT-321B, ternyata
// tidak mengerti TSPL sama sekali (command text-nya tercetak apa adanya,
// bukan dieksekusi). CASHCOW dipasarkan sbg printer "label & struk", jadi
// kemungkinan besar ESC/POS (bahasa printer struk/kasir umum). Default
// tetap "tspl" (printer yang sudah didukung sebelumnya tidak terpengaruh).
export const PRINTER_PROTOCOLS = {
  tspl: { label: "TSPL (printer label)" },
  escpos: { label: "ESC/POS (printer struk)" },
};
const DEFAULT_PROTOCOL = "tspl";

// Eksperimen admin (November 2026): ESC/POS ~5 KB/dtk, jauh lebih lambat
// drpd TSPL (fire-and-forget murni, ackEvery 0) krn tiap ACK_EVERY_DEFAULT
// paket dipaksa nunggu 1 round-trip Bluetooth penuh sbg titik sinkron
// (lihat riwayat tuning di blePrinter.js) — titik sinkron lebih jarang =
// lebih cepat TAPI makin berisiko buffer chip "jembatan serial" kepenuhan
// (data diam2 hilang/macet tanpa error JS, bukan sekadar lebih pelan).
// Admin yang nentuin titik seimbangnya lewat uji coba langsung di
// printer fisik — nilai ini cuma default kalau tidak di-override lewat
// opsi `ackEvery` pada printImageBle().
export const ACK_EVERY_DEFAULT = 8;
// Admin: ackEvery=32 (kirim 10,3s) vs 128 (kirim 10,2s) vs 8 (~10,7s) —
// nyaris sama, titik sinkron terbukti BUKAN beban utama. 0 ditambahkan
// sbg titik paling ekstrem (fire-and-forget MURNI, tanpa ack sama
// sekali) — riwayat blePrinter.js bilang ini bisa bikin data diam2
// hilang tanpa error JS, tapi admin minta tetap diuji langsung krn
// ackEvery di titik mana pun ternyata tidak banyak ngaruh.
export const ACK_EVERY_OPTIONS = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

// Admin (November 2026): ackEvery terbukti nyaris tidak ngaruh ke
// kecepatan (lihat ACK_EVERY_OPTIONS) — dugaan bottleneck sebenarnya
// overhead PER-PAKET (≈375 paket @180B utk struk 66KB, ~27ms/paket,
// konsisten dgn BLE connection interval yg membatasi 1 write/interval
// apa pun mode ack-nya). Satu-satunya cara ngurangin overhead itu:
// paket LEBIH BESAR = LEBIH SEDIKIT paket. Tapi 512B sudah pernah
// dicoba & bikin GATT disconnect di printer ini (riwayat blePrinter.js)
// — jadi titik tengah antara 180 (aman) dan 512 (gagal) perlu diuji
// manual oleh admin, naik pelan2 sambil cek hasil cetak tiap kali
// (bisa lolos di JS tanpa error, tapi hasilnya rusak/kepotong).
export const CHUNK_SIZE_DEFAULT = 180;
export const CHUNK_SIZE_OPTIONS = [120, 150, 180, 220, 260, 300, 360, 420];

// Eksperimen admin (November 2026, "diakali kayak TSPL" — BITMAP TSPL
// bisa kirim strip SEMPIT per bagian konten karena punya offset X bawaan,
// GS v 0 ESC/POS tidak punya itu sama sekali) — cropColumns pangkas
// kolom kosong kiri-kanan jg (bukan cuma baris atas-bawah spt trim biasa)
// lewat ESC $ (set posisi cetak) + lebar GS v0 yang lebih sempit, lihat
// escposImage.js. Default FALSE krn efek ESC $ di mode grafis belum
// tentu didukung identik di semua klon ESC/POS murah — kalau tidak
// didukung, hasilnya bisa GESER/MIRING (bukan cuma rusak bersih spt
// eksperimen ukuran paket), jadi WAJIB dicek visual lurus-tidaknya di
// printer fisik, bukan cuma lihat "berhasil terkirim".
export const CROP_COLUMNS_DEFAULT = false;

export {
  FAST_CHUNK_START,
  FAST_DELAY_MS,
  writeBleFast,
  disconnectPrinter,
} from "@deera/shared/lib/blePrinter";


export function useTsplPrinter() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [timing, setTiming] = useState("");

  async function printImageBle(dataUrl, options = {}) {
    const {
      labelType = "continuous",
      paperWidthMm = DEFAULT_PAPER_WIDTH,
      algorithm = "dither",
      invert = false,
      protocol = DEFAULT_PROTOCOL,
      ackEvery,
      chunkSize,
      cropColumns = CROP_COLUMNS_DEFAULT,
    } = options;
    if (!navigator.bluetooth) {
      setError(
        "Web Bluetooth tidak tersedia. " +
          "Pastikan: (1) Chrome/Edge, (2) HTTPS, (3) Bluetooth aktif.",
      );
      return false;
    }

    setBusy(true);
    setError(null);
    try {
      const t0 = performance.now();
      setProgress({ stage: "raster", pct: 0 });
      const widths = paperWidthsFor(protocol);
      const dots = widths[paperWidthMm]?.dots ?? widths[defaultPaperWidthFor(protocol)].dots;
      const { gray, w, h } = await dataUrlToGray(dataUrl, dots);
      // ESC/POS "GS v 0": bit=1 = hitam — kebalikan konvensi TSPL
      // (bit=0 = hitam, lihat packBitmap di tsplImage.js) — balik polaritas
      // (invert) hanya utk ESC/POS, tanpa ubah perilaku TSPL yang sudah ada.
      const bitmap = grayToBitmap(gray, w, h, {
        algorithm,
        invert: protocol === "escpos" ? !invert : invert,
      });
      const label = LABEL_TYPES[labelType] ?? LABEL_TYPES.continuous;
      const bytes =
        protocol === "escpos"
          ? buildImageEscPos(bitmap, { cropColumns })
          : buildImageTspl(bitmap, {
              paperWidthMm,
              gapMm: label.gapMm,
              labelHeightMm: labelType === "gapped" ? label.heightMm : null,
              trim: true,
            });
      const t1 = performance.now();

      setProgress({ stage: "connect", pct: 0 });
      const conn = await bleConnect();
      const t2 = performance.now();

      // ESC/POS — ack tiap paket (forceResponse) reliabel tapi lambat
      // (220dtk/112KB); fire-and-forget + delay seragam malah merusak
      // kualitas cetak (print "slow motion", hasil tipis/pudar — jeda
      // buatan ganggu timing print head termal) TANPA jadi cepat juga
      // (lihat riwayat PR #60/#63). Sekarang: fire-and-forget utk sebagian
      // besar paket (cepat, TANPA delay buatan), tapi tiap N paket paksa 1
      // writeValueWithResponse sbg titik sinkron — batasi penumpukan data
      // "belum dikonfirmasi" di buffer chip tanpa bayar round-trip di tiap
      // paket spt forceResponse penuh. N bisa dioverride lewat opsi
      // `ackEvery` (eksperimen kecepatan, lihat ACK_EVERY_OPTIONS) — default
      // ACK_EVERY_DEFAULT kalau tidak di-override.
      const effectiveAckEvery = ackEvery ?? (protocol === "escpos" ? ACK_EVERY_DEFAULT : 0);
      // Eksperimen ukuran paket (lihat CHUNK_SIZE_OPTIONS) — dioverride
      // lewat opsi `chunkSize`, default FAST_CHUNK_START (180) kalau tidak
      // di-override (perilaku lama, termasuk utk TSPL — tidak berubah).
      const effectiveChunk = chunkSize ?? CHUNK_SIZE_DEFAULT;
      await writeBleFast(conn.char, bytes, {
        onProgress: (p) => setProgress({ stage: "send", pct: Math.round(p * 100) }),
        ackEvery: effectiveAckEvery,
        chunk: effectiveChunk,
      });
      const t3 = performance.now();
      // ESC/POS (CASHCOW CT-321B & sejenisnya, chip "jembatan serial" BLE) —
      // laporan admin: print pertama jalan (telat), print berikutnya di
      // koneksi yang SAMA (masih idle-cached) kadang diam total walau
      // "Terkirim ke printer" sukses tanpa error. Dugaan: firmware-nya
      // tidak tahan terima stream kedua di koneksi yang sudah terbuka —
      // putus & connect ulang tiap print (bukan idle-cache 60dtk spt TSPL)
      // supaya tiap print dapat koneksi baru & segar. Lebih lambat
      // (~3-4dtk ekstra per print) tapi diharapkan lebih konsisten/reliabel
      // utk printer tipe ini.
      if (protocol === "escpos") disconnectPrinter();
      else scheduleIdleDisconnect();
      const sec = (ms) => (ms / 1000).toFixed(1);
      const ackSuffix =
        protocol === "escpos"
          ? ` · ack/${effectiveAckEvery} · paket/${effectiveChunk}B${cropColumns ? " · crop" : ""}`
          : "";
      const summary = `siap ${sec(t1 - t0)}s · sambung ${sec(t2 - t1)}s · kirim ${sec(t3 - t2)}s (${Math.round(bytes.length / 1024)} KB${ackSuffix})`;
      const tag = protocol === "escpos" ? "ESCPOS IMG" : "TSPL IMG";
      console.log(`[${tag}] ${w}x${h} dots — ${summary}`);
      setTiming(summary);
      return true;
    } catch (err) {
      disconnectPrinter();
      if (err.userCancelled) return false;
      setError(err.message || String(err));
      console.error("[PRINTER BLE] Error:", err);
      return false;
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  return {
    printImageBle,
    busy,
    progress,
    timing,
    error,
    clearError: () => setError(null),
    connecting: busy,
  };
}
