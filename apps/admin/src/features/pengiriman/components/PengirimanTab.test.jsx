import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: (...a) => toastSuccessMock(...a), error: (...a) => toastErrorMock(...a) },
}));

const pengirimanState = { pengirimanList: [], loading: false, reload: vi.fn() };
const deleteHook = vi.fn();
vi.mock("../hooks", () => ({
  usePengiriman: () => pengirimanState,
  useDeletePengiriman: () => deleteHook,
}));

let lastFormProps = null;
vi.mock("./PengirimanForm", () => ({
  default: (props) => {
    lastFormProps = props;
    return (
      <div data-testid="pengiriman-form">
        <button onClick={() => props.onClose()}>FormClose</button>
        <button onClick={() => props.onSaved({ id: "pg-new", pengiriman_no: "KRM-SAVED-001" })}>
          FormSave
        </button>
      </div>
    );
  },
}));

vi.mock("./PengirimanCard", () => ({
  default: (props) => (
    <div data-testid="pengiriman-card" data-no={props.pengiriman.pengiriman_no}>
      <button onClick={() => props.onSuratJalan(props.pengiriman)}>CardSuratJalan</button>
      <button onClick={() => props.onEdit(props.pengiriman)}>CardEdit</button>
      <button onClick={() => props.onDelete(props.pengiriman)}>CardDelete</button>
    </div>
  ),
}));

vi.mock("./SuratJalanPengiriman", () => ({
  default: ({ pengiriman, onClose }) => (
    <div data-testid="surat-jalan-pengiriman">
      <span>{pengiriman.pengiriman_no}</span>
      <button onClick={onClose}>SuratClose</button>
    </div>
  ),
}));

let lastDeleteModalProps = null;
vi.mock("./DeleteConfirmModal", () => ({
  default: (props) => {
    if (!props.pengiriman) return null;
    lastDeleteModalProps = props;
    return (
      <div data-testid="delete-confirm-modal">
        <button onClick={() => props.onConfirm()}>DeleteConfirmOK</button>
        <button onClick={() => props.onCancel()}>DeleteConfirmCancel</button>
      </div>
    );
  },
}));

const daftarPenerimaPelanggan = { id: "pel-9", nama: "Budi Lengkap", ekspedisi_biasa: "JNE" };
vi.mock("./DaftarPenerimaModal", () => ({
  default: (props) => (
    <div data-testid="daftar-penerima-modal">
      <button onClick={() => props.onPick(daftarPenerimaPelanggan)}>DaftarPenerimaPick</button>
      <button onClick={() => props.onClose()}>DaftarPenerimaClose</button>
    </div>
  ),
}));

const { default: PengirimanTab } = await import("./PengirimanTab");

function makePengiriman(overrides = {}) {
  return {
    id: "pg1",
    pengiriman_no: "KRM-20260824-123",
    tanggal: "2026-08-24",
    nama_penerima: "Budi Santoso",
    nama_ekspedisi: "JNE",
    ...overrides,
  };
}

beforeEach(() => {
  pengirimanState.pengirimanList = [];
  pengirimanState.loading = false;
  pengirimanState.reload.mockReset();
  deleteHook.mockReset().mockResolvedValue(undefined);
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
  lastFormProps = null;
  lastDeleteModalProps = null;
});

describe("PengirimanTab", () => {
  it("menampilkan loading saat loading=true", () => {
    pengirimanState.loading = true;
    render(<PengirimanTab />);
    expect(screen.getByText("Memuat data...")).toBeInTheDocument();
  });

  it("menampilkan pesan kosong dan tombol buat pertama saat pengirimanList kosong", () => {
    render(<PengirimanTab />);
    expect(screen.getByText("Belum ada pengiriman")).toBeInTheDocument();
    expect(screen.getByText("+ Buat Pengiriman Pertama")).toBeInTheDocument();
  });

  it("menampilkan PengirimanCard untuk setiap pengiriman", () => {
    pengirimanState.pengirimanList = [makePengiriman(), makePengiriman({ id: "pg2", pengiriman_no: "KRM-2" })];
    render(<PengirimanTab />);
    expect(screen.getAllByTestId("pengiriman-card")).toHaveLength(2);
  });

  it("klik '+ Pengiriman' membuka PengirimanForm", async () => {
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("+ Pengiriman"));
    expect(screen.getByTestId("pengiriman-form")).toBeInTheDocument();
  });

  it("FormClose menutup PengirimanForm", async () => {
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("+ Pengiriman"));
    await userEvent.click(screen.getByText("FormClose"));
    expect(screen.queryByTestId("pengiriman-form")).not.toBeInTheDocument();
  });

  it("FormSave (buat baru): reload + toast sukses + membuka SuratJalanPengiriman", async () => {
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("+ Pengiriman"));
    await userEvent.click(screen.getByText("FormSave"));

    await waitFor(() => expect(pengirimanState.reload).toHaveBeenCalled());
    expect(toastSuccessMock).toHaveBeenCalledWith("Pengiriman KRM-SAVED-001 berhasil disimpan.");
    expect(screen.getByTestId("surat-jalan-pengiriman")).toBeInTheDocument();
    expect(screen.queryByTestId("pengiriman-form")).not.toBeInTheDocument();
  });

  it("SuratClose menutup SuratJalanPengiriman", async () => {
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("+ Pengiriman"));
    await userEvent.click(screen.getByText("FormSave"));
    await waitFor(() => expect(screen.getByTestId("surat-jalan-pengiriman")).toBeInTheDocument());
    await userEvent.click(screen.getByText("SuratClose"));
    expect(screen.queryByTestId("surat-jalan-pengiriman")).not.toBeInTheDocument();
  });

  it("CardSuratJalan membuka SuratJalanPengiriman langsung", async () => {
    pengirimanState.pengirimanList = [makePengiriman()];
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("CardSuratJalan"));
    expect(screen.getByTestId("surat-jalan-pengiriman")).toBeInTheDocument();
  });

  it("CardEdit membuka PengirimanForm dengan initialData", async () => {
    pengirimanState.pengirimanList = [makePengiriman()];
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("CardEdit"));
    expect(screen.getByTestId("pengiriman-form")).toBeInTheDocument();
    expect(lastFormProps.initialData).toBeTruthy();
  });

  it("edit FormSave: reload + toast 'diperbarui' (bukan 'berhasil disimpan')", async () => {
    pengirimanState.pengirimanList = [makePengiriman()];
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("CardEdit"));
    await userEvent.click(screen.getByText("FormSave"));

    await waitFor(() => expect(pengirimanState.reload).toHaveBeenCalled());
    expect(toastSuccessMock).toHaveBeenCalledWith("Pengiriman KRM-SAVED-001 diperbarui.");
    expect(screen.queryByTestId("pengiriman-form")).not.toBeInTheDocument();
  });

  it("CardDelete membuka DeleteConfirmModal", async () => {
    pengirimanState.pengirimanList = [makePengiriman()];
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("CardDelete"));
    expect(screen.getByTestId("delete-confirm-modal")).toBeInTheDocument();
  });

  it("DeleteConfirmCancel menutup modal tanpa memanggil deleteHook", async () => {
    pengirimanState.pengirimanList = [makePengiriman()];
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("CardDelete"));
    await userEvent.click(screen.getByText("DeleteConfirmCancel"));
    expect(screen.queryByTestId("delete-confirm-modal")).not.toBeInTheDocument();
    expect(deleteHook).not.toHaveBeenCalled();
  });

  it("DeleteConfirmOK memanggil deleteHook, reload, toast sukses", async () => {
    const target = makePengiriman();
    pengirimanState.pengirimanList = [target];
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("CardDelete"));
    await userEvent.click(screen.getByText("DeleteConfirmOK"));

    await waitFor(() => expect(deleteHook).toHaveBeenCalledWith(target));
    expect(pengirimanState.reload).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("Pengiriman dihapus.");
    expect(screen.queryByTestId("delete-confirm-modal")).not.toBeInTheDocument();
  });

  it("DeleteConfirmOK gagal: memanggil toast.error, modal tetap tertutup dari loading state", async () => {
    deleteHook.mockRejectedValue(new Error("jaringan error"));
    pengirimanState.pengirimanList = [makePengiriman()];
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("CardDelete"));
    await userEvent.click(screen.getByText("DeleteConfirmOK"));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("jaringan error"));
  });

  it("date preset custom: menampilkan input tanggal", async () => {
    render(<PengirimanTab />);
    await userEvent.click(screen.getByText("Custom"));
    expect(screen.getAllByDisplayValue("")[0]).toHaveAttribute("type", "date");
  });

  describe("tombol 'Daftar Penerima' (permintaan Denny 2026-08)", () => {
    it("klik 'Daftar Penerima' membuka DaftarPenerimaModal", async () => {
      render(<PengirimanTab />);
      await userEvent.click(screen.getByText("Daftar Penerima"));
      expect(screen.getByTestId("daftar-penerima-modal")).toBeInTheDocument();
    });

    it("DaftarPenerimaClose menutup modal tanpa membuka form", async () => {
      render(<PengirimanTab />);
      await userEvent.click(screen.getByText("Daftar Penerima"));
      await userEvent.click(screen.getByText("DaftarPenerimaClose"));
      expect(screen.queryByTestId("daftar-penerima-modal")).not.toBeInTheDocument();
      expect(screen.queryByTestId("pengiriman-form")).not.toBeInTheDocument();
    });

    it("pilih penerima dari daftar menutup DaftarPenerimaModal & membuka PengirimanForm dgn prefillPelanggan (bukan initialData)", async () => {
      render(<PengirimanTab />);
      await userEvent.click(screen.getByText("Daftar Penerima"));
      await userEvent.click(screen.getByText("DaftarPenerimaPick"));

      expect(screen.queryByTestId("daftar-penerima-modal")).not.toBeInTheDocument();
      expect(screen.getByTestId("pengiriman-form")).toBeInTheDocument();
      expect(lastFormProps.prefillPelanggan).toEqual(daftarPenerimaPelanggan);
      expect(lastFormProps.initialData).toBeFalsy();
    });

    it("menutup form setelah prefill dari daftar penerima me-reset prefillPelanggan (pembukaan berikutnya kosong)", async () => {
      render(<PengirimanTab />);
      await userEvent.click(screen.getByText("Daftar Penerima"));
      await userEvent.click(screen.getByText("DaftarPenerimaPick"));
      await userEvent.click(screen.getByText("FormClose"));

      await userEvent.click(screen.getByText("+ Pengiriman"));
      expect(lastFormProps.prefillPelanggan).toBeFalsy();
    });
  });
});
