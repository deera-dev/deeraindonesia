import { describe, it, expect, vi, beforeEach } from "vitest";

const push = vi.fn();
const fakeState = { push };

vi.mock("./store", () => ({
  useToastStore: { getState: () => fakeState },
}));

const { toast, useToastStore } = await import("./hooks");

describe("toast singleton", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("toast.success memanggil store.push('success', msg)", () => {
    toast.success("Data berhasil disimpan");
    expect(push).toHaveBeenCalledWith("success", "Data berhasil disimpan");
  });

  it("toast.error memanggil store.push('error', msg)", () => {
    toast.error("Terjadi kesalahan");
    expect(push).toHaveBeenCalledWith("error", "Terjadi kesalahan");
  });

  it("toast.warn memanggil store.push('warn', msg)", () => {
    toast.warn("Perhatian");
    expect(push).toHaveBeenCalledWith("warn", "Perhatian");
  });

  it("re-export useToastStore tersedia untuk komponen (ToastContainer)", () => {
    expect(useToastStore.getState()).toBe(fakeState);
  });
});
