import { describe, it, expect, vi } from "vitest";

vi.mock("./pages/PengaturanPage", () => ({ default: () => null }));
vi.mock("./hooks", () => ({ useFinanceConfig: vi.fn(), useSaveFinanceConfig: vi.fn() }));
vi.mock("./utils", () => ({ DEFAULT_FINANCE_CONFIG: {}, FINANCE_CONFIG_META: {} }));

import * as barrel from "./index";

describe("pengaturan/index barrel", () => {
  it("exports PengaturanPage", () => { expect(barrel.PengaturanPage).toBeDefined(); });
  it("exports useFinanceConfig and useSaveFinanceConfig", () => {
    expect(barrel.useFinanceConfig).toBeDefined();
    expect(barrel.useSaveFinanceConfig).toBeDefined();
  });
  it("exports DEFAULT_FINANCE_CONFIG and FINANCE_CONFIG_META", () => {
    expect(barrel.DEFAULT_FINANCE_CONFIG).toBeDefined();
    expect(barrel.FINANCE_CONFIG_META).toBeDefined();
  });
});
