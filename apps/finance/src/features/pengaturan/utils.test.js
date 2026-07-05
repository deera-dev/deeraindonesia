import { describe, it, expect } from "vitest";
import {
  TARIF_POTONG, TARIF_FINISHING_PER_PCS, TARIF_KANCING, TARIF_QA,
  TARIF_KREATIF, DEFAULT_FINANCE_CONFIG, FINANCE_CONFIG_META,
} from "./utils";

describe("TARIF_POTONG", () => {
  it("has pola and sampel", () => {
    expect(TARIF_POTONG.pola).toBeGreaterThan(0);
    expect(TARIF_POTONG.sampel).toBeGreaterThan(0);
  });
});

describe("TARIF constants", () => {
  it("TARIF_FINISHING_PER_PCS is a positive number", () => {
    expect(TARIF_FINISHING_PER_PCS).toBeGreaterThan(0);
  });
  it("TARIF_KANCING is a positive number", () => {
    expect(TARIF_KANCING).toBeGreaterThan(0);
  });
  it("TARIF_QA is a positive number", () => {
    expect(TARIF_QA).toBeGreaterThan(0);
  });
});

describe("TARIF_KREATIF", () => {
  it("has video, foto_seri, logo", () => {
    expect(TARIF_KREATIF.video).toBeGreaterThan(0);
    expect(TARIF_KREATIF.foto_seri).toBeGreaterThan(0);
    expect(TARIF_KREATIF.logo).toBeGreaterThan(0);
  });
});

describe("DEFAULT_FINANCE_CONFIG", () => {
  it("has tarif_pola and tarif_sampel", () => {
    expect(DEFAULT_FINANCE_CONFIG.tarif_pola).toBeGreaterThan(0);
    expect(DEFAULT_FINANCE_CONFIG.tarif_sampel).toBeGreaterThan(0);
  });
  it("has all finishing tarif keys", () => {
    expect(DEFAULT_FINANCE_CONFIG).toHaveProperty("tarif_gosok");
    expect(DEFAULT_FINANCE_CONFIG).toHaveProperty("tarif_kancing");
    expect(DEFAULT_FINANCE_CONFIG).toHaveProperty("tarif_qc");
  });
});

describe("FINANCE_CONFIG_META", () => {
  it("is an array with at least 10 items", () => {
    expect(FINANCE_CONFIG_META.length).toBeGreaterThanOrEqual(10);
  });
  it("each item has key, label, group", () => {
    FINANCE_CONFIG_META.forEach((m) => {
      expect(m).toHaveProperty("key");
      expect(m).toHaveProperty("label");
      expect(m).toHaveProperty("group");
    });
  });
});
