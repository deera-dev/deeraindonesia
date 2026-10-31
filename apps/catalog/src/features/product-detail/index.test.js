import { describe, expect, it } from "vitest";
import * as barrel from "./index";

describe("features/product-detail barrel", () => {
  it("mengekspor ProductDetailPage", () => {
    expect(barrel.ProductDetailPage).toBeTypeOf("function");
  });
});
