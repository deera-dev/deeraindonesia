import { describe, it, expect } from "vitest";
import * as barrel from "./index";

describe("features/favorites barrel", () => {
  it("mengekspor FavoritesPage", () => {
    expect(barrel.FavoritesPage).toBeTypeOf("function");
  });

  it("mengekspor useFavorites", () => {
    expect(barrel.useFavorites).toBeTypeOf("function");
  });
});
