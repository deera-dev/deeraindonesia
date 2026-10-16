import { describe, it, expect } from "vitest";
import { useVisitorStore } from "./store";

describe("useVisitorStore", () => {
  it("membuat visitorId sekali dan menggunakannya kembali", () => {
    const a = useVisitorStore.getState().ensureVisitorId();
    const b = useVisitorStore.getState().ensureVisitorId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });
});
