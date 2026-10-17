import { create } from "zustand";
import { defaultDateRange, dateRangeForDays } from "./utils";
import { TREND_GRANULARITIES, DATE_PRESETS, DEFAULT_DATE_PRESET } from "./constants";

const DEFAULT_GRANULARITY = TREND_GRANULARITIES[0].value;

function initialFilter() {
  const { fromDate, toDate } = defaultDateRange();
  return {
    fromDate,
    toDate,
    location: null,
    kode: null,
  };
}

export const useAnalyticsFilterStore = create((set) => ({
  filter: initialFilter(),
  granularity: DEFAULT_GRANULARITY,
  datePreset: DEFAULT_DATE_PRESET,

  setDateRange: (fromDate, toDate) =>
    set((s) => ({ filter: { ...s.filter, fromDate, toDate } })),
  setLocation: (location) => set((s) => ({ filter: { ...s.filter, location } })),
  setKode: (kode) => set((s) => ({ filter: { ...s.filter, kode } })),
  setGranularity: (granularity) => set({ granularity }),

  setDatePreset: (presetKey) =>
    set((s) => {
      const preset = DATE_PRESETS.find((p) => p.key === presetKey);
      if (!preset || preset.key === "custom") {
        return { datePreset: presetKey };
      }
      const { fromDate, toDate } = dateRangeForDays(preset.days);
      return { datePreset: presetKey, filter: { ...s.filter, fromDate, toDate } };
    }),

  resetFilter: () =>
    set({ filter: initialFilter(), granularity: DEFAULT_GRANULARITY, datePreset: DEFAULT_DATE_PRESET }),
}));
