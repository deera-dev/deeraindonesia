import { describe, expect, it } from "vitest";
import { fmtRelative } from "./utils";

describe("fmtRelative", () => {
  const now = new Date("2026-10-16T12:00:00Z").getTime();
  it("format menit, jam, hari", () => {
    expect(fmtRelative("2026-10-16T11:59:50Z", now)).toBe("baru saja");
    expect(fmtRelative("2026-10-16T11:30:00Z", now)).toBe("30 mnt lalu");
    expect(fmtRelative("2026-10-16T09:00:00Z", now)).toBe("3 jam lalu");
    expect(fmtRelative("2026-10-14T12:00:00Z", now)).toBe("2 hari lalu");
  });
});
