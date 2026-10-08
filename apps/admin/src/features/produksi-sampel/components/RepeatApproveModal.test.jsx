import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/cloudinary", () => ({ cldUrl: (u) => u ?? "" }));

import RepeatApproveModal from "./RepeatApproveModal";

const sampel = { id: "r1", nama: "Repeat Gamis", repeat_dari_kode: "D-07-OSK" };

describe("RepeatApproveModal", () => {
  it("menyebut sampel acuan dan konfirmasi tanpa catatan", async () => {
    const onConfirm = vi.fn();
    render(<RepeatApproveModal sampel={sampel} fotos={["f1"]} onConfirm={onConfirm} onClose={vi.fn()} />);
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Approve Repeat", { selector: "button" }));
    expect(onConfirm).toHaveBeenCalledWith("");
  });

  it("catatan ikut dikirim (di-trim)", async () => {
    const onConfirm = vi.fn();
    render(<RepeatApproveModal sampel={sampel} fotos={[]} onConfirm={onConfirm} onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/Kosongkan kalau sama persis/), "  kancing beda ");
    await userEvent.click(screen.getByText("Approve Repeat", { selector: "button" }));
    expect(onConfirm).toHaveBeenCalledWith("kancing beda");
  });

  it("saving menonaktifkan tombol; Batal memanggil onClose", async () => {
    const onClose = vi.fn();
    render(<RepeatApproveModal sampel={sampel} fotos={[]} onConfirm={vi.fn()} onClose={onClose} saving />);
    expect(screen.getByText("Menyimpan...")).toBeDisabled();
    expect(screen.getByText("Batal")).toBeDisabled();
  });
});
