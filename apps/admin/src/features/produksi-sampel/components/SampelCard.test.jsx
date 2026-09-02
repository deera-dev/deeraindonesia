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

const planningSampel = {
  id: "s4",
  nama: "Gamis Planning A",
  nomor: "SPL-20260801-XYZ",
  tanggal: "2026-08-01",
  status: "planning",
  foto: [],
  bahan_foto: "https://cloud/bahan.jpg",
  model_foto: ["https://cloud/model1.jpg", "https://cloud/model2.jpg"],
};

const ditahanSampel = {
  ...draftSampel,
  id: "s5",
  status: "ditahan",
  ditahan_note: "Tunggu bahan tambahan",
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

  it("shows Menunggu Review status badge (redesign Planning 2026-08)", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText("Menunggu Review")).toBeInTheDocument();
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

  it("chip bahan_items tidak muncul untuk status non-planning", () => {
    const draftWithBahan = { ...draftSampel, bahan_items: [{ nama_bahan: "Wolfis" }] };
    render(<SampelCard sampel={draftWithBahan} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByText("Wolfis")).not.toBeInTheDocument();
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

describe("SampelCard — Work Order (permintaan Denny 2026-09: 'sudah di approve ... langsung bisa membuat Work Order untuk tukang potongnya')", () => {
  it("shows Work Order button for approved sampel", () => {
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWorkOrder={vi.fn()} />);
    expect(screen.getByText("Work Order")).toBeInTheDocument();
  });

  it("calls onWorkOrder with sampel when clicked", async () => {
    const user = userEvent.setup();
    const onWorkOrder = vi.fn();
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWorkOrder={onWorkOrder} />);
    await user.click(screen.getByText("Work Order"));
    expect(onWorkOrder).toHaveBeenCalledWith(approvedSampel);
  });

  it("does not show Work Order button for draft/planning/rejected/ditahan", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByText("Work Order")).not.toBeInTheDocument();
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

describe("SampelCard — planning", () => {
  it("shows Planning badge", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={vi.fn()} />);
    expect(screen.getByText("Planning")).toBeInTheDocument();
  });

  it("renders bahan_foto & model_foto thumbnails", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={vi.fn()} />);
    expect(screen.getByAltText("bahan")).toBeInTheDocument();
    expect(screen.getByAltText("model 1")).toBeInTheDocument();
    expect(screen.getByAltText("model 2")).toBeInTheDocument();
  });

  it("shows Tandai Sudah Dibuat icon button, not Review & Approval", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={vi.fn()} />);
    expect(screen.getByTitle("Tandai Sudah Dibuat")).toBeInTheDocument();
    expect(screen.queryByText("Review & Approval")).not.toBeInTheDocument();
  });

  it("calls onMarkDibuat when tombol diklik", async () => {
    const user = userEvent.setup();
    const onMarkDibuat = vi.fn();
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={onMarkDibuat} />);
    await user.click(screen.getByTitle("Tandai Sudah Dibuat"));
    expect(onMarkDibuat).toHaveBeenCalledWith(planningSampel);
  });

  it("does not show Edit button for planning (belum ada form edit terpisah)", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={vi.fn()} />);
    expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();
  });

  it("tidak render chip bahan kalau bahan_items kosong/absen", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={vi.fn()} />);
    expect(screen.queryByText("Wolfis")).not.toBeInTheDocument();
  });

  it("render chip bahan_items (permintaan Denny 2026-08: pilih dari list bahan)", () => {
    const withBahan = {
      ...planningSampel,
      bahan_items: [
        { nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard" },
        { nama_bahan: "Katun Rayon", kode_bahan: "B-02", satuan: "meter" },
      ],
    };
    render(<SampelCard sampel={withBahan} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={vi.fn()} />);
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
    expect(screen.getByText("Katun Rayon")).toBeInTheDocument();
  });
});

describe("SampelCard — PhotoLightbox (permintaan Denny 2026-08: klik foto lihat full size)", () => {
  it("klik thumbnail header (draft) membuka lightbox di foto pertama", async () => {
    const user = userEvent.setup();
    const { container } = render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByLabelText("Tutup")).not.toBeInTheDocument();
    // thumbnail header pakai alt="" (dekoratif) — cari via querySelector, bukan role
    const headerThumb = container.querySelector("img").closest("button");
    await user.click(headerThumb);
    expect(screen.getByLabelText("Tutup")).toBeInTheDocument();
    // PhotoLightbox adalah satu-satunya elemen dengan alt="Foto" — mudah ditarget
    expect(screen.getByAltText("Foto")).toHaveAttribute("src", "https://cloud/foto1.jpg");
  });

  it("klik foto utama yang sedang di-expand membuka lightbox di fotoIdx yang sama", async () => {
    const user = userEvent.setup();
    const { container } = render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    await user.click(screen.getByText(/Foto/));
    // urutan render: [0]=thumbnail header, [1]=gambar utama, [2..]=thumbnail strip
    const imgs = container.querySelectorAll("img");
    const stripThumbKedua = imgs[3];
    await user.click(stripThumbKedua.closest("button"));
    // gambar utama sekarang menampilkan foto kedua (alt berubah)
    const mainImg = screen.getByAltText("foto 2");
    await user.click(mainImg.closest("button"));
    expect(screen.getByLabelText("Tutup")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("tombol Tutup menutup lightbox", async () => {
    const user = userEvent.setup();
    const { container } = render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    const headerThumb = container.querySelector("img").closest("button");
    await user.click(headerThumb);
    expect(screen.getByLabelText("Tutup")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Tutup"));
    expect(screen.queryByLabelText("Tutup")).not.toBeInTheDocument();
  });

  it("klik foto bahan (planning) membuka lightbox di index 0", async () => {
    const user = userEvent.setup();
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={vi.fn()} />);
    await user.click(screen.getByAltText("bahan"));
    expect(screen.getByLabelText("Tutup")).toBeInTheDocument();
    expect(screen.getByAltText("Foto")).toHaveAttribute("src", "https://cloud/bahan.jpg");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("klik foto model kedua (planning) membuka lightbox di index yang benar (bahan + model)", async () => {
    const user = userEvent.setup();
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={vi.fn()} />);
    await user.click(screen.getByAltText("model 2"));
    expect(screen.getByAltText("Foto")).toHaveAttribute("src", "https://cloud/model2.jpg");
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("planning tanpa bahan_foto: model foto pertama jadi index 0 di lightbox", async () => {
    const user = userEvent.setup();
    const noBahan = { ...planningSampel, bahan_foto: null };
    render(<SampelCard sampel={noBahan} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onMarkDibuat={vi.fn()} />);
    await user.click(screen.getByAltText("model 1"));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
});

describe("SampelCard — Diskusi & Pin (permintaan Denny 2026-09)", () => {
  it("calls onOpenDiscussion when tombol Catatan/Diskusi diklik", async () => {
    const user = userEvent.setup();
    const onOpenDiscussion = vi.fn();
    render(
      <SampelCard
        sampel={draftSampel}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReview={vi.fn()}
        onOpenDiscussion={onOpenDiscussion}
      />,
    );
    await user.click(screen.getByText("Catatan/Diskusi"));
    expect(onOpenDiscussion).toHaveBeenCalledWith(draftSampel);
  });

  it("tidak menampilkan badge pin kalau sampel.pinned falsy", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByText(/Penting/)).not.toBeInTheDocument();
  });

  it("menampilkan badge pin kalau sampel.pinned true", () => {
    render(
      <SampelCard
        sampel={{ ...draftSampel, pinned: true }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    expect(screen.getByText(/Penting/)).toBeInTheDocument();
  });
});

describe("SampelCard — ditahan", () => {
  it("shows Ditahan badge", () => {
    render(<SampelCard sampel={ditahanSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText("Ditahan")).toBeInTheDocument();
  });

  it("shows ditahan_note", () => {
    render(<SampelCard sampel={ditahanSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText(/Tunggu bahan tambahan/)).toBeInTheDocument();
  });

  it("shows Tinjau Ulang button that calls onReview", async () => {
    const user = userEvent.setup();
    const onReview = vi.fn();
    render(<SampelCard sampel={ditahanSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={onReview} />);
    await user.click(screen.getByText("Tinjau Ulang"));
    expect(onReview).toHaveBeenCalledWith(ditahanSampel);
  });
});
