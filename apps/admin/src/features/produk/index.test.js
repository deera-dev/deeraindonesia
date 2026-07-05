import { describe, it, expect, vi } from "vitest";

vi.mock("./components/AdminPage", () => ({ default: function AdminPage() {} }));

const { AdminPage } = await import("./index");

describe("features/produk barrel", () => {
  it("mengekspor AdminPage sebagai fungsi", () => {
    expect(AdminPage).toBeTypeOf("function");
  });
});
