import { describe, it, expect, vi } from "vitest";
vi.mock("./components/PindahStokLokasiModal", () => ({ default: function PindahStokLokasiModal() {} }));
const { PindahStokLokasiModal } = await import("./index");
describe("features/pindah-stok-lokasi barrel", () => {
  it("mengekspor PindahStokLokasiModal sebagai fungsi", () => {
    expect(PindahStokLokasiModal).toBeTypeOf("function");
  });
});
