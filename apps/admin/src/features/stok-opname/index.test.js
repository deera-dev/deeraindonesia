import { describe, it, expect, vi } from "vitest";
vi.mock("./components/StokOpnamePage", () => ({ default: function StokOpnamePage() {} }));
const { StokOpnamePage } = await import("./index");
describe("features/stok-opname barrel", () => {
  it("mengekspor StokOpnamePage sebagai fungsi", () => {
    expect(StokOpnamePage).toBeTypeOf("function");
  });
});
