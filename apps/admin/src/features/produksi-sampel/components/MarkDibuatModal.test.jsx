import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/mediaUpload", () => ({
  uploadMedia: vi.fn().mockResolvedValue({ url: "https://cld/jadi.jpg" }),
  friendlyMediaErrorMessage: vi.fn((err) => err?.message ?? "Upload gagal."),
}));

import MarkDibuatModal from "./MarkDibuatModal";
import { uploadMedia } from "@deera/shared/lib/mediaUpload";

const sampel = { id: "s1", nama: "Gamis Planning A", nomor: "SPL-001" };

beforeEach(() => {
  vi.clearAllMocks();
  uploadMedia.mockResolvedValue({ url: "https://cld/jadi.jpg" });
});

function fileList(n = 1) {
  return Array.from({ length: n }, (_, i) => new File(["x"], `foto${i}.jpg`, { type: "image/jpeg" }));
}

describe("MarkDibuatModal", () => {
  it("renders nama sampel", () => {
    render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Gamis Planning A")).toBeInTheDocument();
  });

  it("tombol submit dinonaktifkan tanpa foto", () => {
    render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Tandai Sudah Dibuat" })).toBeDisabled();
  });

  it("calls onClose saat × diklik", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={onClose} />);
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose saat Batal diklik", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={onClose} />);
    await user.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("upload foto lalu submit mengirim url hasil upload", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MarkDibuatModal sampel={sampel} onSave={onSave} onClose={vi.fn()} />);

    const input = document.querySelector("input[type=file]");
    await user.upload(input, fileList(1));

    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    const submitBtn = screen.getByRole("button", { name: "Tandai Sudah Dibuat" });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    await user.click(submitBtn);
    expect(onSave).toHaveBeenCalledWith(["https://cld/jadi.jpg"]);
  });
});
