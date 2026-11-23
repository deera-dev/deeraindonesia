import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../produk/hooks", () => ({
  useProducedByKode: vi.fn(),
}));
const printLabelsMock = vi.fn();
vi.mock("./print", () => ({
  printLabels: (...a) => printLabelsMock(...a),
}));

import { useProducedByKode } from "../produk/hooks";
import { useLabelPrint } from "./hooks";
import { usePrinterProtocolStore } from "./store";
import { DEFAULT_PROTOCOL } from "./utils";

beforeEach(() => {
  printLabelsMock.mockReset().mockResolvedValue(undefined);
  useProducedByKode.mockReturnValue({ producedBySize: { Midi: 10 }, isLoading: false });
  usePrinterProtocolStore.setState({ protocol: DEFAULT_PROTOCOL });
});

describe("useLabelPrint", () => {
  it("default protocol tspl, diteruskan ke printLabels()", async () => {
    const { result } = renderHook(() => useLabelPrint("D-1"));
    expect(result.current.protocol).toBe("tspl");
    await act(async () => {
      await result.current.print();
    });
    expect(printLabelsMock).toHaveBeenCalledWith(
      [{ kode: "D-1", size: "Midi", qty: 10 }],
      expect.objectContaining({ protocol: "tspl" }),
    );
  });

  it("setProtocol('escpos') -> print() meneruskan protocol escpos", async () => {
    const { result } = renderHook(() => useLabelPrint("D-1"));
    act(() => {
      result.current.setProtocol("escpos");
    });
    const { result: result2 } = renderHook(() => useLabelPrint("D-1"));
    await act(async () => {
      await result2.current.print();
    });
    expect(printLabelsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ protocol: "escpos" }),
    );
  });
});
