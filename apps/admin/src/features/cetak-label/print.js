import { rgbaToGray, grayToBitmap } from "@deera/shared/lib/tsplImage";
import {
  writeBleFast,
  bleConnect,
  scheduleIdleDisconnect,
  disconnectPrinter,
} from "@deera/shared/lib/blePrinter";
import { labelGray } from "./render";
import { buildLabelJob, buildLabelJobEscPos, concatJobs, DEFAULT_PROTOCOL } from "./utils";

export async function printLabels(items, { onProgress, protocol = DEFAULT_PROTOCOL } = {}) {
  if (!navigator.bluetooth) {
    throw new Error(
      "Web Bluetooth tidak tersedia. Pakai Chrome/Edge di HP/PC dengan Bluetooth aktif (HTTPS).",
    );
  }
  const isEscPos = protocol === "escpos";
  const jobs = await Promise.all(
    items
      .filter((it) => it.qty > 0)
      .map(async (it) => {
        const { data, w, h } = await labelGray(it);
        // ESC/POS "GS v 0": bit=1 = hitam -- kebalikan konvensi TSPL
        // (bit=0 = hitam), sama seperti di POS (useTsplPrinter.js).
        const bitmap = grayToBitmap(rgbaToGray(data, w, h), w, h, {
          algorithm: "binary",
          invert: isEscPos,
        });
        return isEscPos ? buildLabelJobEscPos(bitmap, it.qty) : buildLabelJob(bitmap, it.qty);
      }),
  );
  if (jobs.length === 0) throw new Error("Jumlah cetak masih 0.");
  const bytes = concatJobs(jobs);
  try {
    onProgress?.({ stage: "connect", pct: 0 });
    const conn = await bleConnect();
    await writeBleFast(conn.char, bytes, {
      onProgress: (p) => onProgress?.({ stage: "send", pct: Math.round(p * 100) }),
    });
    // ESC/POS (CASHCOW CT-321B & sejenisnya) -- sama seperti di POS
    // (useTsplPrinter.js), chip jembatan serial-nya kadang diam di print
    // kedua pada koneksi yang sama, jadi putus & connect ulang tiap print
    // alih-alih idle-cache 60dtk spt TSPL.
    if (isEscPos) disconnectPrinter();
    else scheduleIdleDisconnect();
  } catch (err) {
    disconnectPrinter();
    throw err;
  }
}
