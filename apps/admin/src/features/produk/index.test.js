import { describe, expect, it, vi } from "vitest";

vi.mock("./components/AdminPage", () => ({ default: function AdminPage() {} }));

const { AdminPage } = await import("./index");

describe("features/produk barrel", () => {
  it("mengekspor AdminPage sebagai fungsi", () => {
    expect(AdminPage).toBeTypeOf("function");
  });
});
