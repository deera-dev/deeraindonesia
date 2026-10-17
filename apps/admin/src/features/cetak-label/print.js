import { rgbaToGray, grayToBitmap } from "@deera/shared/lib/tsplImage";
import { writeBleFast, bleConnect, scheduleIdleDisconnect, disconnectPrinter } from "@deera/shared/lib/blePrinter";
import { labelGray } from "./render";
import { buildLabelJob, concatJobs } from "./utils";

export async function printLabels(items, { onProgress } = {}) {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth tidak tersedia. Pakai Chrome/Edge di HP/PC dengan Bluetooth aktif (HTTPS).");
  }
  const jobs = await Promise.all(
    items
      .filter((it) => it.qty > 0)
      .map(async (it) => {
        const { data, w, h } = await labelGray(it);
        const bitmap = grayToBitmap(rgbaToGray(data, w, h), w, h, { algorithm: "binary" });
        return buildLabelJob(bitmap, it.qty);
      }),
  );
  if (jobs.length === 0) throw new Error("Jumlah cetak masih 0.");
  const bytes = concatJobs(jobs);
  try {
    onProgress?.({ stage: "connect", pct: 0 });
    const conn = await bleConnect();
    await writeBleFast(conn.char, bytes, { onProgress: (p) => onProgress?.({ stage: "send", pct: Math.round(p * 100) }) });
    scheduleIdleDisconnect();
  } catch (err) {
    disconnectPrinter();
    throw err;
  }
}
