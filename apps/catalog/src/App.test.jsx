import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./features/product-catalog", () => ({
  CatalogPage: () => <div>CATALOG-PAGE</div>,
}));
vi.mock("./features/product-detail", () => ({
  ProductDetailPage: () => <div>PRODUCT-DETAIL-PAGE</div>,
}));

const { default: App } = await import("./App");

function renderAt(path) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

afterEach(() => {
  window.history.pushState({}, "", "/");
});

describe("App routing", () => {
  it("redirect dari / ke /catalog", () => {
    renderAt("/");
    expect(screen.getByText("CATALOG-PAGE")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/catalog");
  });

  it("render CatalogPage di /catalog", () => {
    renderAt("/catalog");
    expect(screen.getByText("CATALOG-PAGE")).toBeInTheDocument();
  });

  it("render ProductDetailPage di /code/:kode", () => {
    renderAt("/code/D-07-OSK");
    expect(screen.getByText("PRODUCT-DETAIL-PAGE")).toBeInTheDocument();
  });

  it("redirect ke /catalog untuk path yang tidak dikenal", () => {
    renderAt("/halaman-tidak-ada");
    expect(screen.getByText("CATALOG-PAGE")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/catalog");
  });
});
