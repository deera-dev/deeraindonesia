import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnalyticsFilterStore } from "./store";
import { defaultDateRange, dateRangeForDays } from "./utils";
import { DEFAULT_DATE_PRESET } from "./constants";

const DEFAULT_RANGE = defaultDateRange();

beforeEach(() => {
  useAnalyticsFilterStore.setState({
    filter: { ...DEFAULT_RANGE, location: null, kode: null },
    granularity: "day",
    datePreset: DEFAULT_DATE_PRESET,
  });
});

describe("useAnalyticsFilterStore", () => {
  it("state awal: rentang 30 hari terakhir, location & kode null, granularity day, datePreset 30d", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    expect(result.current.filter.fromDate).toBe(DEFAULT_RANGE.fromDate);
    expect(result.current.filter.toDate).toBe(DEFAULT_RANGE.toDate);
    expect(result.current.filter.location).toBeNull();
    expect(result.current.filter.kode).toBeNull();
    expect(result.current.granularity).toBe("day");
    expect(result.current.datePreset).toBe("30d");
  });

  it("setDateRange mengubah fromDate & toDate saja", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    act(() => result.current.setDateRange("2024-01-01", "2024-01-31"));
    expect(result.current.filter.fromDate).toBe("2024-01-01");
    expect(result.current.filter.toDate).toBe("2024-01-31");
    expect(result.current.filter.location).toBeNull();
  });

  it("setLocation mengubah location saja", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    act(() => result.current.setLocation("cideng"));
    expect(result.current.filter.location).toBe("cideng");
  });

  it("setKode mengubah kode saja", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    act(() => result.current.setKode("D-07-OSK"));
    expect(result.current.filter.kode).toBe("D-07-OSK");
  });

  it("setGranularity mengubah granularity", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    act(() => result.current.setGranularity("month"));
    expect(result.current.granularity).toBe("month");
  });

  it("setDatePreset('7d') mengubah datePreset DAN mengisi ulang fromDate/toDate ke 7 hari terakhir", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    const expected = dateRangeForDays(7);
    act(() => result.current.setDatePreset("7d"));
    expect(result.current.datePreset).toBe("7d");
    expect(result.current.filter.fromDate).toBe(expected.fromDate);
    expect(result.current.filter.toDate).toBe(expected.toDate);
  });

  it("setDatePreset('1y') mengisi ulang fromDate/toDate ke 365 hari terakhir", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    const expected = dateRangeForDays(365);
    act(() => result.current.setDatePreset("1y"));
    expect(result.current.datePreset).toBe("1y");
    expect(result.current.filter.fromDate).toBe(expected.fromDate);
    expect(result.current.filter.toDate).toBe(expected.toDate);
  });

  it("setDatePreset('custom') mengubah datePreset TANPA mengubah fromDate/toDate yang sedang aktif", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    act(() => result.current.setDateRange("2024-05-01", "2024-05-10"));
    act(() => result.current.setDatePreset("custom"));
    expect(result.current.datePreset).toBe("custom");
    expect(result.current.filter.fromDate).toBe("2024-05-01");
    expect(result.current.filter.toDate).toBe("2024-05-10");
  });

  it("location/kode TIDAK ikut berubah saat setDatePreset dipanggil", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    act(() => result.current.setLocation("gudang"));
    act(() => result.current.setDatePreset("30d"));
    expect(result.current.filter.location).toBe("gudang");
  });

  it("resetFilter mengembalikan filter, granularity, & datePreset ke default", () => {
    const { result } = renderHook(() => useAnalyticsFilterStore((s) => s));
    act(() => {
      result.current.setLocation("gudang");
      result.current.setKode("D-01-OSK");
      result.current.setGranularity("year");
      result.current.setDatePreset("1y");
    });
    act(() => result.current.resetFilter());
    expect(result.current.filter.location).toBeNull();
    expect(result.current.filter.kode).toBeNull();
    expect(result.current.granularity).toBe("day");
    expect(result.current.datePreset).toBe(DEFAULT_DATE_PRESET);
  });
});
