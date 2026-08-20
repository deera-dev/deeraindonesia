import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createWrapper } from "../../../test/utils";

// Mock all feature pages + shared guards
vi.mock("./shared/components/ProtectedRoute", () => ({
  default: ({ children }) => <div data-testid="protected">{children}</div>,
}));
vi.mock("./features/auth", () => ({ LoginPage: () => <div>LoginPage</div> }));
vi.mock("./features/produk", () => ({ AdminPage: () => <div>AdminPage</div> }));
vi.mock("./features/history", () => ({ HistoryPage: () => <div>HistoryPage</div> }));
vi.mock("./features/transfer", () => ({ TransferPage: () => <div>TransferPage</div> }));
vi.mock("./features/stok-opname", () => ({ StokOpnamePage: () => <div>StokOpnamePage</div> }));
vi.mock("./features/buku-potongan", () => ({ BukuPotonganPage: () => <div>BukuPotonganPage</div> }));
vi.mock("./features/produksi-bahan", () => ({ ProduksiBahanPage: () => <div>ProduksiBahanPage</div> }));
vi.mock("./features/produksi-record", () => ({ ProduksiRecordPage: () => <div>ProduksiRecordPage</div> }));
vi.mock("./features/produksi-hpp", () => ({ ProduksiHPPPage: () => <div>ProduksiHPPPage</div> }));
vi.mock("./features/produksi-sampel", () => ({ ProduksiSampelPage: () => <div>ProduksiSampelPage</div> }));
vi.mock("./features/analytics", () => ({ AnalyticsPage: () => <div>AnalyticsPage</div> }));

// App uses BrowserRouter internally; to set initial URL we override history
import App from "./App";

// Helper: render with a URL set by modifying window.location
function renderAtPath(path) {
  // jsdom supports window.location via MemoryRouter inside App — but App uses BrowserRouter.
  // To test specific routes we need to set window.location before render.
  window.history.pushState({}, "", path);
  return render(<App />, { wrapper: createWrapper() });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, "", "/");
});

describe("App routing", () => {
  it("renders AdminPage at /", () => {
    renderAtPath("/");
    expect(screen.getByText("AdminPage")).toBeInTheDocument();
  });

  it("renders LoginPage at /login", () => {
    renderAtPath("/login");
    expect(screen.getByText("LoginPage")).toBeInTheDocument();
  });

  it("renders HistoryPage at /history", () => {
    renderAtPath("/history");
    expect(screen.getByText("HistoryPage")).toBeInTheDocument();
  });

  it("renders TransferPage at /transfer", () => {
    renderAtPath("/transfer");
    expect(screen.getByText("TransferPage")).toBeInTheDocument();
  });

  it("renders StokOpnamePage at /stok-opname", () => {
    renderAtPath("/stok-opname");
    expect(screen.getByText("StokOpnamePage")).toBeInTheDocument();
  });

  it("renders BukuPotonganPage at /buku-potongan", () => {
    renderAtPath("/buku-potongan");
    expect(screen.getByText("BukuPotonganPage")).toBeInTheDocument();
  });

  it("renders AnalyticsPage at /analytics", () => {
    renderAtPath("/analytics");
    expect(screen.getByText("AnalyticsPage")).toBeInTheDocument();
  });

  it("redirects /produksi to /produksi/record (Produksi, bukan Bahan — permintaan Denny 2026-08)", () => {
    renderAtPath("/produksi");
    expect(screen.getByText("ProduksiRecordPage")).toBeInTheDocument();
  });

  it("renders ProduksiBahanPage at /produksi/bahan", () => {
    renderAtPath("/produksi/bahan");
    expect(screen.getByText("ProduksiBahanPage")).toBeInTheDocument();
  });

  it("renders ProduksiRecordPage at /produksi/record", () => {
    renderAtPath("/produksi/record");
    expect(screen.getByText("ProduksiRecordPage")).toBeInTheDocument();
  });

  it("renders ProduksiHPPPage at /produksi/hpp", () => {
    renderAtPath("/produksi/hpp");
    expect(screen.getByText("ProduksiHPPPage")).toBeInTheDocument();
  });

  it("redirects unknown /produksi sub-routes (mis. bekas /produksi/laporan, dihapus 2026-07-19) ke /", () => {
    renderAtPath("/produksi/laporan");
    expect(screen.getByText("AdminPage")).toBeInTheDocument();
  });

  it("renders ProduksiSampelPage at /produksi/sampel", () => {
    renderAtPath("/produksi/sampel");
    expect(screen.getByText("ProduksiSampelPage")).toBeInTheDocument();
  });

  it("redirects unknown routes to /", () => {
    renderAtPath("/unknown-page");
    expect(screen.getByText("AdminPage")).toBeInTheDocument();
  });
});
