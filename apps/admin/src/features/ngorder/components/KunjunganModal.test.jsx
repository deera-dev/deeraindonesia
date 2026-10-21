import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../hooks", async () => ({ ...(await vi.importActual("../utils")) }));
import KunjunganModal from "./KunjunganModal";

const toko = { id: "t1", nama: "Toko A", daerah: "TEGAL" };

describe("KunjunganModal", () => {
  it("mengisi feedback kunjungan lalu menyimpan status, hasil, request, kesan", async () => {
    const onSave = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    const row = { id: "k1", toko_id: "t1", status: "rencana", dipilih_oleh_nama: "Denny" };
    render(<KunjunganModal row={row} toko={toko} onSave={onSave} saving={false} onClose={onClose} />);

    expect(screen.getByRole("button", { name: "Sedang dikunjungi" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Dipilih oleh Denny/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Selesai" }));
    fireEvent.click(screen.getByRole("button", { name: "Tertarik" }));
    fireEvent.change(screen.getByPlaceholderText(/ketemu owner/), { target: { value: "Ambil 2 seri" } });
    fireEvent.change(screen.getByPlaceholderText(/warna maroon/), { target: { value: "Size jumbo" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(row, { status: "selesai", hasil: "Ambil 2 seri", request: "Size jumbo", kesan: "tertarik" });
  });

  it("gagal simpan → modal tetap terbuka", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("x"));
    const onClose = vi.fn();
    render(<KunjunganModal row={{ id: "k1", status: "berlangsung" }} toko={toko} onSave={onSave} saving={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
