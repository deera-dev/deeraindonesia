import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

  it("shows Menunggu Approval status badge (permintaan Denny 2026-09: wording diperjelas)", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText("Menunggu Approval")).toBeInTheDocument();
  });

  it("shows Review & Approval button for draft", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByLabelText("Review & Approval")).toBeInTheDocument();
  });

  it("calls onReview when Review clicked", async () => {
    const user = userEvent.setup();
    const onReview = vi.fn();
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={onReview} />);
    await user.click(screen.getByLabelText("Review & Approval"));
    expect(onReview).toHaveBeenCalledWith(draftSampel);
  });

  it("calls onEdit when ✎ clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<SampelCard sampel={draftSampel} onEdit={onEdit} onDelete={vi.fn()} onReview={vi.fn()} />);
    await user.click(screen.getByTitle("Edit foto sampel"));
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
    const fotoBtn = screen.getByLabelText(/Foto \(/);
    await user.click(fotoBtn);
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });

  it("chip bahan_items tidak muncul untuk status non-planning", () => {
    const draftWithBahan = { ...draftSampel, bahan_items: [{ nama_bahan: "Wolfis" }] };
    render(<SampelCard sampel={draftWithBahan} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByText("Wolfis")).not.toBeInTheDocument();
  });
});

describe("SampelCard — approved", () => {
  it("shows Disetujui badge (permintaan Denny 2026-09: wording diperjelas)", () => {
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText("Disetujui")).toBeInTheDocument();
  });

  it("shows approved_by info", () => {
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText(/admin@deera\.id/)).toBeInTheDocument();
  });

  it("shows perubahan note in expanded state", async () => {
    const user = userEvent.setup();
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    await user.click(screen.getByLabelText(/Foto \(/));
    expect(screen.getByText("Ada perubahan warna kerah")).toBeInTheDocument();
  });

  it("does not show Edit button for approved", () => {
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();
  });
});

describe("SampelCard — Work Order Terakhir (Denny 2026-10-20: size & catatan WO hilang kalau tidak disimpan)", () => {
  it("menampilkan size & catatan WO terakhir di state expanded kalau wo_sizes/wo_catatan terisi", async () => {
    const user = userEvent.setup();
    const withWo = { ...approvedSampel, wo_sizes: ["Midi", "Gamis"], wo_catatan: "Kancing dipindah ke kiri" };
    render(<SampelCard sampel={withWo} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    await user.click(screen.getByLabelText(/Foto \(/));
    expect(screen.getByText("Work Order Terakhir")).toBeInTheDocument();
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("Gamis")).toBeInTheDocument();
    expect(screen.getByText("Kancing dipindah ke kiri")).toBeInTheDocument();
  });

  it("tidak menampilkan section Work Order Terakhir kalau wo_sizes & wo_catatan kosong/absen", async () => {
    const user = userEvent.setup();
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    await user.click(screen.getByLabelText(/Foto \(/));
    expect(screen.queryByText("Work Order Terakhir")).not.toBeInTheDocument();
  });
});

describe("SampelCard — Work Order (permintaan Denny 2026-09: 'sudah di approve ... langsung bisa membuat Work Order untuk tukang potongnya')", () => {
  it("shows Work Order button for approved sampel", () => {
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWorkOrder={vi.fn()} />);
    expect(screen.getByLabelText("Buat Work Order")).toBeInTheDocument();
  });

  it("calls onWorkOrder with sampel when clicked", async () => {
    const user = userEvent.setup();
    const onWorkOrder = vi.fn();
    render(<SampelCard sampel={approvedSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWorkOrder={onWorkOrder} />);
    await user.click(screen.getByLabelText("Buat Work Order"));
    expect(onWorkOrder).toHaveBeenCalledWith(approvedSampel);
  });

  it("does not show Work Order button for draft/planning/rejected/ditahan", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByLabelText("Buat Work Order")).not.toBeInTheDocument();
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
    await user.click(screen.getByLabelText("Foto (2)"));
    expect(screen.getAllByText(/Jahitan tidak rapi/).length).toBeGreaterThan(0);
  });
});

describe("SampelCard — planning", () => {
  it("shows Belum Dibuat badge (permintaan Denny 2026-09: wording diperjelas)", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    expect(screen.getByText("Belum Dibuat")).toBeInTheDocument();
  });

  it("renders bahan_foto & model_foto thumbnails", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    expect(screen.getByAltText("bahan 1")).toBeInTheDocument();
    expect(screen.getByAltText("model 1")).toBeInTheDocument();
    expect(screen.getByAltText("model 2")).toBeInTheDocument();
  });

  it("shows Tandai Sudah Dibuat icon button, not Review & Approval", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    expect(screen.getByLabelText("Buat WO Sampel")).toBeInTheDocument();
    expect(screen.queryByText("Lanjut ke WO →")).not.toBeInTheDocument();
    expect(screen.queryByText(/Upload Foto/)).toBeNull();
    expect(screen.queryByLabelText("Review & Approval")).not.toBeInTheDocument();
  });

  it("Buat WO Sampel memanggil onWoSampel", async () => {
    const user = userEvent.setup();
    const onWoSampel = vi.fn();
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={onWoSampel} onSampelJadi={vi.fn()} />);
    await user.click(screen.getByLabelText("Buat WO Sampel"));
    expect(onWoSampel).toHaveBeenCalledWith(planningSampel);
  });

  it("setelah WO Sampel dibuat: badge Sedang Dibuat + tombol Sampel Sudah Jadi", async () => {
    const user = userEvent.setup();
    const onSampelJadi = vi.fn();
    const dibuat = { ...planningSampel, wo_sampel_at: "2026-10-17T01:00:00Z" };
    render(<SampelCard sampel={dibuat} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={onSampelJadi} />);
    expect(screen.getByText("Sedang Dibuat")).toBeInTheDocument();
    expect(screen.queryByLabelText("Buat WO Sampel")).not.toBeInTheDocument();
    expect(screen.getByLabelText("WO Sampel")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Sampel Sudah Jadi"));
    expect(onSampelJadi).toHaveBeenCalledWith(dibuat);
  });

  it("does not show Edit button for planning (belum ada form edit terpisah)", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();
  });

  it("tidak render chip bahan kalau bahan_items kosong/absen", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
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
    render(<SampelCard sampel={withBahan} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    expect(screen.getAllByText("Wolfis").length).toBeGreaterThan(0);
    expect(screen.getByText("Katun Rayon")).toBeInTheDocument();
  });
});

describe("SampelCard — PhotoLightbox (permintaan Denny 2026-08: klik foto lihat full size)", () => {
  it("klik thumbnail header (draft) membuka lightbox di foto pertama", async () => {
    const user = userEvent.setup();
    const { container } = render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    expect(screen.queryByLabelText("Tutup")).not.toBeInTheDocument();
    const headerThumb = container.querySelector("img").closest("button");
    await user.click(headerThumb);
    expect(screen.getByLabelText("Tutup")).toBeInTheDocument();
    expect(screen.getByAltText("Foto")).toHaveAttribute("src", "https://cloud/foto1.jpg");
  });

  it("klik foto utama yang sedang di-expand membuka lightbox di fotoIdx yang sama", async () => {
    const user = userEvent.setup();
    const { container } = render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} />);
    await user.click(screen.getByLabelText(/Foto \(/));
    const imgs = container.querySelectorAll("img");
    const stripThumbKedua = imgs[3];
    await user.click(stripThumbKedua.closest("button"));
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
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    await user.click(screen.getByAltText("bahan 1"));
    expect(screen.getByLabelText("Tutup")).toBeInTheDocument();
    expect(screen.getByAltText("Foto")).toHaveAttribute("src", "https://cloud/bahan.jpg");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("klik foto model kedua (planning) membuka lightbox di index yang benar (bahan + model)", async () => {
    const user = userEvent.setup();
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    await user.click(screen.getByAltText("model 2"));
    expect(screen.getByAltText("Foto")).toHaveAttribute("src", "https://cloud/model2.jpg");
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("planning tanpa bahan_foto: model foto pertama jadi index 0 di lightbox", async () => {
    const user = userEvent.setup();
    const noBahan = { ...planningSampel, bahan_foto: null };
    render(<SampelCard sampel={noBahan} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    await user.click(screen.getByAltText("model 1"));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
});

describe("SampelCard — Repeat (permintaan Denny 2026-10-08)", () => {
  const repeatPlanning = { ...planningSampel, id: "r1", is_repeat: true, repeat_dari_kode: "D-07-OSK" };

  it("planning repeat: badge Repeat + tombol Approve Repeat memanggil onApproveRepeat", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const onApproveRepeat = vi.fn();
    render(<SampelCard sampel={repeatPlanning} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} onApproveRepeat={onApproveRepeat} />);
    expect(screen.getByText("↻ Repeat")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Approve Repeat"));
    expect(onApproveRepeat).toHaveBeenCalledWith(repeatPlanning);
  });

  it("planning biasa: tidak ada tombol Approve Repeat", () => {
    render(<SampelCard sampel={planningSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} onApproveRepeat={vi.fn()} />);
    expect(screen.queryByLabelText(/Approve Repeat/)).not.toBeInTheDocument();
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
    await user.click(screen.getByLabelText("Diskusi"));
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

describe("SampelCard — multi-bahan dgn foto masing-masing (permintaan Denny 2026-09)", () => {
  const multiBahanSampel = {
    ...planningSampel,
    bahan_foto: null,
    bahan_items: [
      { nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard", foto: "https://cloud/wolfis.jpg" },
      { nama_bahan: "Katun Rayon", kode_bahan: "B-02", satuan: "meter", foto: "https://cloud/katun.jpg" },
    ],
  };

  it("render 1 thumbnail per bahan yang punya foto, dgn label nama bahan masing-masing", () => {
    render(
      <SampelCard sampel={multiBahanSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />,
    );
    expect(screen.getByAltText("bahan 1")).toHaveAttribute("src", "https://cloud/wolfis.jpg");
    expect(screen.getByAltText("bahan 2")).toHaveAttribute("src", "https://cloud/katun.jpg");
    expect(screen.getByText("Wolfis", { selector: "span.absolute" })).toBeInTheDocument();
    expect(screen.getByText("Katun Rayon", { selector: "span.absolute" })).toBeInTheDocument();
  });

  it("bahan tanpa foto tidak dapat thumbnail, tapi tetap tampil sbg chip nama", () => {
    const partial = {
      ...planningSampel,
      bahan_foto: null,
      bahan_items: [
        { nama_bahan: "Wolfis", foto: "https://cloud/wolfis.jpg" },
        { nama_bahan: "Tanpa Foto" },
      ],
    };
    render(<SampelCard sampel={partial} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    expect(screen.getAllByAltText(/^bahan \d$/)).toHaveLength(1);
    expect(screen.getByText("Tanpa Foto")).toBeInTheDocument();
  });

  it("lightbox gallery menggabungkan SEMUA foto bahan + model (bukan cuma 1)", async () => {
    const user = userEvent.setup();
    render(
      <SampelCard sampel={multiBahanSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />,
    );
    await user.click(screen.getByAltText("bahan 2"));
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("planning LAMA (bahan_items tanpa field foto, cuma bahan_foto legacy) tetap tampil 1 foto fallback", () => {
    const legacy = {
      ...planningSampel,
      bahan_items: [{ nama_bahan: "Wolfis" }],
    };
    render(<SampelCard sampel={legacy} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} />);
    expect(screen.getByAltText("bahan 1")).toHaveAttribute("src", "https://cloud/bahan.jpg");
  });
});

describe("SampelCard — badge unread Diskusi (permintaan Denny 2026-09)", () => {
  it("tidak menampilkan bulatan angka kalau unreadCount 0/tidak diisi", () => {
    render(<SampelCard sampel={draftSampel} onEdit={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onOpenDiscussion={vi.fn()} />);
    expect(screen.queryByText(/^[0-9]$/)).not.toBeInTheDocument();
  });

  it("menampilkan jumlah unread di tombol Catatan/Diskusi", () => {
    render(
      <SampelCard
        sampel={draftSampel}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReview={vi.fn()}
        onOpenDiscussion={vi.fn()}
        unreadCount={3}
      />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("menampilkan '9+' kalau unreadCount lebih dari 9", () => {
    render(
      <SampelCard
        sampel={draftSampel}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReview={vi.fn()}
        onOpenDiscussion={vi.fn()}
        unreadCount={15}
      />,
    );
    expect(screen.getByText("9+")).toBeInTheDocument();
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
    await user.click(screen.getByLabelText("Tinjau Ulang"));
    expect(onReview).toHaveBeenCalledWith(ditahanSampel);
  });
});

describe("SampelCard — WO selesai & foto acuan (Denny 2026-10-14)", () => {
  const base = { ...approvedSampel, model_foto: ["https://cloud/m1.jpg", "https://cloud/m2.jpg"], bahan_foto: "https://cloud/b.jpg" };
  it("approved: tombol Selesai memanggil onWoSelesai(sampel, true)", async () => {
    const onWoSelesai = vi.fn();
    render(<SampelCard sampel={base} onWoSelesai={onWoSelesai} onWorkOrder={vi.fn()} onOpenDiscussion={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Tandai WO Selesai"));
    expect(onWoSelesai).toHaveBeenCalledWith(base, true);
  });
  it("sudah selesai: badge WO Selesai + tombol Kembalikan", async () => {
    const onWoSelesai = vi.fn();
    const done = { ...base, wo_selesai_at: "2026-10-14T00:00:00Z" };
    const onMundur = vi.fn();
    render(<SampelCard sampel={done} onWoSelesai={onWoSelesai} onMundur={onMundur} onWorkOrder={vi.fn()} onOpenDiscussion={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/WO Selesai/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Kembali ke Work Order"));
    expect(onMundur).toHaveBeenCalledWith(done);
  });

  it("tombol mundur: label sesuai step (Rencana / Sampel / Work Order) dan tidak ada di Rencana", () => {
    const common = { onOpenDiscussion: vi.fn(), onDelete: vi.fn(), onMundur: vi.fn(), onWoSampel: vi.fn(), onSampelJadi: vi.fn(), onReview: vi.fn(), onWorkOrder: vi.fn() };
    const { rerender } = render(<SampelCard sampel={{ ...base, status: "planning" }} {...common} />);
    expect(screen.queryByLabelText(/^Kembali ke/)).toBeNull();
    rerender(<SampelCard sampel={{ ...base, status: "planning", wo_sampel_at: "2026-10-17" }} {...common} />);
    expect(screen.getByLabelText("Kembali ke Rencana")).toBeInTheDocument();
    rerender(<SampelCard sampel={{ ...base, status: "draft" }} {...common} />);
    expect(screen.getByLabelText("Kembali ke Rencana")).toBeInTheDocument();
    rerender(<SampelCard sampel={{ ...base, status: "approved" }} {...common} />);
    expect(screen.getByLabelText("Kembali ke Sampel")).toBeInTheDocument();
  });
  it("foto acuan bahan+model ikut dihitung & tampil setelah status bukan planning", async () => {
    render(<SampelCard sampel={base} onWoSelesai={vi.fn()} onWorkOrder={vi.fn()} onOpenDiscussion={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Foto (5)"));
    expect(screen.getByText(/Foto Acuan/)).toBeInTheDocument();
  });
});

describe("SampelCard — tombol Edit planning", () => {
  it("memanggil onEditPlan dengan sampel", async () => {
    const onEditPlan = vi.fn();
    render(<SampelCard sampel={planningSampel} onEditPlan={onEditPlan} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} onOpenDiscussion={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Edit judul, bahan & foto acuan"));
    expect(onEditPlan).toHaveBeenCalledWith(planningSampel);
  });
  it("tanpa onEditPlan tidak ada tombol Edit", () => {
    render(<SampelCard sampel={planningSampel} onWoSampel={vi.fn()} onSampelJadi={vi.fn()} onOpenDiscussion={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByLabelText("Edit judul, bahan & foto acuan")).not.toBeInTheDocument();
  });
});
