import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// cldUrl just returns the first arg for testing
vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => url ?? "",
}));

import SampelCard from "./SampelCard";

const draftSampel = {
  id: "s1",
  nama: "Gamis Arkana",
  nomor: "SPL-20240115-ABC",
  tanggal: "2024-01-15",
  status: "draft",
  foto: ["https://cloud/foto1.jpg", "https://cloud/foto2.jpg"],
  perubahan: null,
  rejection_note: null,
  approved_by: null,
};

const approvedSampel = {
  ...draftSampel,
  id: "s2",
  status: "approved",
  perubahan: "Ada perubahan warna kerah",
  approved_by: "admin@deera.id",
};

const rejectedSampel = {
  ...draftSampel,
  id: "s3",
  status: "rejected",
  rejection_note: "Jahitan tidak rapi",
};

beforeEach(() => vi.clearAllMocks());

describe("SampelCard — draft", () => {
  it("renders sampel nama", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText("Gamis Arkana")).toBeInTheDocument();
  });

  it("renders nomor", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText(/SPL-20240115-ABC/)).toBeInTheDocument();
  });

  it("shows Menunggu status badge", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText("Menunggu")).toBeInTheDocument();
  });

  it("shows Review & Approval button for draft", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText("Review & Approval")).toBeInTheDocument();
  });

  it("calls onReview when Review clicked", async () => {
    const user = userEvent.setup();
    const onReview = vi.fn();
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={onReview} />);
    await user.click(screen.getByText("Review & Approval"));
    expect(onReview).toHaveBeenCalledWith(draftSampel);
  });

  it("calls onEdit when ✎ clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<SampelCard sampel={draftSampel} onEdit={onEdit} onDelete={vi.fn()} onReview={vi.fn()} />);
    await user.click(screen.getByTitle("Edit"));
    expect(onEdit).toHaveBeenCalledWith(draftSampel);
  });

  it("calls onDelete when × clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={onDelete} onReview={vi.fn()} />);
    await user.click(screen.getByTitle("Hapus"));
    expect(onDelete).toHaveBeenCalledWith(draftSampel);
  });

  it("expands photo when foto button clicked", async () => {
    const user = userEvent.setup();
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    const fotoBtn = screen.getByText(/Foto/);
    await user.click(fotoBtn);
    // expanded image shows
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });
});

describe("SampelCard — approved", () => {
  it("shows Approved badge", () => {
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("shows approved_by info", () => {
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText(/admin@deera\.id/)).toBeInTheDocument();
  });

  it("shows perubahan note in expanded state", async () => {
    const user = userEvent.setup();
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    await user.click(screen.getByText(/Foto/));
    expect(screen.getByText("Ada perubahan warna kerah")).toBeInTheDocument();
  });

  it("does not show Edit button for approved", () => {
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();
  });
});

describe("SampelCard — rejected", () => {
  it("shows Ditolak badge", () => {
    render(<SampelCard sampel={rejectedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText("Ditolak")).toBeInTheDocument();
  });

  it("shows rejection_note in header", () => {
    render(<SampelCard sampel={rejectedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText(/Jahitan tidak rapi/)).toBeInTheDocument();
  });

  it("shows rejection note in expanded state", async () => {
    const user = userEvent.setup();
    render(<SampelCard sampel={rejectedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    await user.click(screen.getByText("Foto (2)"));
    expect(screen.getAllByText(/Jahitan tidak rapi/).length).toBeGreaterThan(0);
  });
});
