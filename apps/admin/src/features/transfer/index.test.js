import { describe, it, expect, vi } from "vitest";
vi.mock("./components/TransferPage", () => ({ default: function TransferPage() {} }));
const { TransferPage } = await import("./index");
describe("features/transfer barrel", () => {
  it("mengekspor TransferPage sebagai fungsi", () => {
    expect(TransferPage).toBeTypeOf("function");
  });
});
