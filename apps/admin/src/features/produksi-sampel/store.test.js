import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWoDraftStore } from "./store";

beforeEach(() => {
  useWoDraftStore.setState({ drafts: {} });
});

describe("useWoDraftStore", () => {
  it("state awal: drafts kosong", () => {
    const { result } = renderHook(() => useWoDraftStore((s) => s));
    expect(result.current.drafts).toEqual({});
  });

  it("saveDraft: menyimpan draft baru per sampelId", () => {
    const { result } = renderHook(() => useWoDraftStore((s) => s));

    act(() => {
      result.current.saveDraft("s1", { sizes: ["Midi"] });
    });

    expect(result.current.drafts.s1).toEqual({ sizes: ["Midi"] });
  });

  it("saveDraft: merge partial ke draft yang sudah ada, bukan overwrite total", () => {
    const { result } = renderHook(() => useWoDraftStore((s) => s));

    act(() => {
      result.current.saveDraft("s1", { sizes: ["Midi"], selectedFotos: ["a.jpg"] });
    });
    act(() => {
      result.current.saveDraft("s1", { sizes: ["Gamis"] });
    });

    expect(result.current.drafts.s1).toEqual({ sizes: ["Gamis"], selectedFotos: ["a.jpg"] });
  });

  it("saveDraft: draft antar sampelId independen (tidak tercampur)", () => {
    const { result } = renderHook(() => useWoDraftStore((s) => s));

    act(() => {
      result.current.saveDraft("s1", { sizes: ["Midi"] });
      result.current.saveDraft("s2", { sizes: ["Gamis"] });
    });

    expect(result.current.drafts.s1).toEqual({ sizes: ["Midi"] });
    expect(result.current.drafts.s2).toEqual({ sizes: ["Gamis"] });
  });

  it("clearDraft: menghapus draft sampelId itu saja, draft sampel lain tetap ada", () => {
    const { result } = renderHook(() => useWoDraftStore((s) => s));

    act(() => {
      result.current.saveDraft("s1", { sizes: ["Midi"] });
      result.current.saveDraft("s2", { sizes: ["Gamis"] });
    });
    act(() => {
      result.current.clearDraft("s1");
    });

    expect(result.current.drafts.s1).toBeUndefined();
    expect(result.current.drafts.s2).toEqual({ sizes: ["Gamis"] });
  });

  it("clearDraft: sampelId yang tidak ada draftnya tidak error", () => {
    const { result } = renderHook(() => useWoDraftStore((s) => s));
    expect(() => {
      act(() => {
        result.current.clearDraft("tidak-ada");
      });
    }).not.toThrow();
  });
});
