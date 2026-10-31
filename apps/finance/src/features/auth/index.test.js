import { describe, expect, it, vi } from "vitest";

vi.mock("./components/LoginPage", () => ({ default: () => null }));

import * as barrel from "./index";

describe("auth/index barrel", () => {
  it("exports LoginPage", () => {
    expect(barrel.LoginPage).toBeDefined();
  });
});
