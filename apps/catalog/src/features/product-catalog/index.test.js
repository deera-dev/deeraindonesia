import { describe, expect, it } from "vitest";
import * as barrel from "./index";

describe("features/product-catalog barrel", () => {
  it("mengekspor CatalogPage", () => {
    expect(barrel.CatalogPage).toBeTypeOf("function");
  });
});
