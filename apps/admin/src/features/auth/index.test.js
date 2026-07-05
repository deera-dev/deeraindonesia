import { describe, it, expect } from "vitest";
import * as barrel from "./index";

describe("features/auth barrel", () => {
  it("mengekspor LoginPage", () => {
    expect(barrel.LoginPage).toBeTypeOf("function");
  });
});
