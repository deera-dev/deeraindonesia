import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("./pages/KasbonPage", () => ({ default: vi.fn(() => null) }));
vi.mock("./hooks", () => ({
  useKasbonList: vi.fn(),
  useKasbonBelumLunasByKaryawanIds: vi.fn(),
  useCreateOrAccumulateKasbon: vi.fn(),
  useUpdateKasbonJumlah: vi.fn(),
  useDeleteKasbon: vi.fn(),
  usePayCicilan: vi.fn(),
  useApplyKasbonDeduction: vi.fn(),
}));

import {
  KasbonPage,
  useKasbonList,
  useKasbonBelumLunasByKaryawanIds,
  useCreateOrAccumulateKasbon,
  useUpdateKasbonJumlah,
  useDeleteKasbon,
  usePayCicilan,
  useApplyKasbonDeduction,
} from "./index";

describe("kasbon/index — barrel re-exports", () => {
  it("exports KasbonPage", () => { expect(KasbonPage).toBeDefined(); });
  it("exports useKasbonList", () => { expect(useKasbonList).toBeDefined(); });
  it("exports useKasbonBelumLunasByKaryawanIds", () => { expect(useKasbonBelumLunasByKaryawanIds).toBeDefined(); });
  it("exports useCreateOrAccumulateKasbon", () => { expect(useCreateOrAccumulateKasbon).toBeDefined(); });
  it("exports useUpdateKasbonJumlah", () => { expect(useUpdateKasbonJumlah).toBeDefined(); });
  it("exports useDeleteKasbon", () => { expect(useDeleteKasbon).toBeDefined(); });
  it("exports usePayCicilan", () => { expect(usePayCicilan).toBeDefined(); });
  it("exports useApplyKasbonDeduction", () => { expect(useApplyKasbonDeduction).toBeDefined(); });
});
