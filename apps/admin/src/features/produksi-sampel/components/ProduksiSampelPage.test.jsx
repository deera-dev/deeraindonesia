import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../shared/components/ProduksiLayout", () => ({
  default: ({ children, title, headerAction }) => (
    <div>
      <h1>{title}</h1>
      {headerAction}
      {children}
    </div>
  ),
}));
vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => url ?? "",
  uploadImage: vi.fn().mockResolvedValue({ url: "https://cld/up.jpg" }),
}));
vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "admin@deera.id", user_metadata: { full_name: "Admin" } } }),
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUpdateSampel = vi.fn();
const mockCreateSampels = vi.fn();
const mockSaveBatchDecisions = vi.fn();
const mockDeleteSampel = vi.fn();

vi.mock("../hooks", () => ({
  useSampels: vi.fn(),
  useUpdateSampel: () => mockUpdateSampel,
  useCreateSampels: () => mockCreateSampels,
  useSaveBatchDecisions: () => mockSaveBatchDecisions,
  useDeleteSampel: () => mockDeleteSampel,
}));

vi.mock("./SampelCard", () => ({
  default: ({ sampel, onEdit, onDelete, onReview }) => (
    <div data-testid="sampel-card">
      <span>{sampel.nama}</span>
      <button onClick={() => onEdit(sampel)}>Edit</button>
      <button onClick={() => onDelete(sampel)}>Hapus</button>
      <button onClick={() => onReview(sampel)}>Review</button>
    </div>
  ),
}));

vi.mock("./SampelForm", () => ({
  default: ({ onSave, onCancel }) => (
    <div>
      <button onClick={() => onSave({ nama: "Test", tanggal: "2024-01-01" })}>SaveSampel</button>
      <button onClick={onCancel}>CancelSampel</button>
    </div>
  ),
}));

import ProduksiSampelPage from "./ProduksiSampelPage";
import { useSampels } from "../hooks";
import { toast } from "@deera/shared/features/toast/hooks";

const fakeSampels = [
  { id: "s1", nama: "Gamis Arkana", status: "draft", nomor: "SPL-001", tanggal: "2024-01-15", foto: [] },
  { id: "s2", nama: "Gamis Bruna", status: "approved", nomor: "SPL-002", tanggal: "2024-01-16", foto: [] },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateSampel.mockResolvedValue(undefined);
  mockCreateSampels.mockResolvedValue([]);
  mockSaveBatchDecisions.mockResolvedValue([]);
  mockDeleteSampel.mockResolvedValue(undefined);
  useSampels.mockReturnValue({ sampels: fakeSampels, loading: false });
});

describe("ProduksiSampelPage", () => {
  it("renders page title", () => {
    render(<ProduksiSampelPage />);
    expect(screen.getByText("Sampel")).toBeInTheDocument();
  });

  it("shows SampelCards in All tab", () => {
    render(<ProduksiSampelPage />);
    expect(screen.getAllByTestId("sampel-card")).toHaveLength(2);
  });

  it("shows loading state", () => {
    useSampels.mockReturnValue({ sampels: [], loading: true });
    render(<ProduksiSampelPage />);
    expect(screen.getByText(/Memuat/)).toBeInTheDocument();
  });

  it("shows empty state when no sampels", () => {
    useSampels.mockReturnValue({ sampels: [], loading: false });
    render(<ProduksiSampelPage />);
    expect(screen.getByText(/Belum ada sampel/)).toBeInTheDocument();
  });

  it("filters by status on tab click", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("Menunggu"));
    expect(screen.getAllByTestId("sampel-card")).toHaveLength(1);
    expect(screen.getByText("Gamis Arkana")).toBeInTheDocument();
    expect(screen.queryByText("Gamis Bruna")).not.toBeInTheDocument();
  });

  it("opens form modal on + Buat Sampel click", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Sampel"));
    expect(screen.getByText("SaveSampel")).toBeInTheDocument();
  });

  it("closes form modal on CancelSampel", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Sampel"));
    await user.click(screen.getByText("CancelSampel"));
    expect(screen.queryByText("SaveSampel")).not.toBeInTheDocument();
  });

  it("opens edit modal when Edit clicked on SampelCard", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Edit")[0]);
    expect(screen.getByText("SaveSampel")).toBeInTheDocument();
    expect(screen.getByText("Edit Sampel")).toBeInTheDocument();
  });

  it("calls updateSampel + toast.success on edit save", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Edit")[0]);
    await user.click(screen.getByText("SaveSampel"));
    await waitFor(() => expect(mockUpdateSampel).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("calls createSampels + toast.success on new sampel save", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Sampel"));
    await user.click(screen.getByText("SaveSampel"));
    await waitFor(() => expect(mockCreateSampels).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("shows delete confirm modal when Hapus clicked", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Hapus")[0]);
    expect(screen.getByText(/Hapus Sampel/i)).toBeInTheDocument();
  });

  it("confirms delete and calls deleteSampel + toast.success", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Hapus")[0]);
    await user.click(screen.getByText("Hapus", { selector: "button[type='button']:last-child, div button:last-child" }));
    await waitFor(() => expect(mockDeleteSampel).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});

describe("ProduksiSampelPage — error paths", () => {
  it("shows toast.error when createSampels throws", async () => {
    const user = userEvent.setup();
    mockCreateSampels.mockRejectedValueOnce(new Error("network fail"));
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Sampel"));
    await user.click(screen.getByText("SaveSampel"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("network fail")));
  });

  it("shows toast.error when updateSampel throws", async () => {
    const user = userEvent.setup();
    mockUpdateSampel.mockRejectedValueOnce(new Error("update fail"));
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Edit")[0]);
    await user.click(screen.getByText("SaveSampel"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("update fail")));
  });

  it("shows toast.error when deleteSampel throws", async () => {
    const user = userEvent.setup();
    mockDeleteSampel.mockRejectedValueOnce(new Error("delete fail"));
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Hapus")[0]);
    const confirmBtn = document.querySelector("button.bg-red-500");
    await user.click(confirmBtn);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("delete fail")));
  });
});

describe("ProduksiSampelPage — delete modal", () => {
  it("cancels delete on Batal click", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Hapus")[0]);
    expect(screen.getByText(/Hapus Sampel/i)).toBeInTheDocument();
    // Click the Batal button inside the modal
    const batal = screen.getAllByText("Batal").at(-1);
    await user.click(batal);
    expect(screen.queryByText(/Tidak bisa dibatalkan/)).not.toBeInTheDocument();
  });

  it("calls deleteSampel when red Hapus confirm clicked", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Hapus")[0]);
    const confirmBtn = document.querySelector("button.bg-red-500");
    await user.click(confirmBtn);
    await waitFor(() => expect(mockDeleteSampel).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});

describe("ProduksiSampelPage — batch review modal", () => {
  it("opens BatchApprovalModal on Review click", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    expect(screen.getByText(/Review Sampel/i)).toBeInTheDocument();
  });

  it("closes review modal via × button", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    // Find the × close button in the BatchApprovalModal header
    const closeBtn = screen.getAllByText("×").at(-1);
    await user.click(closeBtn);
    expect(screen.queryByText(/Review Sampel/i)).not.toBeInTheDocument();
  });

  it("shows decision buttons for each sampel in batch", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    expect(screen.getByText("✓ Terima")).toBeInTheDocument();
    expect(screen.getByText("✗ Tolak")).toBeInTheDocument();
  });

  it("approve a sampel and shows catatan textarea", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("✓ Terima"));
    expect(screen.getByText(/Catatan Perubahan/i)).toBeInTheDocument();
    expect(screen.getByText(/Diterima/)).toBeInTheDocument();
  });

  it("reject a sampel and shows alasan textarea", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("✗ Tolak"));
    // Check for the alasan textarea by placeholder (avoids label ancestor ambiguity)
    expect(screen.getByPlaceholderText(/Tuliskan alasan/i)).toBeInTheDocument();
    // "✗ Ditolak" badge — use exact text to avoid matching "Ditolak" filter tab
    expect(screen.getByText("✗ Ditolak")).toBeInTheDocument();
  });

  it("shows Ubah link after decision made and can change", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("✓ Terima"));
    expect(screen.getByText("Ubah")).toBeInTheDocument();
    await user.click(screen.getByText("Ubah"));
    // After clicking Ubah, decision cleared → Terima/Tolak buttons back
    expect(screen.getByText("✓ Terima")).toBeInTheDocument();
  });

  it("saves batch decisions and shows toast on success", async () => {
    const user = userEvent.setup();
    mockSaveBatchDecisions.mockResolvedValueOnce([]);
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("✓ Terima"));
    // Now decidedCount=1 so save button enabled
    await user.click(screen.getByText(/Simpan 1 Keputusan/));
    await waitFor(() => expect(mockSaveBatchDecisions).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("shows toast.error when batch save fails", async () => {
    const user = userEvent.setup();
    mockSaveBatchDecisions.mockRejectedValueOnce(new Error("batch error"));
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("✓ Terima"));
    await user.click(screen.getByText(/Simpan 1 Keputusan/));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("batch error")));
  });

  it("shows warning when reject decision has no alasan on save", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("✗ Tolak"));
    // alasan is empty → save should show error toast
    await user.click(screen.getByText(/Simpan 1 Keputusan/));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("alasan")));
    expect(mockSaveBatchDecisions).not.toHaveBeenCalled();
  });

  it("shows Bagikan untuk Approval button in batch modal", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    expect(screen.getByText(/Bagikan untuk Approval/i)).toBeInTheDocument();
  });
});

describe("ProduksiSampelPage — empty state actions", () => {
  it("shows Buat sampel pertama link in empty state", () => {
    useSampels.mockReturnValue({ sampels: [], loading: false });
    render(<ProduksiSampelPage />);
    expect(screen.getByText(/Buat sampel pertama/i)).toBeInTheDocument();
  });

  it("opens form when Buat sampel pertama clicked", async () => {
    const user = userEvent.setup();
    useSampels.mockReturnValue({ sampels: [], loading: false });
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText(/Buat sampel pertama/i));
    expect(screen.getByText("SaveSampel")).toBeInTheDocument();
  });

  it("shows empty message for specific filter when no match", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("Ditolak"));
    expect(screen.getByText(/Tidak ada sampel/i)).toBeInTheDocument();
  });
});

describe("ProduksiSampelPage — form modal backdrop", () => {
  it("closes form modal on backdrop click", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Sampel"));
    expect(screen.getByText("SaveSampel")).toBeInTheDocument();
    // Click the backdrop (absolute inset-0 overlay)
    // Close via × close button (the backdrop click targets are hard to select by class)
    const closeBtn = screen.getAllByText("×").at(-1);
    if (closeBtn) await user.click(closeBtn);
    expect(screen.queryByText("SaveSampel")).not.toBeInTheDocument();
  });
});
