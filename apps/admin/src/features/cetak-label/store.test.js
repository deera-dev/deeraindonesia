import { describe, it, expect, beforeEach } from "vitest";
import { usePrinterProtocolStore } from "./store";
import { DEFAULT_ESCPOS_PAPER_WIDTH, DEFAULT_PROTOCOL } from "./utils";

beforeEach(() => {
  usePrinterProtocolStore.setState({
    protocol: DEFAULT_PROTOCOL,
    escposPaperWidthMm: DEFAULT_ESCPOS_PAPER_WIDTH,
  });
});

describe("usePrinterProtocolStore", () => {
  it("default protocol tspl", () => {
    expect(usePrinterProtocolStore.getState().protocol).toBe("tspl");
  });

  it("setProtocol mengubah protocol", () => {
    usePrinterProtocolStore.getState().setProtocol("escpos");
    expect(usePrinterProtocolStore.getState().protocol).toBe("escpos");
  });

  it("setProtocol dgn nilai tidak dikenal fallback ke default", () => {
    usePrinterProtocolStore.getState().setProtocol("escpos");
    usePrinterProtocolStore.getState().setProtocol("bluetooth-serial");
    expect(usePrinterProtocolStore.getState().protocol).toBe(DEFAULT_PROTOCOL);
  });

  it("default escposPaperWidthMm 40mm", () => {
    expect(usePrinterProtocolStore.getState().escposPaperWidthMm).toBe("40");
  });

  it("setEscposPaperWidthMm mengubah lebar kertas", () => {
    usePrinterProtocolStore.getState().setEscposPaperWidthMm("80");
    expect(usePrinterProtocolStore.getState().escposPaperWidthMm).toBe("80");
  });

  it("setEscposPaperWidthMm dgn nilai tidak dikenal fallback ke default", () => {
    usePrinterProtocolStore.getState().setEscposPaperWidthMm("80");
    usePrinterProtocolStore.getState().setEscposPaperWidthMm("100");
    expect(usePrinterProtocolStore.getState().escposPaperWidthMm).toBe(DEFAULT_ESCPOS_PAPER_WIDTH);
  });
});
