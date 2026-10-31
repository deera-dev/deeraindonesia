import { describe, expect, it } from "vitest";
import {
  buildLabelJob,
  buildLabelRows,
  clampCopies,
  concatJobs,
  LABEL_H,
  LABEL_W,
  labelText,
  labelUrl,
  totalCopies,
} from "./utils";

describe("cetak-label utils", () => {
  it("labelText: strip dash, huruf besar, tambah ukuran", () => {
    expect(labelText("D-59-DMD", "Midi")).toBe("D 59 DMD MIDI");
    expect(labelText("D-055-TEN", "Midi Jumbo")).toBe("D 055 TEN MIDI JUMBO");
  });
  it("labelUrl memakai jalur pendek /q/KODE", () => {
    expect(labelUrl("D-59-DMD")).toBe("https://deera.id/q/D-59-DMD");
  });
  it("buildLabelRows: default qty = produksi per ukuran", () => {
    expect(buildLabelRows({ Midi: 45, Gamis: "10" })).toEqual([
      { size: "Midi", produced: 45, qty: 45 },
      { size: "Gamis", produced: 10, qty: 10 },
    ]);
    expect(buildLabelRows(null)).toEqual([]);
  });
  it("clampCopies & totalCopies", () => {
    expect(clampCopies("12")).toBe(12);
    expect(clampCopies("-3")).toBe(0);
    expect(clampCopies("abc")).toBe(0);
    expect(clampCopies("99999")).toBe(999);
    expect(totalCopies([{ qty: 2 }, { qty: 3 }])).toBe(5);
  });
  it("buildLabelJob: SIZE 40x30, bitmap sekali, PRINT 1,N", () => {
    const bitmap = { widthBytes: 40, height: 240, bytes: new Uint8Array(40 * 240).fill(0xff) };
    const job = buildLabelJob(bitmap, 7);
    const text = new TextDecoder("latin1").decode(job);
    expect(text).toContain("SIZE 40 mm,30 mm");
    expect(text).toContain("BITMAP 0,0,40,240,0,");
    expect(text).toContain("PRINT 1,7");
    expect(LABEL_W / 8).toBe(40);
    expect(LABEL_H).toBe(240);
    expect(concatJobs([job, job]).length).toBe(job.length * 2);
  });
});
