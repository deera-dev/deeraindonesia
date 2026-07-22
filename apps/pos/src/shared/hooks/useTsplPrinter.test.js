import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@deera/shared/lib/storeInfo", () => ({
  STORE_INFO: { nama: "DEERA", wa: "628111", rekening: [] },
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" },
}));
vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));

import { useTsplPrinter, LABEL_TYPES, PAPER_WIDTHS } from "./useTsplPrinter";

const saleMock = {
  buyer_name: "BUDI",
  date: "2026-07-04",
  type: "sale",
  location: "gudang",
  total: 100000,
  discount: 0,
  items: [{ kode: "D-01", size: "Midi", qty: 1, harga: 100000 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  delete navigator.bluetooth;
});

describe("LABEL_TYPES", () => {
  it("has continuous and gapped types", () => {
    expect(LABEL_TYPES.continuous).toBeDefined();
    expect(LABEL_TYPES.gapped).toBeDefined();
  });

  it("continuous has gapMm=0", () => {
    expect(LABEL_TYPES.continuous.gapMm).toBe(0);
  });
});

describe("PAPER_WIDTHS", () => {
  it("has 100 and 78 mm options", () => {
    expect(PAPER_WIDTHS[100]).toBeDefined();
    expect(PAPER_WIDTHS[78]).toBeDefined();
  });

  it("100mm keeps the original dot count (800) unchanged", () => {
    expect(PAPER_WIDTHS[100].dots).toBe(800);
  });

  it("78mm uses 623 dots (round(78 * 203/25.4))", () => {
    expect(PAPER_WIDTHS[78].dots).toBe(623);
  });
});

describe("useTsplPrinter", () => {
  it("initializes with busy=false and error=null", () => {
    const { result } = renderHook(() => useTsplPrinter());
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns printBle function", () => {
    const { result } = renderHook(() => useTsplPrinter());
    expect(typeof result.current.printBle).toBe("function");
  });

  it("returns clearError function", () => {
    const { result } = renderHook(() => useTsplPrinter());
    expect(typeof result.current.clearError).toBe("function");
  });

  it("sets error when bluetooth not available", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    await act(async () => {
      await result.current.printBle(saleMock, "continuous");
    });
    expect(result.current.error).toContain("Web Bluetooth");
  });

  it("accepts an explicit paperWidthMm argument without throwing", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    let ret;
    await act(async () => {
      ret = await result.current.printBle(saleMock, "continuous", "78");
    });
    // Bluetooth tetap tidak tersedia di jsdom — cukup pastikan tidak crash
    // dan tetap mengembalikan false seperti perilaku default (100mm) lama.
    expect(ret).toBe(false);
  });

  it("returns false when bluetooth not available", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    let ret;
    await act(async () => {
      ret = await result.current.printBle(saleMock, "continuous");
    });
    expect(ret).toBe(false);
  });

  it("clearError resets error to null", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    await act(async () => {
      await result.current.printBle(saleMock);
    });
    expect(result.current.error).not.toBeNull();
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("sets busy=false after printBle completes", async () => {
    const { result } = renderHook(() => useTsplPrinter());
    await act(async () => {
      await result.current.printBle(saleMock);
    });
    expect(result.current.busy).toBe(false);
  });

  it("returns false when NotFoundError thrown by bluetooth", async () => {
    Object.defineProperty(navigator, "bluetooth", {
      value: {
        requestDevice: vi.fn().mockRejectedValue(Object.assign(new Error("User cancelled"), { name: "NotFoundError" })),
      },
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useTsplPrinter());
    let ret;
    await act(async () => {
      ret = await result.current.printBle(saleMock, "continuous");
    });
    expect(ret).toBe(false);
    expect(result.current.error).toBeNull(); // NotFoundError doesn't set error
    delete navigator.bluetooth;
  });
});
