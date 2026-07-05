import { describe, it, expect, vi } from "vitest";

vi.mock("./pages/GajianListPage", () => ({ default: () => null }));
vi.mock("./pages/GajianDetailPage", () => ({ default: () => null }));
vi.mock("./hooks", () => {
  const fns = [
    "useCmt","useCreateGajianPeriode","useDeleteCmt","useDeleteFinishing",
    "useDeleteGajianPeriode","useDeleteJahit","useDeleteKreatif","useDeletePotong",
    "useDeleteQC","useFinalizeGajian","useFinishing","useGajianDetail","useGajianList",
    "useGajianTotals","useJahit","useKaryawanIdsInGajian","useKasbonForGajian",
    "useKreatif","usePerKaryawanRincian","usePotong","useProdukList","useQC",
    "useSaveCmt","useSaveFinishing","useSaveGajianRequest","useSaveJahit",
    "useSaveKreatif","useSavePotong","useSaveQC",
  ];
  return Object.fromEntries(fns.map((n) => [n, vi.fn()]));
});

import * as barrel from "./index";

describe("gajian/index barrel", () => {
  it("exports GajianListPage", () => { expect(barrel.GajianListPage).toBeDefined(); });
  it("exports GajianDetailPage", () => { expect(barrel.GajianDetailPage).toBeDefined(); });
  it("exports all hooks", () => {
    const hooks = [
      "useCmt","useCreateGajianPeriode","useDeleteCmt","useDeleteFinishing",
      "useDeleteGajianPeriode","useDeleteJahit","useDeleteKreatif","useDeletePotong",
      "useDeleteQC","useFinalizeGajian","useFinishing","useGajianDetail","useGajianList",
      "useGajianTotals","useJahit","useKaryawanIdsInGajian","useKasbonForGajian",
      "useKreatif","usePerKaryawanRincian","usePotong","useProdukList","useQC",
      "useSaveCmt","useSaveFinishing","useSaveGajianRequest","useSaveJahit",
      "useSaveKreatif","useSavePotong","useSaveQC",
    ];
    hooks.forEach((h) => expect(barrel[h], h).toBeDefined());
  });
});
