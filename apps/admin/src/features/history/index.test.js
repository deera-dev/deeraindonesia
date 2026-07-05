import { describe, it, expect, vi } from "vitest";
vi.mock("./components/HistoryPage", () => ({ default: function HistoryPage() {} }));
const { HistoryPage } = await import("./index");
describe("features/history barrel", () => {
  it("mengekspor HistoryPage sebagai fungsi", () => {
    expect(HistoryPage).toBeTypeOf("function");
  });
});
