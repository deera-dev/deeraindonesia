import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// vi.hoisted ensures these are available before vi.mock factories run AND
// that config is a stable object reference (prevents infinite useEffect loop).
const { mockToast, mockConfig, mockSaveConfig } = vi.hoisted(() => ({
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockConfig: { tarif_qc: 1500, tarif_video: 60000 },
  mockSaveConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/components/FinanceLayout", () => ({
  default: ({ children, title }) => <div><h1>{title}</h1>{children}</div>,
}));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  inputCls: "",
  labelCls: "",
}));
vi.mock("../utils", () => ({
  DEFAULT_FINANCE_CONFIG: { tarif_qc: 1000, tarif_video: 50000 },
  FINANCE_CONFIG_META: [
    { key: "tarif_qc", label: "Tarif QC", group: "QC" },
    { key: "tarif_video", label: "Video Kreatif / video", group: "Kreatif" },
  ],
}));
vi.mock("../hooks", () => ({
  useFinanceConfig: vi.fn(() => ({ config: mockConfig, loading: false })),
  useSaveFinanceConfig: vi.fn(() => mockSaveConfig),
}));

import * as hooksModule from "../hooks";
import PengaturanPage from "./PengaturanPage";

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveConfig.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
  // Restore default mock return (stable config reference)
  hooksModule.useFinanceConfig.mockReturnValue({ config: mockConfig, loading: false });
  hooksModule.useSaveFinanceConfig.mockReturnValue(mockSaveConfig);
});

describe("PengaturanPage", () => {
  it("renders title", () => {
    render(<PengaturanPage />);
    expect(screen.getByText("Pengaturan")).toBeInTheDocument();
  });

  it("shows loading state while config loads", () => {
    hooksModule.useFinanceConfig.mockReturnValueOnce({ config: {}, loading: true });
    render(<PengaturanPage />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("renders config fields from FINANCE_CONFIG_META", () => {
    render(<PengaturanPage />);
    expect(screen.getByText("Tarif QC")).toBeInTheDocument();
    expect(screen.getByText(/Video Kreatif/)).toBeInTheDocument();
  });

  it("Simpan Perubahan button is disabled when no dirty fields", () => {
    render(<PengaturanPage />);
    expect(screen.getByText("Simpan Perubahan").closest("button")).toBeDisabled();
  });

  it("calls saveConfig on dirty field submit", async () => {
    render(<PengaturanPage />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "2000" } });
    fireEvent.click(screen.getByText("Simpan Perubahan"));
    await waitFor(() => expect(mockSaveConfig).toHaveBeenCalled());
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("shows error toast when saveConfig throws", async () => {
    mockSaveConfig.mockRejectedValueOnce(new Error("server error"));
    render(<PengaturanPage />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "2000" } });
    fireEvent.click(screen.getByText("Simpan Perubahan"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: server error"));
  });

  it("calls saveConfig with default values on reset confirmed", async () => {
    render(<PengaturanPage />);
    fireEvent.click(screen.getByText("Reset Default"));
    await waitFor(() => expect(mockSaveConfig).toHaveBeenCalled());
  });

  it("does not reset when confirm=false", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<PengaturanPage />);
    fireEvent.click(screen.getByText("Reset Default"));
    expect(mockSaveConfig).not.toHaveBeenCalled();
  });
});

describe("PengaturanPage — additional branches", () => {
  it("shows error toast when reset throws", async () => {
    mockSaveConfig.mockRejectedValueOnce(new Error("reset fail"));
    render(<PengaturanPage />);
    fireEvent.click(screen.getByText("Reset Default"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: reset fail"));
  });

  it("fmtRp(0) shown when config value is 0 (Number(val)||0 branch)", async () => {
    hooksModule.useFinanceConfig.mockReturnValue({
      config: { tarif_qc: 0, tarif_video: 0 },
      loading: false,
    });
    render(<PengaturanPage />);
    // After useEffect fires, values={tarif_qc:0} → Number(0)||0=0 → fmtRp(0)="Rp0"
    await waitFor(() => expect(screen.getAllByText("Rp0").length).toBeGreaterThan(0));
  });

  it("UBAH badge shown for dirty field", async () => {
    render(<PengaturanPage />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "9999" } });
    await waitFor(() => expect(screen.getByText("UBAH")).toBeInTheDocument());
  });

  it("val ?? DEFAULT branch: missing key falls back to DEFAULT", async () => {
    // config={} → useEffect sets values={} → values[key]=undefined → ?? DEFAULT[key]=1000
    hooksModule.useFinanceConfig.mockReturnValue({
      config: {},
      loading: false,
    });
    render(<PengaturanPage />);
    // val=undefined ?? 1000=1000 → fmtRp(1000)="Rp1000"
    await waitFor(() => expect(screen.getAllByText("Rp1000").length).toBeGreaterThan(0));
  });
});

describe("PengaturanPage — Number(val)||0 falsy branch in dirtyKeys.map", () => {
  it("saves 0 when dirty field value is '0' (covers || 0 right side)", async () => {
    render(<PengaturanPage />);
    const inputs = screen.getAllByRole("spinbutton");
    // Change tarif_qc to "0" → Number("0")=0 → falsy → || 0 branch taken
    fireEvent.change(inputs[0], { target: { value: "0" } });
    fireEvent.click(screen.getByText("Simpan Perubahan"));
    await waitFor(() => expect(mockSaveConfig).toHaveBeenCalledWith("tarif_qc", 0));
  });
});
