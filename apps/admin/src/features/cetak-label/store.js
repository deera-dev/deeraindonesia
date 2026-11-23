import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_ESCPOS_PAPER_WIDTH,
  DEFAULT_PROTOCOL,
  ESCPOS_PAPER_WIDTHS,
  PRINTER_PROTOCOLS,
} from "./utils";

export const usePrinterProtocolStore = create(
  persist(
    (set) => ({
      protocol: DEFAULT_PROTOCOL,
      setProtocol: (p) => set({ protocol: PRINTER_PROTOCOLS[p] ? p : DEFAULT_PROTOCOL }),
      escposPaperWidthMm: DEFAULT_ESCPOS_PAPER_WIDTH,
      setEscposPaperWidthMm: (w) =>
        set({ escposPaperWidthMm: ESCPOS_PAPER_WIDTHS[w] ? w : DEFAULT_ESCPOS_PAPER_WIDTH }),
    }),
    { name: "cetak_label_protocol_v1" },
  ),
);
