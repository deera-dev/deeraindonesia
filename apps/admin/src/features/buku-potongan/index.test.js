import { describe, expect, it, vi } from "vitest";

vi.mock("./components/BukuPotonganPage", () => ({ default: function BukuPotonganPage() {} }));
const { BukuPotonganPage } = await import("./index");
describe("features/buku-potongan barrel", () => {
  it("mengekspor BukuPotonganPage sebagai fungsi", () => {
    expect(BukuPotonganPage).toBeTypeOf("function");
  });
});
