import { describe, it, expect, vi } from "vitest";

vi.mock("./pages/DashboardPage", () => ({ default: () => null }));
vi.mock("./hooks", () => ({ useDashboardStats: vi.fn() }));

import * as barrel from "./index";

describe("dashboard/index barrel", () => {
  it("exports DashboardPage", () => { expect(barrel.DashboardPage).toBeDefined(); });
  it("exports useDashboardStats", () => { expect(typeof barrel.useDashboardStats).toBe("function"); });
});
