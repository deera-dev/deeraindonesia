/**
 * store.js — draft isian tab Ringkasan (Beli Gas, Persiapan ATK, Tambahan Lain,
 * Pettycash, potongan kasbon) per periode gajian. Disimpan lokal (persist) supaya
 * TIDAK hilang saat pindah tab / refresh sebelum "Simpan sebagai Draft" ditekan.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useRingkasanDraftStore = create(
  persist(
    (set) => ({
      drafts: {}, // { [gajianId]: { pettycashEnabled, tambahan, beliGasEnabled, atkInput, kasbonDeds } }
      setField: (id, key, value) =>
        set((s) => ({ drafts: { ...s.drafts, [id]: { ...(s.drafts[id] ?? {}), [key]: value } } })),
      clear: (id) =>
        set((s) => {
          const { [id]: _drop, ...rest } = s.drafts;
          return { drafts: rest };
        }),
    }),
    { name: "gajian_ringkasan_draft_v1" },
  ),
);
