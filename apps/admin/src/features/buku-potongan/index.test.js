import { describe, it, expect, vi } from "vitest";
vi.mock("./components/BukuPotonganPage", () => ({ default: function BukuPotonganPage() {} }));
const { BukuPotonganPage } = await import("./index");
describe("features/buku-potongan barrel", () => {
  it("mengekspor BukuPotonganPage sebagai fungsi", () => {
    expect(BukuPotonganPage).toBeTypeOf("function");
  });
});
