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
const mockCreatePlanning = vi.fn();
const mockReorderPlanning = vi.fn();
const mockMarkSampelDibuat = vi.fn();
const mockSaveBatchDecisions = vi.fn();
const mockDeleteSampel = vi.fn();

const mockUseUnreadCounts = vi.fn(() => ({ unreadCounts: {}, loading: false }));

vi.mock("../hooks", () => ({
  useSampels: vi.fn(),
  useUpdateSampel: () => mockUpdateSampel,
  useCreatePlanning: () => mockCreatePlanning,
  useReorderPlanning: () => mockReorderPlanning,
  useMarkSampelDibuat: () => mockMarkSampelDibuat,
  useSaveBatchDecisions: () => mockSaveBatchDecisions,
  useDeleteSampel: () => mockDeleteSampel,
  useUnreadCounts: (...args) => mockUseUnreadCounts(...args),
}));

vi.mock("./SampelCard", () => ({
  default: ({ sampel, onEdit, onDelete, onReview, onMarkDibuat, onOpenDiscussion, onWorkOrder, unreadCount }) => (
    <div data-testid="sampel-card">
      <span>{sampel.nama}</span>
      <span data-testid={`unread-${sampel.id}`}>{unreadCount ?? 0}</span>
      <button onClick={() => onEdit(sampel)}>Edit</button>
      <button onClick={() => onDelete(sampel)}>Hapus</button>
      <button onClick={() => onReview(sampel)}>Review</button>
      <button onClick={() => onMarkDibuat(sampel)}>MarkDibuat</button>
      <button onClick={() => onOpenDiscussion(sampel)}>Diskusi</button>
      <button onClick={() => onWorkOrder(sampel)}>BukaWorkOrder</button>
    </div>
  ),
}));

vi.mock("./SampelForm", () => ({
  default: ({ onSave, onCancel }) => (
    <div>
      <button onClick={() => onSave({ nama: "Test", tanggal: "2024-01-01" }, [])}>SaveSampel</button>
      <button onClick={onCancel}>CancelSampel</button>
    </div>
  ),
}));

vi.mock("./PlanningForm", () => ({
  default: ({ onSave, onCancel }) => (
    <div>
      <button
        onClick={() =>
          onSave(
            { nama: "Planning Baru", tanggal: "2026-08-01" },
            "bahan.jpg",
            ["model1.jpg"],
            [{ nama_bahan: "Wolfis" }],
          )
        }
      >
        SavePlanning
      </button>
      <button onClick={onCancel}>CancelPlanning</button>
    </div>
  ),
}));

vi.mock("./PlanningQueueList", () => ({
  default: ({ items, onReorder, onEdit, onReview, onDelete, onMarkDibuat, onOpenDiscussion, unreadCounts }) => (
    <div data-testid="planning-queue-list">
      {items.map((s) => (
        <div key={s.id} data-testid="planning-queue-item">
          <span>{s.nama}</span>
          <span data-testid={`queue-unread-${s.id}`}>{unreadCounts?.[s.id] ?? 0}</span>
          <button onClick={() => onEdit(s)}>QueueEdit</button>
          <button onClick={() => onReview(s)}>QueueReview</button>
          <button onClick={() => onDelete(s)}>QueueHapus</button>
          <button onClick={() => onMarkDibuat(s)}>QueueMarkDibuat</button>
          <button onClick={() => onOpenDiscussion(s)}>QueueDiskusi</button>
        </div>
      ))}
      <button onClick={() => onReorder(items.map((s) => s.id).reverse())}>QueueReorder</button>
    </div>
  ),
}));

vi.mock("./MarkDibuatModal", () => ({
  default: ({ sampel, onSave, onClose }) => (
    <div>
      <span>MarkDibuatModal:{sampel.nama}</span>
      <button onClick={() => onSave(["jadi.jpg"])}>ConfirmMarkDibuat</button>
      <button onClick={onClose}>CloseMarkDibuat</button>
    </div>
  ),
}));

vi.mock("./PlanningDetailModal", () => ({
  default: ({ sampel, onClose }) => (
    <div>
      <span>PlanningDetailModal:{sampel.nama}:pinned={String(!!sampel.pinned)}</span>
      <button onClick={onClose}>ClosePlanningDetail</button>
    </div>
  ),
}));

vi.mock("./WorkOrderModal", () => ({
  default: ({ sampel, onClose }) => (
    <div>
      <span>WorkOrderModal:{sampel.nama}</span>
      <button onClick={onClose}>CloseWorkOrder</button>
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

const planningSampels = [
  { id: "p1", nama: "Planning Satu", status: "planning", nomor: "SPL-010", tanggal: "2026-08-01", urutan: 0, bahan_items: [] },
  { id: "p2", nama: "Planning Dua", status: "planning", nomor: "SPL-011", tanggal: "2026-08-02", urutan: 1, bahan_items: [] },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateSampel.mockResolvedValue(undefined);
  mockCreatePlanning.mockResolvedValue({ nomor: "SPL-003" });
  mockReorderPlanning.mockResolvedValue(undefined);
  mockMarkSampelDibuat.mockResolvedValue(undefined);
  mockSaveBatchDecisions.mockResolvedValue([]);
  mockDeleteSampel.mockResolvedValue(undefined);
  useSampels.mockReturnValue({ sampels: fakeSampels, loading: false });
  mockUseUnreadCounts.mockReturnValue({ unreadCounts: {}, loading: false });
});

describe("ProduksiSampelPage", () => {
  it("renders page title (Planning — redesign 2026-08)", () => {
    render(<ProduksiSampelPage />);
    expect(screen.getByRole("heading", { name: "Planning" })).toBeInTheDocument();
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

  it("filters by status on tab click (Menunggu Approval, permintaan Denny 2026-09: wording diperjelas)", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("Menunggu Approval"));
    expect(screen.getAllByTestId("sampel-card")).toHaveLength(1);
    expect(screen.getByText("Gamis Arkana")).toBeInTheDocument();
    expect(screen.queryByText("Gamis Bruna")).not.toBeInTheDocument();
  });

  it("opens planning form modal on + Planning click", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Planning"));
    expect(screen.getByText("SavePlanning")).toBeInTheDocument();
  });

  it("closes planning form modal on CancelPlanning", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Planning"));
    await user.click(screen.getByText("CancelPlanning"));
    expect(screen.queryByText("SavePlanning")).not.toBeInTheDocument();
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

  it("calls createPlanning + toast.success on new planning save", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Planning"));
    await user.click(screen.getByText("SavePlanning"));
    await waitFor(() => expect(mockCreatePlanning).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("createPlanning menerima bahanItems & urutan berikutnya (nextPlanningUrutan)", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Planning"));
    await user.click(screen.getByText("SavePlanning"));
    await waitFor(() =>
      expect(mockCreatePlanning).toHaveBeenCalledWith(
        { nama: "Planning Baru", tanggal: "2026-08-01" },
        "bahan.jpg",
        ["model1.jpg"],
        [{ nama_bahan: "Wolfis" }],
        0, // fakeSampels tidak punya planning sama sekali -> urutan berikutnya 0
        "admin@deera.id",
        "Admin",
      ),
    );
  });

  it("opens MarkDibuatModal when MarkDibuat clicked on SampelCard", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("MarkDibuat")[0]);
    expect(screen.getByText(/MarkDibuatModal:Gamis Arkana/)).toBeInTheDocument();
  });

  it("calls markSampelDibuat + toast.success on ConfirmMarkDibuat", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("MarkDibuat")[0]);
    await user.click(screen.getByText("ConfirmMarkDibuat"));
    await waitFor(() => expect(mockMarkSampelDibuat).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1", foto: ["jadi.jpg"] }),
    ));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("closes MarkDibuatModal on CloseMarkDibuat", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("MarkDibuat")[0]);
    await user.click(screen.getByText("CloseMarkDibuat"));
    expect(screen.queryByText(/MarkDibuatModal:/)).not.toBeInTheDocument();
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
    const confirmBtn = document.querySelector("button.bg-red-500");
    await user.click(confirmBtn);
    await waitFor(() => expect(mockDeleteSampel).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});

describe("ProduksiSampelPage — error paths", () => {
  it("shows toast.error when createPlanning throws", async () => {
    const user = userEvent.setup();
    mockCreatePlanning.mockRejectedValueOnce(new Error("network fail"));
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Planning"));
    await user.click(screen.getByText("SavePlanning"));
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

  it("shows toast.error when markSampelDibuat throws", async () => {
    const user = userEvent.setup();
    mockMarkSampelDibuat.mockRejectedValueOnce(new Error("mark fail"));
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("MarkDibuat")[0]);
    await user.click(screen.getByText("ConfirmMarkDibuat"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("mark fail")));
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
    const closeBtn = screen.getAllByText("×").at(-1);
    await user.click(closeBtn);
    expect(screen.queryByText(/Review Sampel/i)).not.toBeInTheDocument();
  });

  it("shows 3 decision buttons for each sampel in batch (Terima/Tahan/Tolak)", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    expect(screen.getByText("✓ Terima")).toBeInTheDocument();
    expect(screen.getByText("⏸ Tahan")).toBeInTheDocument();
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
    expect(screen.getByPlaceholderText(/Tuliskan alasan/i)).toBeInTheDocument();
    expect(screen.getByText("✗ Ditolak")).toBeInTheDocument();
  });

  it("tahan a sampel and shows catatan opsional textarea", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("⏸ Tahan"));
    expect(screen.getByPlaceholderText(/tunggu konfirmasi bahan tambahan/i)).toBeInTheDocument();
    expect(screen.getByText("⏸ Ditahan")).toBeInTheDocument();
  });

  it("shows Ubah link after decision made and can change", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("✓ Terima"));
    expect(screen.getByText("Ubah")).toBeInTheDocument();
    await user.click(screen.getByText("Ubah"));
    expect(screen.getByText("✓ Terima")).toBeInTheDocument();
  });

  it("saves batch decisions and shows toast on success", async () => {
    const user = userEvent.setup();
    mockSaveBatchDecisions.mockResolvedValueOnce([]);
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("✓ Terima"));
    await user.click(screen.getByText(/Simpan 1 Keputusan/));
    await waitFor(() => expect(mockSaveBatchDecisions).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("saves ditahan decision and shows 'ditahan' in success toast", async () => {
    const user = userEvent.setup();
    mockSaveBatchDecisions.mockResolvedValueOnce([]);
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Review")[0]);
    await user.click(screen.getByText("⏸ Tahan"));
    await user.click(screen.getByText(/Simpan 1 Keputusan/));
    await waitFor(() => expect(mockSaveBatchDecisions).toHaveBeenCalled());
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("ditahan")),
    );
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
  it("shows Buat planning pertama link in empty state", () => {
    useSampels.mockReturnValue({ sampels: [], loading: false });
    render(<ProduksiSampelPage />);
    expect(screen.getByText(/Buat planning pertama/i)).toBeInTheDocument();
  });

  it("opens planning form when Buat planning pertama clicked", async () => {
    const user = userEvent.setup();
    useSampels.mockReturnValue({ sampels: [], loading: false });
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText(/Buat planning pertama/i));
    expect(screen.getByText("SavePlanning")).toBeInTheDocument();
  });

  it("shows empty message for specific filter when no match", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("Ditolak"));
    expect(screen.getByText(/Tidak ada sampel/i)).toBeInTheDocument();
  });
});

describe("ProduksiSampelPage — form modal backdrop", () => {
  it("closes planning form modal on backdrop click", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getByText("+ Planning"));

    expect(screen.getByText("SavePlanning")).toBeInTheDocument();
    const backdrop = document.querySelector(".fixed.inset-0 .absolute.inset-0");
    if (backdrop) await user.click(backdrop);
    expect(screen.queryByText("SavePlanning")).toBeNull();
  });
});

describe("ProduksiSampelPage — tab Planning (drag & drop, permintaan Denny 2026-08)", () => {
  beforeEach(() => {
    useSampels.mockReturnValue({ sampels: [...fakeSampels, ...planningSampels], loading: false });
  });

  it("tab Planning merender PlanningQueueList (bukan masonry grid) sesuai urutan", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    expect(screen.getByTestId("planning-queue-list")).toBeInTheDocument();
    const items = screen.getAllByTestId("planning-queue-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Planning Satu");
    expect(items[1]).toHaveTextContent("Planning Dua");
  });

  it("tab lain (mis. Semua) tetap pakai masonry grid SampelCard, bukan PlanningQueueList", () => {
    render(<ProduksiSampelPage />);
    expect(screen.queryByTestId("planning-queue-list")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("sampel-card").length).toBeGreaterThan(0);
  });

  it("reorder via PlanningQueueList memanggil reorderPlanning dengan urutan baru", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    await user.click(screen.getByText("QueueReorder"));
    await waitFor(() =>
      expect(mockReorderPlanning).toHaveBeenCalledWith([
        { id: "p2", urutan: 0 },
        { id: "p1", urutan: 1 },
      ]),
    );
  });

  it("tidak toast sukses saat reorder berhasil (interaksi ringan, tidak perlu notifikasi tiap drag)", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    await user.click(screen.getByText("QueueReorder"));
    await waitFor(() => expect(mockReorderPlanning).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("toast error kalau reorderPlanning gagal (mis. offline)", async () => {
    const user = userEvent.setup();
    mockReorderPlanning.mockRejectedValueOnce(new Error("offline"));
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    await user.click(screen.getByText("QueueReorder"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("offline")),
    );
  });

  it("QueueEdit membuka form edit sampel dari PlanningQueueList", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    await user.click(screen.getAllByText("QueueEdit")[0]);
    expect(screen.getByText("Edit Sampel")).toBeInTheDocument();
  });

  it("QueueReview membuka batch review modal dari PlanningQueueList", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    await user.click(screen.getAllByText("QueueReview")[0]);
    expect(screen.getByText(/Review Sampel/i)).toBeInTheDocument();
  });

  it("QueueHapus membuka modal konfirmasi hapus dari PlanningQueueList", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    await user.click(screen.getAllByText("QueueHapus")[0]);
    expect(screen.getByText(/Hapus Sampel/i)).toBeInTheDocument();
  });

  it("QueueMarkDibuat membuka MarkDibuatModal dari PlanningQueueList", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    await user.click(screen.getAllByText("QueueMarkDibuat")[0]);
    expect(screen.getByText(/MarkDibuatModal:Planning Satu/)).toBeInTheDocument();
  });

  it("QueueDiskusi membuka PlanningDetailModal dari PlanningQueueList", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    await user.click(screen.getAllByText("QueueDiskusi")[0]);
    expect(screen.getByText(/PlanningDetailModal:Planning Satu/)).toBeInTheDocument();
  });
});

describe("ProduksiSampelPage — Diskusi & Pin modal (permintaan Denny 2026-09)", () => {
  it("klik Diskusi pada SampelCard membuka PlanningDetailModal dengan sampel yang benar", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Diskusi")[0]);
    expect(screen.getByText(/PlanningDetailModal:Gamis Arkana/)).toBeInTheDocument();
  });

  it("menutup PlanningDetailModal mengembalikan discussionTarget ke null", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Diskusi")[0]);
    expect(screen.getByText(/PlanningDetailModal:/)).toBeInTheDocument();
    await user.click(screen.getByText("ClosePlanningDetail"));
    expect(screen.queryByText(/PlanningDetailModal:/)).not.toBeInTheDocument();
  });

  it("klik BukaWorkOrder pada SampelCard membuka WorkOrderModal dengan sampel yang benar (permintaan Denny 2026-09)", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("BukaWorkOrder")[0]);
    expect(screen.getByText(/WorkOrderModal:Gamis Arkana/)).toBeInTheDocument();
  });

  it("menutup WorkOrderModal mengembalikan workOrderTarget ke null", async () => {
    const user = userEvent.setup();
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("BukaWorkOrder")[0]);
    expect(screen.getByText(/WorkOrderModal:/)).toBeInTheDocument();
    await user.click(screen.getByText("CloseWorkOrder"));
    expect(screen.queryByText(/WorkOrderModal:/)).not.toBeInTheDocument();
  });

  it("sampel yang pinned=true ditampilkan lebih dulu di grid (bukan tab Planning)", () => {
    useSampels.mockReturnValue({
      sampels: [
        { id: "s1", nama: "Tidak Pinned", status: "draft", nomor: "SPL-001", tanggal: "2024-01-15", foto: [], pinned: false },
        { id: "s2", nama: "Yang Dipin", status: "draft", nomor: "SPL-002", tanggal: "2024-01-16", foto: [], pinned: true },
      ],
      loading: false,
    });
    render(<ProduksiSampelPage />);
    const cards = screen.getAllByTestId("sampel-card");
    expect(cards[0]).toHaveTextContent("Yang Dipin");
    expect(cards[1]).toHaveTextContent("Tidak Pinned");
  });

  it("meneruskan unreadCounts[id] ke SampelCard di grid masonry (permintaan Denny 2026-09)", () => {
    mockUseUnreadCounts.mockReturnValue({ unreadCounts: { s1: 2 }, loading: false });
    render(<ProduksiSampelPage />);
    expect(screen.getByTestId("unread-s1")).toHaveTextContent("2");
    expect(screen.getByTestId("unread-s2")).toHaveTextContent("0");
  });

  it("meneruskan unreadCounts ke PlanningQueueList di tab Planning", async () => {
    const user = userEvent.setup();
    useSampels.mockReturnValue({ sampels: planningSampels, loading: false });
    mockUseUnreadCounts.mockReturnValue({ unreadCounts: { p1: 5 }, loading: false });
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    expect(screen.getByTestId("queue-unread-p1")).toHaveTextContent("5");
    expect(screen.getByTestId("queue-unread-p2")).toHaveTextContent("0");
  });

  it("tab Planning TIDAK ikut disortir pinned-first (urutan queue tetap dipakai)", async () => {
    const user = userEvent.setup();
    useSampels.mockReturnValue({
      sampels: [
        { ...planningSampels[0], pinned: false },
        { ...planningSampels[1], pinned: true },
      ],
      loading: false,
    });
    render(<ProduksiSampelPage />);
    await user.click(screen.getAllByText("Planning").find((el) => el.tagName === "BUTTON"));
    const items = screen.getAllByTestId("planning-queue-item");
    expect(items[0]).toHaveTextContent("Planning Satu");
    expect(items[1]).toHaveTextContent("Planning Dua");
  });
});
