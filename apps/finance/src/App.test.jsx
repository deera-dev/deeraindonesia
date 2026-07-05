import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock BrowserRouter so we can wrap in MemoryRouter
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, BrowserRouter: ({ children }) => <>{children}</> };
});

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(() => ({ user: { email: "u@u.com" }, loading: false })),
}));
vi.mock("./features/auth", () => ({ LoginPage: () => <div data-testid="login-page" /> }));
vi.mock("./features/dashboard", () => ({
  DashboardPage: () => <div data-testid="dashboard-page" />,
}));
vi.mock("./features/karyawan", () => ({ KaryawanPage: () => <div data-testid="karyawan-page" /> }));
vi.mock("./features/gajian", () => ({
  GajianListPage: () => <div data-testid="gajian-list-page" />,
  GajianDetailPage: () => <div data-testid="gajian-detail-page" />,
}));
vi.mock("./features/kasbon", () => ({ KasbonPage: () => <div data-testid="kasbon-page" /> }));
vi.mock("./features/pettycash", () => ({
  PettycashPage: () => <div data-testid="pettycash-page" />,
}));
vi.mock("./features/pengaturan", () => ({
  PengaturanPage: () => <div data-testid="pengaturan-page" />,
}));
vi.mock("./shared/components/ProtectedRoute", () => ({
  default: ({ children }) => <>{children}</>,
}));

import { useAuth } from "@deera/shared/features/auth/hooks";
import App from "./App";

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { email: "u@u.com" }, loading: false });
});

describe("App routing", () => {
  it("renders DashboardPage at /", () => {
    renderApp("/");
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });
  it("renders LoginPage at /login", () => {
    renderApp("/login");
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });
  it("renders KaryawanPage at /karyawan", () => {
    renderApp("/karyawan");
    expect(screen.getByTestId("karyawan-page")).toBeInTheDocument();
  });
  it("renders GajianListPage at /gajian", () => {
    renderApp("/gajian");
    expect(screen.getByTestId("gajian-list-page")).toBeInTheDocument();
  });
  it("renders GajianDetailPage at /gajian/:id", () => {
    renderApp("/gajian/g1");
    expect(screen.getByTestId("gajian-detail-page")).toBeInTheDocument();
  });
  it("renders KasbonPage at /kasbon", () => {
    renderApp("/kasbon");
    expect(screen.getByTestId("kasbon-page")).toBeInTheDocument();
  });
  it("renders PettycashPage at /pettycash", () => {
    renderApp("/pettycash");
    expect(screen.getByTestId("pettycash-page")).toBeInTheDocument();
  });
  it("renders PengaturanPage at /pengaturan", () => {
    renderApp("/pengaturan");
    expect(screen.getByTestId("pengaturan-page")).toBeInTheDocument();
  });
  it("redirects unknown routes to /", () => {
    renderApp("/unknown-route");
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });
});
