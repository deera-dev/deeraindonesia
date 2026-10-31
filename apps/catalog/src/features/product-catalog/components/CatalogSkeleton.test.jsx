import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CatalogSkeleton from "./CatalogSkeleton";

describe("CatalogSkeleton", () => {
  it("render tanpa error dengan kelas animate-pulse", () => {
    const { container } = render(<CatalogSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});
