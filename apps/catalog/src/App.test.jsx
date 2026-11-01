import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./features/product-catalog", () => ({
  CatalogPage: () => <div>CATALOG-PAGE</div>,
}));
vi.mock("./features/product-detail", () => ({
  ProductDetailPage: () => <div>PRODUCT-DETAIL-PAGE</div>,
}));
vi.mock("./features/favorites", () => ({
  FavoritesPage: () => <div>FAVORITES-PAGE</div>,
}));

const { default: App } = await import("./App");
const { router } = await import("./router");

async function renderAt(path) {
  const result = render(<App />);
  await router.navigate({ to: path });
  return result;
}

afterEach(async () => {
  await router.navigate({ to: "/" });
});

describe("App routing", () => {
  it("redirect dari / ke /catalog", async () => {
    await renderAt("/");
    expect(screen.getByText("CATALOG-PAGE")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/catalog");
  });

  it("QR /q/:kode dialihkan ke /code/:kode", async () => {
    await renderAt("/q/D-07-OSK");
    expect(screen.getByText("PRODUCT-DETAIL-PAGE")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/code/D-07-OSK");
  });

  it("QR struk /s dialihkan ke /catalog", async () => {
    await renderAt("/s");
    expect(screen.getByText("CATALOG-PAGE")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/catalog");
  });

  it("barcode kartu jahit /j/:id dialihkan ke /catalog", async () => {
    await renderAt("/j/11111111-2222-3333-4444-555555555555");
    expect(screen.getByText("CATALOG-PAGE")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/catalog");
  });

  it("render CatalogPage di /catalog", async () => {
    await renderAt("/catalog");
    expect(screen.getByText("CATALOG-PAGE")).toBeInTheDocument();
  });

  it("render ProductDetailPage di /code/:kode", async () => {
    await renderAt("/code/D-07-OSK");
    expect(screen.getByText("PRODUCT-DETAIL-PAGE")).toBeInTheDocument();
  });

  it("redirect ke /catalog untuk path yang tidak dikenal", async () => {
    await renderAt("/halaman-tidak-ada");
    expect(screen.getByText("CATALOG-PAGE")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/catalog");
  });

  it("render FavoritesPage di /favorit", async () => {
    await renderAt("/favorit");
    expect(screen.getByText("FAVORITES-PAGE")).toBeInTheDocument();
  });
});
