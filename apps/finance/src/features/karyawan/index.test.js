import { describe, it, expect, vi } from "vitest";

vi.mock("./pages/KaryawanPage", () => ({ default: () => null }));
vi.mock("./hooks", () => ({
  useKaryawanAktif: vi.fn(), useKaryawanList: vi.fn(),
  useSaveKaryawan: vi.fn(), useToggleKaryawanAktif: vi.fn(),
}));
vi.mock("./utils", () => ({ TIM_OPTIONS: [], timLabel: vi.fn() }));

import * as barrel from "./index";

describe("karyawan/index barrel", () => {
  it("exports KaryawanPage", () => { expect(barrel.KaryawanPage).toBeDefined(); });
  it("exports hooks", () => {
    expect(barrel.useKaryawanAktif).toBeDefined();
    expect(barrel.useKaryawanList).toBeDefined();
    expect(barrel.useSaveKaryawan).toBeDefined();
    expect(barrel.useToggleKaryawanAktif).toBeDefined();
  });
  it("exports TIM_OPTIONS and timLabel", () => {
    expect(barrel.TIM_OPTIONS).toBeDefined();
    expect(barrel.timLabel).toBeDefined();
  });
});
