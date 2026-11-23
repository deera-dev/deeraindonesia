import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PROTOCOL, PRINTER_PROTOCOLS } from "./utils";

export const usePrinterProtocolStore = create(
  persist(
    (set) => ({
      protocol: DEFAULT_PROTOCOL,
      setProtocol: (p) => set({ protocol: PRINTER_PROTOCOLS[p] ? p : DEFAULT_PROTOCOL }),
    }),
    { name: "cetak_label_protocol_v1" },
  ),
);
