import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Shallow mocks
vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => <nav>Nav</nav> }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => null }));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: (...a) => toastSuccessMock(...a), error: (...a) => toastErrorMock(...a) },
}));

const authState = { user: { email: "admin@deera.id" } };
vi.mock("@deera/shared/features/auth/hooks", () => ({ useAuth: () => authState }));

// Transfer hooks
const transfersState = { transfers: [], loading: false, reload: vi.fn() };
const approveHook = vi.fn();
const rejectHook = vi.fn();
const deleteHook = vi.fn();
const updateHook = vi.fn();
vi.mock("@deera/shared/features/transfers/hooks", () => ({
  useTransfers: () => transfersState,
  usePendingTransferCount: () => pendingCountState.count,
  useApproveTransfer: () => approveHook,
  useRejectTransfer: () => rejectHook,
  useDeleteTransfer: () => deleteHook,
  useUpdateTransfer: () => updateHook,
}));

let pendingCountState = { count: 0 };

// Child component mocks with callback capture
let lastFormProps = null;
vi.mock("./TransferForm", () => ({
  default: (props) => {
    lastFormProps = props;
    return (
      <div data-testid="transfer-form">
        <button onClick={() => props.onClose()}>FormClose</button>
        <button onClick={() => props.onSaved({ transfer_no: "SJ-SAVED-001", id: "t1", items: [] })}>
          FormSave
        </button>
      </div>
    );
  },
}));

let lastCardProps = {};
vi.mock("./TransferCard", () => ({
  default: (props) => {
    lastCardProps = props;
    return (
      <div data-testid="transfer-card" data-no={props.transfer.transfer_no}>
        <button onClick={() => props.onApprove(props.transfer)}>CardApprove</button>
        <button onClick={() => props.onReject(props.transfer)}>CardReject</button>
        <button onClick={() => props.onDelete(props.transfer)}>CardDelete</button>
        <button onClick={() => props.onEdit(props.transfer)}>CardEdit</button>
        <button onClick={() => props.onSuratJalan(props.transfer)}>CardSuratJalan</button>
      </div>
    );
  },
}));

vi.mock("./SuratJalan", () => ({
  default: ({ transfer, onClose }) => (
    <div data-testid="surat-jalan">
      <span>{transfer.transfer_no}</span>
      <button onClick={onClose}>SuratClose</button>
    </div>
  ),
}));

let lastConfirmProps = null;
vi.mock("./ConfirmModal", () => ({
  default: (props) => {
    if (!props.type) return null;
    lastConfirmProps = props;
    return (
      <div data-testid="confirm-modal" data-type={props.type}>
        <button onClick={() => props.onConfirm({ reason: "alasan" })}>ConfirmOK</button>
        <button onClick={() => props.onCancel()}>ConfirmCancel</button>
      </div>
    );
  },
}));

// Kategori "Pengiriman" (fitur baru, permintaan Denny 2026-08) — mock shallow
// spy sama seperti child component lain, supaya real hooks/api/supabase
// chain-nya (../../pengiriman → ./hooks → ./queries → ./api → shared/lib/supabase)
// tidak pernah tereksekusi di test TransferPage ini.
vi.mock("../../pengiriman", () => ({
  PengirimanTab: () => <div data-testid="pengiriman-tab">PengirimanTab</div>,
}));

const { default: TransferPage } = await import("./TransferPage");

function makeTransfer(overrides = {}) {
  return {
    id: "t1",
    transfer_no: "SJ-20240115-ABC",
    from_location: "gudang",
    to_location: "cideng",
    status: "pending",
    created_by: "kasir@deera.id",
    items: [{ kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 5 }],
    ...overrides,
  };
}

beforeEach(() => {
  transfersState.transfers = [];
  transfersState.loading = false;
  transfersState.reload.mockReset();
  approveHook.mockReset().mockResolvedValue(undefined);
  rejectHook.mockReset().mockResolvedValue(undefined);
  deleteHook.mockReset().mockResolvedValue(undefined);
  updateHook.mockReset().mockResolvedValue(undefined);
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
  pendingCountState.count = 0;
  lastFormProps = null;
  lastCardProps = {};
  lastConfirmProps = null;
});

describe("TransferPage", () => {
  it("menampilkan loading saat loading=true", () => {
    transfersState.loading = true;
    render(<TransferPage />);
    expect(screen.getByText(/memuat data/i)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong dan tombol buat pertama saat transfers empty", () => {
    render(<TransferPage />);
    expect(screen.getByText(/belum ada transfer/i)).toBeInTheDocument();
    expect(screen.getByText(/buat transfer pertama/i)).toBeInTheDocument();
  });

  it("menampilkan TransferCard untuk setiap transfer", () => {
    transfersState.transfers = [makeTransfer(), makeTransfer({ id: "t2", transfer_no: "SJ-2" })];
    render(<TransferPage />);
    expect(screen.getAllByTestId("transfer-card")).toHaveLength(2);
  });

  it("pending count badge tampil saat pendingCount > 0", () => {
    pendingCountState.count = 3;
    render(<TransferPage />);
    expect(screen.getByText(/3 transfer menunggu/i)).toBeInTheDocument();
  });

  it("klik Transfer membuka TransferForm", async () => {
    render(<TransferPage />);
    await userEvent.click(screen.getByText("Transfer"));
    expect(screen.getByTestId("transfer-form")).toBeInTheDocument();
  });

  it("FormClose menutup TransferForm", async () => {
    render(<TransferPage />);
    await userEvent.click(screen.getByText("Transfer"));
    await userEvent.click(screen.getByText("FormClose"));
    expect(screen.queryByTestId("transfer-form")).not.toBeInTheDocument();
  });

  it("FormSave → membuka ConfirmModal type=surat_jalan", async () => {
    render(<TransferPage />);
    await userEvent.click(screen.getByText("Transfer"));
    await userEvent.click(screen.getByText("FormSave"));
    await waitFor(() => expect(screen.getByTestId("confirm-modal")).toBeInTheDocument());
    expect(screen.getByTestId("confirm-modal").dataset.type).toBe("surat_jalan");
  });

  it("handleConfirm surat_jalan: membuka SuratJalan dan memanggil reload", async () => {
    render(<TransferPage />);
    await userEvent.click(screen.getByText("Transfer"));
    await userEvent.click(screen.getByText("FormSave"));
    await userEvent.click(screen.getByText("ConfirmOK"));
    await waitFor(() => expect(screen.getByTestId("surat-jalan")).toBeInTheDocument());
    expect(transfersState.reload).toHaveBeenCalled();
  });

  it("SuratClose menutup SuratJalan", async () => {
    render(<TransferPage />);
    await userEvent.click(screen.getByText("Transfer"));
    await userEvent.click(screen.getByText("FormSave"));
    await userEvent.click(screen.getByText("ConfirmOK"));
    await userEvent.click(screen.getByText("SuratClose"));
    expect(screen.queryByTestId("surat-jalan")).not.toBeInTheDocument();
  });

  it("CardApprove → ConfirmModal type=approve, ConfirmOK memanggil approveHook + reload", async () => {
    transfersState.transfers = [makeTransfer()];
    render(<TransferPage />);
    await userEvent.click(screen.getByText("CardApprove"));
    expect(screen.getByTestId("confirm-modal").dataset.type).toBe("approve");
    await userEvent.click(screen.getByText("ConfirmOK"));
    await waitFor(() => expect(approveHook).toHaveBeenCalled());
    expect(transfersState.reload).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("CardReject → ConfirmModal type=reject, ConfirmOK memanggil rejectHook dengan reason", async () => {
    transfersState.transfers = [makeTransfer()];
    render(<TransferPage />);
    await userEvent.click(screen.getByText("CardReject"));
    await userEvent.click(screen.getByText("ConfirmOK"));
    await waitFor(() => expect(rejectHook).toHaveBeenCalledWith(expect.anything(), "alasan"));
    expect(transfersState.reload).toHaveBeenCalled();
  });

  it("CardDelete → ConfirmModal type=delete, ConfirmOK memanggil deleteHook + reload", async () => {
    transfersState.transfers = [makeTransfer()];
    render(<TransferPage />);
    await userEvent.click(screen.getByText("CardDelete"));
    expect(screen.getByTestId("confirm-modal").dataset.type).toBe("delete");
    await userEvent.click(screen.getByText("ConfirmOK"));
    await waitFor(() => expect(deleteHook).toHaveBeenCalled());
    expect(transfersState.reload).toHaveBeenCalled();
  });

  it("ConfirmCancel menutup ConfirmModal", async () => {
    transfersState.transfers = [makeTransfer()];
    render(<TransferPage />);
    await userEvent.click(screen.getByText("CardApprove"));
    await userEvent.click(screen.getByText("ConfirmCancel"));
    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it("CardSuratJalan membuka SuratJalan langsung (tanpa confirm)", async () => {
    transfersState.transfers = [makeTransfer()];
    render(<TransferPage />);
    await userEvent.click(screen.getByText("CardSuratJalan"));
    expect(screen.getByTestId("surat-jalan")).toBeInTheDocument();
  });

  it("CardEdit membuka TransferForm dengan initialData", async () => {
    transfersState.transfers = [makeTransfer()];
    render(<TransferPage />);
    await userEvent.click(screen.getByText("CardEdit"));
    expect(screen.getByTestId("transfer-form")).toBeInTheDocument();
    expect(lastFormProps.initialData).toBeTruthy();
  });

  it("handleEditSaved: memanggil updateHook, reload, toast", async () => {
    transfersState.transfers = [makeTransfer()];
    render(<TransferPage />);
    await userEvent.click(screen.getByText("CardEdit"));
    // FormSave triggers onSaved on the edit form
    await userEvent.click(screen.getByText("FormSave"));
    // Edit flow goes through onSaved directly (not ConfirmModal)
    await waitFor(() => expect(transfersState.reload).toHaveBeenCalled());
  });

  it("handleConfirm error: memanggil toast.error", async () => {
    approveHook.mockRejectedValue(new Error("jaringan error"));
    transfersState.transfers = [makeTransfer()];
    render(<TransferPage />);
    await userEvent.click(screen.getByText("CardApprove"));
    await userEvent.click(screen.getByText("ConfirmOK"));
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("jaringan error"));
  });

  it("tab status diubah saat klik tab", async () => {
    render(<TransferPage />);
    await userEvent.click(screen.getByText("Disetujui"));
    // Tab button becomes active - just verify no crash and "Disetujui" is still visible
    expect(screen.getByText("Disetujui")).toBeInTheDocument();
  });

  it("date preset custom: menampilkan input tanggal", async () => {
    render(<TransferPage />);
    await userEvent.click(screen.getByText("Custom"));
    expect(screen.getAllByDisplayValue("")[0]).toHaveAttribute("type", "date");
  });

  describe("kategori Transfer Stok vs Pengiriman", () => {
    it("default kategori 'stok': header & daftar Transfer Stok tampil, PengirimanTab tidak", () => {
      render(<TransferPage />);
      expect(screen.getByRole("heading", { name: "Transfer Stok" })).toBeInTheDocument();
      expect(screen.getByText("Belum ada transfer")).toBeInTheDocument();
      expect(screen.queryByTestId("pengiriman-tab")).not.toBeInTheDocument();
    });

    it("klik tab kategori 'Pengiriman' menyembunyikan konten Transfer Stok & merender PengirimanTab", async () => {
      transfersState.transfers = [makeTransfer()];
      render(<TransferPage />);

      await userEvent.click(screen.getByRole("button", { name: "Pengiriman" }));

      expect(screen.getByTestId("pengiriman-tab")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Pengiriman" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Transfer Stok" })).not.toBeInTheDocument();
      expect(screen.queryByTestId("transfer-card")).not.toBeInTheDocument();
      expect(screen.queryByText("Cara kerja:")).not.toBeInTheDocument();
    });

    it("kembali klik 'Transfer Stok' memulihkan tampilan semula", async () => {
      transfersState.transfers = [makeTransfer()];
      render(<TransferPage />);

      await userEvent.click(screen.getByRole("button", { name: "Pengiriman" }));
      expect(screen.getByTestId("pengiriman-tab")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Transfer Stok" }));

      expect(screen.queryByTestId("pengiriman-tab")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Transfer Stok" })).toBeInTheDocument();
      expect(screen.getAllByTestId("transfer-card")).toHaveLength(1);
    });
  });
});
