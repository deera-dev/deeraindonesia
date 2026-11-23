import { describe, it, expect, beforeEach } from "vitest";
import { usePrinterProtocolStore } from "./store";
import { DEFAULT_PROTOCOL } from "./utils";

beforeEach(() => {
  usePrinterProtocolStore.setState({ protocol: DEFAULT_PROTOCOL });
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
});
