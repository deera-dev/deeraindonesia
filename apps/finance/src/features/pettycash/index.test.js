import { describe, it, expect, vi } from "vitest";

vi.mock("./pages/PettycashPage", () => ({ default: () => null }));
vi.mock("./hooks", () => ({
  usePettycashAll: vi.fn(), useSavePettycash: vi.fn(), useDeletePettycash: vi.fn(),
}));
vi.mock("./utils", () => ({ PETTYCASH_KATEGORI_OPTIONS: [] }));

import * as barrel from "./index";

describe("pettycash/index barrel", () => {
  it("exports PettycashPage", () => { expect(barrel.PettycashPage).toBeDefined(); });
  it("exports hooks", () => {
    expect(barrel.usePettycashAll).toBeDefined();
    expect(barrel.useSavePettycash).toBeDefined();
    expect(barrel.useDeletePettycash).toBeDefined();
  });
  it("exports PETTYCASH_KATEGORI_OPTIONS", () => { expect(barrel.PETTYCASH_KATEGORI_OPTIONS).toBeDefined(); });
});
