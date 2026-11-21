import { create } from "zustand";
import { DATE_PRESETS, DEFAULT_DATE_PRESET, TREND_GRANULARITIES } from "./constants";
import type { AnalyticsFilter } from "./schema";
import { dateRangeForDays, defaultDateRange } from "./utils";

const DEFAULT_GRANULARITY = TREND_GRANULARITIES[0]!.value;

function initialFilter(): AnalyticsFilter {
  const { fromDate, toDate } = defaultDateRange();
  return {
    fromDate,
    toDate,
    location: null,
    kode: null,
  };
}

interface AnalyticsFilterState {
  filter: AnalyticsFilter;
  granularity: string;
  datePreset: string;
  setDateRange: (fromDate: string, toDate: string) => void;
  setLocation: (location: string | null) => void;
  setKode: (kode: string | null) => void;
  setGranularity: (granularity: string) => void;
  setDatePreset: (presetKey: string) => void;
  resetFilter: () => void;
}

export const useAnalyticsFilterStore = create<AnalyticsFilterState>()((set) => ({
  filter: initialFilter(),
  granularity: DEFAULT_GRANULARITY,
  datePreset: DEFAULT_DATE_PRESET,

  setDateRange: (fromDate, toDate) => set((s) => ({ filter: { ...s.filter, fromDate, toDate } })),
  setLocation: (location) => set((s) => ({ filter: { ...s.filter, location } })),
  setKode: (kode) => set((s) => ({ filter: { ...s.filter, kode } })),
  setGranularity: (granularity) => set({ granularity }),

  setDatePreset: (presetKey) =>
    set((s) => {
      const preset = DATE_PRESETS.find((p) => p.key === presetKey);
      if (!preset || preset.key === "custom") {
        return { datePreset: presetKey };
      }
      const { fromDate, toDate } = dateRangeForDays(preset.days!);
      return { datePreset: presetKey, filter: { ...s.filter, fromDate, toDate } };
    }),

  resetFilter: () =>
    set({
      filter: initialFilter(),
      granularity: DEFAULT_GRANULARITY,
      datePreset: DEFAULT_DATE_PRESET,
    }),
}));
