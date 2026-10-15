import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLaporanSubTab } from "./hooks";
import { useLaporanSubTabStore } from "./store";

describe("useLaporanSubTab", () => {
  it("default transaksi lalu bisa diganti dan meta ikut berubah", () => {
    useLaporanSubTabStore.setState({ subTab: "transaksi" });
    const { result } = renderHook(() => useLaporanSubTab());
    expect(result.current.subTab).toBe("transaksi");
    expect(result.current.meta.label).toBe("Transaksi");
    act(() => result.current.setSubTab("stok"));
    expect(result.current.meta.label).toBe("Stok");
  });
});
