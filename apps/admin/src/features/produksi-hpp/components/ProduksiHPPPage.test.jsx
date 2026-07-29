import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/features/auth/hooks", () => ({ useAuth: vi.fn() }));
vi.mock("@deera/shared/features/products/hooks", () => ({ useProducts: vi.fn(), useInvalidateProducts: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../shared/components/ProduksiLayout", () => ({ default: ({ children, headerAction }) => <div>{headerAction}{children}</div> }));
vi.mock("../hooks", () => ({
  useHppTemplates: vi.fn(),
  useHppConfig: vi.fn(),
  useHppConfigRows: vi.fn(),
  useBahanOptions: vi.fn(),
  useSaveHppTemplates: vi.fn(),
  useDeleteHppTemplate: vi.fn(),
  useSaveHppConfig: vi.fn(),
}));
vi.mock("../../produksi-record/hooks", () => ({
  useBatches: vi.fn(),
}));
vi.mock("./HPPForm", () => ({
  default: ({ onSave, onCancel, siblingKodes, templates }) => (
    <div data-testid="hpp-form">
      <span data-testid="hpp-form-sibling-kodes">{(siblingKodes ?? []).join(",")}</span>
      <span data-testid="hpp-form-templates-count">{(templates ?? []).length}</span>
      <button onClick={() => onSave([{ kode_produk: "D-07-OSK", total_hpp: 85000, bahan_items: [] }])}>SaveForm</button>
      <button onClick={onCancel}>CancelForm</button>
    </div>
  ),
}));
vi.mock("./HPPCard", () => ({
  default: ({ tpl, onEdit, onDelete, onShare, onOpenDetail }) => (
    <div data-testid="hpp-card">
      <span>{tpl.kode_produk}</span>
      <button onClick={() => onEdit(tpl)}>EditCard</button>
      <button onClick={() => onDelete(tpl)}>DeleteCard</button>
      <button onClick={() => onShare(tpl)}>ShareCard</button>
      <button onClick={() => onOpenDetail(tpl)}>OpenDetailCard</button>
    </div>
  ),
}));
vi.mock("./HppTemplateDetailSheet", () => ({
  default: ({ tpl, onClose, onEdit, onDelete, onShare }) => (
    <div data-testid="detail-sheet">
      <span>Detail {tpl.kode_produk}</span>
      <button onClick={onClose}>CloseDetail</button>
      <button onClick={() => onEdit(tpl)}>EditFromDetail</button>
      <button onClick={() => onDelete(tpl)}>DeleteFromDetail</button>
      <button onClick={() => onShare(tpl)}>ShareFromDetail</button>
    </div>
  ),
}));
vi.mock("./HPPShareModal", () => ({
  default: ({ tpl, onClose }) => (
    <div data-testid="share-modal">
      <span>Share {tpl.kode_produk}</span>
      <button onClick={onClose}>CloseShare</button>
    </div>
  ),
}));
vi.mock("./HargaDasarPanel", () => ({
  default: ({ rows }) => <div data-testid="harga-dasar-panel">HargaDasarPanel rows={rows.length}</div>,
}));
vi.mock("./KalkulatorHPP", () => ({
  default: ({ config }) => (
    <div data-testid="kalkulator-hpp">Perkiraan HPP per baju. config-keys={Object.keys(config ?? {}).length}</div>
  ),
}));

import ProduksiHPPPage from "./ProduksiHPPPage";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { useProducts, useInvalidateProducts } from "@deera/shared/features/products/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { useHppTemplates, useHppConfig, useHppConfigRows, useBahanOptions, useSaveHppTemplates, useDeleteHppTemplate, useSaveHppConfig } from "../hooks";
import { useBatches } from "../../produksi-record/hooks";

const mockTpl = { id: "t1", kode_produk: "D-07-OSK", total_hpp: 85000, bahan_items: [] };

function setup() {
  vi.clearAllMocks();
  const saveFn = vi.fn().mockResolvedValue(undefined);
  const deleteFn = vi.fn().mockResolvedValue(undefined);
  const saveConfigFn = vi.fn().mockResolvedValue(undefined);
  useAuth.mockReturnValue({ user: { email: "a@b.com" } });
  useProducts.mockReturnValue([{ kode: "D-07-OSK", nama: "Gamis Oskelin" }]);
  useInvalidateProducts.mockReturnValue(vi.fn());
  useHppTemplates.mockReturnValue({ templates: [mockTpl], loading: false });
  useBatches.mockReturnValue({ batches: [], loading: false });
  useHppConfig.mockReturnValue({ plastik: 1800 });
  useHppConfigRows.mockReturnValue({ rows: [], loading: false, error: false, refetch: vi.fn() });
  useBahanOptions.mockReturnValue([]);
  useSaveHppTemplates.mockReturnValue(saveFn);
  useDeleteHppTemplate.mockReturnValue(deleteFn);
  useSaveHppConfig.mockReturnValue(saveConfigFn);
  return { saveFn, deleteFn, saveConfigFn };
}

function renderPage() {
  return render(<MemoryRouter><ProduksiHPPPage /></MemoryRouter>);
}

describe("ProduksiHPPPage", () => {
  beforeEach(setup);

  it("renders tab buttons", () => {
    renderPage();
    expect(screen.getByText("Template HPP")).toBeInTheDocument();
    expect(screen.getByText("Kalkulator")).toBeInTheDocument();
    expect(screen.getByText("Harga Dasar")).toBeInTheDocument();
  });

  it("renders HPPCard for each template", () => {
    renderPage();
    expect(screen.getAllByTestId("hpp-card").length).toBe(1);
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("shows form when + Buat HPP clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("+ Buat HPP"));
    expect(screen.getByTestId("hpp-form")).toBeInTheDocument();
  });

  it("calls onSave and shows toast when form saved", async () => {
    const { saveFn } = setup();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("+ Buat HPP"));
    await user.click(screen.getByText("SaveForm"));
    await waitFor(() => expect(saveFn).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it("closes form on CancelForm", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("+ Buat HPP"));
    await user.click(screen.getByText("CancelForm"));
    expect(screen.queryByTestId("hpp-form")).not.toBeInTheDocument();
  });

  it("opens edit form when EditCard clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("EditCard"));
    expect(screen.getByTestId("hpp-form")).toBeInTheDocument();
  });

  it("shows delete confirm modal when DeleteCard clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("DeleteCard"));
    expect(screen.getByText(/Hapus Template HPP/)).toBeInTheDocument();
  });

  it("calls deleteHpp on confirm delete", async () => {
    const { deleteFn } = setup();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("DeleteCard"));
    await user.click(screen.getByText("Hapus"));
    await waitFor(() => expect(deleteFn).toHaveBeenCalled());
  });

  it("cancels delete modal on Batal", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("DeleteCard"));
    await user.click(screen.getByText("Batal"));
    expect(screen.queryByText(/Hapus Template HPP/)).not.toBeInTheDocument();
  });

  it("switches to Kalkulator tab", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Kalkulator"));
    expect(screen.getByTestId("kalkulator-hpp")).toBeInTheDocument();
  });

  it("passes real Harga Dasar config into KalkulatorHPP (regresi bug: dulu tidak menerima config sama sekali)", async () => {
    useHppConfig.mockReturnValue({ plastik: 1800, poin_denny: 10000, poin_haikal: 10000 });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Kalkulator"));
    expect(screen.getByText(/config-keys=3/)).toBeInTheDocument();
  });

  it("shows empty state when no templates", () => {
    useHppTemplates.mockReturnValue({ templates: [], loading: false });
    renderPage();
    expect(screen.getByText(/Belum ada template HPP/)).toBeInTheDocument();
  });

  it("shows loading when loading=true", () => {
    useHppTemplates.mockReturnValue({ templates: [], loading: true });
    render(<MemoryRouter><ProduksiHPPPage /></MemoryRouter>);
    expect(screen.getByText(/Memuat/)).toBeInTheDocument();
  });

  it("renders HargaDasarPanel when Harga Dasar tab clicked (regresi bug key mismatch)", async () => {
    useHppConfigRows.mockReturnValue({ rows: [{ key: "plastik" }], loading: false, error: false, refetch: vi.fn() });
    const user = userEvent.setup();
    renderPage();
    expect(screen.queryByTestId("harga-dasar-panel")).not.toBeInTheDocument();
    await user.click(screen.getByText("Harga Dasar"));
    expect(screen.getByTestId("harga-dasar-panel")).toBeInTheDocument();
    expect(screen.getByText("HargaDasarPanel rows=1")).toBeInTheDocument();
  });

  it("opens HppTemplateDetailSheet when OpenDetailCard clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("OpenDetailCard"));
    expect(screen.getByTestId("detail-sheet")).toBeInTheDocument();
    expect(screen.getByText("Detail D-07-OSK")).toBeInTheDocument();
  });

  it("closes detail sheet on CloseDetail", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("OpenDetailCard"));
    await user.click(screen.getByText("CloseDetail"));
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("opens edit form from detail sheet and closes the sheet", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("OpenDetailCard"));
    await user.click(screen.getByText("EditFromDetail"));
    expect(screen.getByTestId("hpp-form")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("opens delete confirm from detail sheet and closes the sheet", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("OpenDetailCard"));
    await user.click(screen.getByText("DeleteFromDetail"));
    expect(screen.getByText(/Hapus Template HPP/)).toBeInTheDocument();
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("opens share modal from card ShareCard button", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("ShareCard"));
    expect(screen.getByTestId("share-modal")).toBeInTheDocument();
    expect(screen.getByText("Share D-07-OSK")).toBeInTheDocument();
  });

  it("opens share modal from detail sheet CTA and closes the detail sheet", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("OpenDetailCard"));
    await user.click(screen.getByText("ShareFromDetail"));
    expect(screen.getByTestId("share-modal")).toBeInTheDocument();
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("closes share modal on CloseShare", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("ShareCard"));
    await user.click(screen.getByText("CloseShare"));
    expect(screen.queryByTestId("share-modal")).not.toBeInTheDocument();
  });

  // ── Auto-include sibling produk 1 gelaran saat Edit HPP (2026-07) ────────
  // getBatchSiblingKodes() sendiri (real implementation dari "../utils", TIDAK
  // di-mock di file ini) dipakai untuk menghitung siblingKodes dari data
  // useBatches() — lihat utils.test.js untuk unit test fungsi murninya.
  it("passes siblingKodes (from same batch_no) down to HPPForm when editing, and shows the '(+N produk 1 gelaran)' suffix in the modal header", async () => {
    useBatches.mockReturnValue({
      batches: [
        { kode_produk: "D-07-OSK", batch_no: "PROD-1", created_at: "2026-07-01T00:00:00Z" },
        { kode_produk: "D-08-SFN", batch_no: "PROD-1", created_at: "2026-07-01T00:00:00Z" },
      ],
      loading: false,
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("EditCard"));
    expect(screen.getByTestId("hpp-form-sibling-kodes")).toHaveTextContent("D-08-SFN");
    expect(screen.getByText(/Edit HPP — D-07-OSK \(\+1 produk 1 gelaran\)/)).toBeInTheDocument();
  });

  it("passes empty siblingKodes and no suffix when the product has no same-batch siblings", async () => {
    useBatches.mockReturnValue({ batches: [], loading: false });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("EditCard"));
    expect(screen.getByTestId("hpp-form-sibling-kodes")).toHaveTextContent("");
    expect(screen.getByText("Edit HPP — D-07-OSK")).toBeInTheDocument();
    expect(screen.queryByText(/produk 1 gelaran/)).not.toBeInTheDocument();
  });

  it("passes templates down to HPPForm so sibling saved HPP data can be pre-loaded", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("EditCard"));
    expect(screen.getByTestId("hpp-form-templates-count")).toHaveTextContent("1");
  });

  it("shows plain 'Buat Template HPP' title (no suffix) when creating a new template", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("+ Buat HPP"));
    expect(screen.getByText("Buat Template HPP")).toBeInTheDocument();
    expect(screen.getByTestId("hpp-form-sibling-kodes")).toHaveTextContent("");
  });
});
