import { describe, expect, it } from "vitest";
import { useVisitorStore } from "./store";

describe("useVisitorStore", () => {
  it("membuat visitorId sekali dan menggunakannya kembali", () => {
    const a = useVisitorStore.getState().ensureVisitorId();
    const b = useVisitorStore.getState().ensureVisitorId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });
  it("penanda tim internal default false dan bisa diaktifkan", () => {
    expect(useVisitorStore.getState().internal).toBe(false);
    useVisitorStore.getState().markInternal();
    expect(useVisitorStore.getState().internal).toBe(true);
  });
});
