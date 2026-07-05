import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchProduksiBatches: vi.fn().mockResolvedValue([{ id: "b1" }]),
  fetchTagihanJatuhTempo: vi.fn().mockResolvedValue([{ id: "t1" }]),
}));

import { produksiLaporanKeys, useProduksiBatchesQuery, useTagihanJatuhTempoQuery } from "./queries";

const wrapper = createWrapper();
beforeEach(() => vi.clearAllMocks());

describe("produksiLaporanKeys", () => {
  it("has all key", () => {
    expect(produksiLaporanKeys.all).toEqual(["produksi-laporan"]);
  });
  it("batches key includes dates", () => {
    expect(produksiLaporanKeys.batches("2024-01-01", "2024-01-31")).toContain("batches");
  });
  it("tagihan key includes dates", () => {
    expect(produksiLaporanKeys.tagihan("2024-01-01", "2024-01-31")).toContain("tagihan");
  });
});

describe("useProduksiBatchesQuery", () => {
  it("returns batch data", async () => {
    const { result } = renderHook(
      () => useProduksiBatchesQuery({ fromDate: "2024-01-01", toDate: "2024-01-31" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "b1" }]);
  });
});

describe("useTagihanJatuhTempoQuery", () => {
  it("returns tagihan data", async () => {
    const { result } = renderHook(
      () => useTagihanJatuhTempoQuery({ fromDate: "2024-01-01", toDate: "2024-01-31" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "t1" }]);
  });
});
