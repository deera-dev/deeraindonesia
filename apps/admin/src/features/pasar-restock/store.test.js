import { describe, it, expect, beforeEach } from "vitest";
import { useTargetSeriStore } from "./store";
import { DEFAULT_TARGET_SERI } from "./utils";

beforeEach(() => {
  useTargetSeriStore.setState({ targetByMarket: { ...DEFAULT_TARGET_SERI } });
});

describe("useTargetSeriStore", () => {
  it("default targetByMarket sesuai DEFAULT_TARGET_SERI (cideng 2, tegalgubug 3)", () => {
    expect(useTargetSeriStore.getState().targetByMarket).toEqual({ cideng: 2, tegalgubug: 3 });
  });

  it("setTarget mengubah hanya pasar yang diminta, pasar lain tetap", () => {
    useTargetSeriStore.getState().setTarget("cideng", 5);
    expect(useTargetSeriStore.getState().targetByMarket).toEqual({ cideng: 5, tegalgubug: 3 });
  });

  it("setTarget bisa dipanggil berkali-kali (tetap bisa diedit ulang)", () => {
    useTargetSeriStore.getState().setTarget("tegalgubug", 4);
    useTargetSeriStore.getState().setTarget("tegalgubug", 1);
    expect(useTargetSeriStore.getState().targetByMarket.tegalgubug).toBe(1);
  });
});
