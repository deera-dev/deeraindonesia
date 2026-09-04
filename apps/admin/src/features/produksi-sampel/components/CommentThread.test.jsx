import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => url ?? "",
}));

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "admin@deera.id", user_metadata: { full_name: "Admin" } } }),
}));

const mockUseProfiles = vi.fn();
vi.mock("@deera/shared/features/profiles/hooks", () => ({
  useProfiles: () => mockUseProfiles(),
}));

vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUploadMedia = vi.fn();
vi.mock("@deera/shared/lib/mediaUpload", () => ({
  uploadMedia: (...args) => mockUploadMedia(...args),
  friendlyMediaErrorMessage: (err) => err.message,
}));

vi.mock("../../../shared/components/PhotoLightbox", () => ({
  default: ({ images, index, onClose }) =>
    index === null || index === undefined ? null : (
      <div data-testid="lightbox">
        <span>{images[index]}</span>
        <button onClick={onClose}>TutupLightbox</button>
      </div>
    ),
}));

const mockComments = vi.fn();
const mockAddCommentFn = vi.fn();
const mockDeleteCommentFn = vi.fn();
const mockUseReadsBySampel = vi.fn();
vi.mock("../hooks", () => ({
  useComments: (...args) => mockComments(...args),
  useAddComment: () => ({ addComment: mockAddCommentFn, adding: false }),
  useDeleteComment: () => mockDeleteCommentFn,
  useReadsBySampel: (...args) => mockUseReadsBySampel(...args),
}));

// URL.createObjectURL tidak tersedia di jsdom secara default
global.URL.createObjectURL = vi.fn(() => "blob://preview");

import CommentThread from "./CommentThread";
import { toast } from "@deera/shared/features/toast/hooks";

const sampel = {
  id: "s1",
  nomor: "SPL-001",
  nama: "Gamis Arkana",
  bahan_foto: "https://cld/bahan.jpg",
  model_foto: ["https://cld/model1.jpg"],
  foto: [],
};

const sampelNoFoto = { ...sampel, bahan_foto: null, model_foto: [] };

const profiles = [
  { id: "u1", email: "budi@deera.id", full_name: "Budi Santoso" },
  { id: "u2", email: "citra@deera.id", full_name: "Citra" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProfiles.mockReturnValue({ profiles });
  mockComments.mockReturnValue({ comments: [], loading: false });
  mockAddCommentFn.mockResolvedValue({ id: "c-new" });
  mockDeleteCommentFn.mockResolvedValue(undefined);
  mockUseReadsBySampel.mockReturnValue({ reads: [], loading: false });
});

describe("CommentThread — daftar komentar", () => {
  it("menampilkan loading state", () => {
    mockComments.mockReturnValue({ comments: [], loading: true });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByText(/Memuat komentar/)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong kalau belum ada komentar", () => {
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByText(/Belum ada diskusi/)).toBeInTheDocument();
  });

  it("merender teks & nama pengirim komentar", () => {
    mockComments.mockReturnValue({
      comments: [{ id: "c1", user_name: "Budi Santoso", user_email: "budi@deera.id", text: "halo dunia", created_at: "2026-08-01T09:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("halo dunia")).toBeInTheDocument();
  });

  it("nama pengirim diformat Title Case tanpa domain kalau user_name berupa email mentah (permintaan Denny 2026-09)", () => {
    mockComments.mockReturnValue({
      comments: [{ id: "c1", user_name: "denny@deera.id", user_email: "denny@deera.id", text: "test diskusi", created_at: "2026-08-01T09:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByText("Denny")).toBeInTheDocument();
    expect(screen.queryByText(/denny@deera\.id/)).not.toBeInTheDocument();
  });

  it("highlight mention di dalam teks komentar", () => {
    mockComments.mockReturnValue({
      comments: [{ id: "c1", user_name: "Citra", user_email: "citra@deera.id", text: "cc @Budi Santoso ya", created_at: "2026-08-01T09:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByText("@Budi Santoso")).toBeInTheDocument();
  });

  it("menampilkan foto komentar & bisa dibuka di lightbox", async () => {
    const user = userEvent.setup();
    mockComments.mockReturnValue({
      comments: [{ id: "c1", user_name: "Budi", user_email: "budi@deera.id", image_url: "https://cld/foto.jpg", created_at: "2026-08-01T09:00:00Z" }],
      loading: false,
    });
    const { container } = render(<CommentThread sampel={sampelNoFoto} />);
    const img = container.querySelector("img");
    await user.click(img);
    expect(screen.getByTestId("lightbox")).toBeInTheDocument();
  });

  it("menampilkan indikator 'membalas foto ini' kalau target_foto_url ada", () => {
    mockComments.mockReturnValue({
      comments: [{ id: "c1", user_name: "Budi", user_email: "budi@deera.id", text: "ini ya", target_foto_url: "https://cld/model1.jpg", created_at: "2026-08-01T09:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampelNoFoto} />);
    expect(screen.getByText(/membalas foto ini/)).toBeInTheDocument();
  });
});

describe("CommentThread — hapus komentar", () => {
  it("tombol Hapus hanya muncul untuk komentar milik user sendiri", () => {
    mockComments.mockReturnValue({
      comments: [
        { id: "c1", user_name: "Admin", user_email: "admin@deera.id", text: "punya saya", created_at: "2026-08-01T09:00:00Z" },
        { id: "c2", user_name: "Budi", user_email: "budi@deera.id", text: "punya budi", created_at: "2026-08-01T09:00:00Z" },
      ],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getAllByText("Hapus")).toHaveLength(1);
  });

  it("klik Hapus membuka modal konfirmasi, confirm memanggil deleteComment", async () => {
    const user = userEvent.setup();
    mockComments.mockReturnValue({
      comments: [{ id: "c1", user_name: "Admin", user_email: "admin@deera.id", text: "punya saya", created_at: "2026-08-01T09:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    await user.click(screen.getByText("Hapus"));
    expect(screen.getByText("Hapus Komentar")).toBeInTheDocument();
    const hapusButtons = screen.getAllByRole("button", { name: "Hapus" });
    await user.click(hapusButtons[hapusButtons.length - 1]);
    await waitFor(() => expect(mockDeleteCommentFn).toHaveBeenCalledWith("c1", "s1"));
  });

  it("Batal menutup modal konfirmasi tanpa memanggil deleteComment", async () => {
    const user = userEvent.setup();
    mockComments.mockReturnValue({
      comments: [{ id: "c1", user_name: "Admin", user_email: "admin@deera.id", text: "punya saya", created_at: "2026-08-01T09:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    await user.click(screen.getByText("Hapus"));
    await user.click(screen.getByText("Batal"));
    expect(screen.queryByText("Hapus Komentar")).not.toBeInTheDocument();
    expect(mockDeleteCommentFn).not.toHaveBeenCalled();
  });
});

describe("CommentThread — kirim komentar", () => {
  it("tombol Kirim disabled saat teks kosong & tidak ada foto", () => {
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByText("Kirim")).toBeDisabled();
  });

  it("mengetik teks mengaktifkan tombol Kirim, klik memanggil addComment", async () => {
    const user = userEvent.setup();
    render(<CommentThread sampel={sampel} />);
    const textarea = screen.getByPlaceholderText(/Tulis komentar/);
    await user.type(textarea, "cek dulu ya");
    expect(screen.getByText("Kirim")).not.toBeDisabled();
    await user.click(screen.getByText("Kirim"));
    await waitFor(() =>
      expect(mockAddCommentFn).toHaveBeenCalledWith(
        expect.objectContaining({
          sampelId: "s1",
          sampelNomor: "SPL-001",
          sampelNama: "Gamis Arkana",
          text: "cek dulu ya",
          imageUrl: null,
          targetFotoUrl: null,
          mentions: [],
          userEmail: "admin@deera.id",
          userName: "Admin",
        }),
      ),
    );
  });

  it("teks dikosongkan setelah kirim sukses", async () => {
    const user = userEvent.setup();
    render(<CommentThread sampel={sampel} />);
    const textarea = screen.getByPlaceholderText(/Tulis komentar/);
    await user.type(textarea, "cek dulu ya");
    await user.click(screen.getByText("Kirim"));
    await waitFor(() => expect(textarea).toHaveValue(""));
  });

  it("toast.error kalau addComment gagal", async () => {
    const user = userEvent.setup();
    mockAddCommentFn.mockRejectedValueOnce(new Error("network fail"));
    render(<CommentThread sampel={sampel} />);
    const textarea = screen.getByPlaceholderText(/Tulis komentar/);
    await user.type(textarea, "cek dulu ya");
    await user.click(screen.getByText("Kirim"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("network fail")),
    );
  });

  it("memilih foto 'balas ke foto' menyertakan targetFotoUrl saat kirim", async () => {
    const user = userEvent.setup();
    render(<CommentThread sampel={sampel} />);
    // Thumbnail pertama di picker "balas ke foto" adalah bahan_foto (index 0).
    await user.click(screen.getAllByAltText("")[0]);
    const textarea = screen.getByPlaceholderText(/Tulis komentar/);
    await user.type(textarea, "soal foto ini");
    await user.click(screen.getByText("Kirim"));
    await waitFor(() =>
      expect(mockAddCommentFn).toHaveBeenCalledWith(
        expect.objectContaining({ targetFotoUrl: "https://cld/bahan.jpg" }),
      ),
    );
  });
});

describe("CommentThread — mention autocomplete", () => {
  it("mengetik @ memicu dropdown profil yang cocok", async () => {
    const user = userEvent.setup();
    render(<CommentThread sampel={sampel} />);
    const textarea = screen.getByPlaceholderText(/Tulis komentar/);
    await user.type(textarea, "cc @Bu");
    expect(screen.getByRole("button", { name: "Budi Santoso" })).toBeInTheDocument();
  });

  it("klik nama di dropdown menyisipkan @Nama ke teks & menutup dropdown", async () => {
    const user = userEvent.setup();
    render(<CommentThread sampel={sampel} />);
    const textarea = screen.getByPlaceholderText(/Tulis komentar/);
    await user.type(textarea, "cc @Bu");
    await user.click(screen.getByRole("button", { name: "Budi Santoso" }));
    expect(textarea.value).toContain("@Budi Santoso ");
    expect(screen.queryByRole("button", { name: "Budi Santoso" })).not.toBeInTheDocument();
  });

  it("mention yang dipilih dari dropdown ikut dikirim di array mentions", async () => {
    const user = userEvent.setup();
    render(<CommentThread sampel={sampel} />);
    const textarea = screen.getByPlaceholderText(/Tulis komentar/);
    await user.type(textarea, "cc @Bu");
    await user.click(screen.getByRole("button", { name: "Budi Santoso" }));
    await user.click(screen.getByText("Kirim"));
    await waitFor(() =>
      expect(mockAddCommentFn).toHaveBeenCalledWith(
        expect.objectContaining({ mentions: ["budi@deera.id"] }),
      ),
    );
  });

  it("dropdown selalu menawarkan 'All' utk mention semua orang (permintaan Denny 2026-09: @all)", async () => {
    const user = userEvent.setup();
    render(<CommentThread sampel={sampel} />);
    const textarea = screen.getByPlaceholderText(/Tulis komentar/);
    await user.type(textarea, "cc @al");
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("mention @all mengirim mentions: ['*']", async () => {
    const user = userEvent.setup();
    render(<CommentThread sampel={sampel} />);
    const textarea = screen.getByPlaceholderText(/Tulis komentar/);
    await user.type(textarea, "cc @al");
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(textarea.value).toContain("@All ");
    await user.click(screen.getByText("Kirim"));
    await waitFor(() =>
      expect(mockAddCommentFn).toHaveBeenCalledWith(expect.objectContaining({ mentions: ["*"] })),
    );
  });
});

describe("CommentThread — upload foto", () => {
  it("upload foto sukses lalu kirim menyertakan imageUrl", async () => {
    const user = userEvent.setup();
    mockUploadMedia.mockResolvedValue({ url: "https://cld/uploaded.jpg" });
    const { container } = render(<CommentThread sampel={sampel} />);
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    await user.upload(fileInput, file);
    await waitFor(() => expect(mockUploadMedia).toHaveBeenCalled());
    // tunggu status jadi "done" sebelum tombol Kirim aktif tanpa teks
    await waitFor(() => expect(screen.getByText("Kirim")).not.toBeDisabled());
    await user.click(screen.getByText("Kirim"));
    await waitFor(() =>
      expect(mockAddCommentFn).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: "https://cld/uploaded.jpg" }),
      ),
    );
  });
});

describe("CommentThread — 'Dibaca oleh' ringkasan bawah thread (permintaan Denny 2026-09: siapa saja sudah membaca)", () => {
  const twoComments = [
    { id: "c1", user_name: "Admin", user_email: "admin@deera.id", text: "pertama", created_at: "2026-09-01T09:00:00Z" },
    { id: "c2", user_name: "Budi", user_email: "budi@deera.id", text: "kedua", created_at: "2026-09-01T10:00:00Z" },
  ];

  it("tidak menampilkan apapun kalau belum ada komentar sama sekali", () => {
    mockComments.mockReturnValue({ comments: [], loading: false });
    mockUseReadsBySampel.mockReturnValue({
      reads: [{ user_email: "budi@deera.id", user_name: "Budi", last_read_at: "2026-09-02T00:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.queryByTestId("thread-read-summary")).not.toBeInTheDocument();
  });

  it("ringkasan bawah tidak tampil kalau belum ada org lain yang baca sampai komentar terakhir", () => {
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      reads: [{ user_email: "budi@deera.id", user_name: "Budi", last_read_at: "2026-09-01T09:30:00Z" }], // sebelum c2
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.queryByTestId("thread-read-summary")).not.toBeInTheDocument();
  });

  it("ringkasan bawah menampilkan nama org lain (bukan penulis komentar terakhir) yang last_read_at >= komentar terakhir", () => {
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      // Citra bukan penulis c1 maupun c2 (komentar terakhir ditulis Budi).
      reads: [{ user_email: "citra@deera.id", user_name: "Citra", last_read_at: "2026-09-01T11:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByTestId("thread-read-summary")).toHaveTextContent(/Dibaca oleh Citra/);
  });

  // Permintaan Denny 2026-09: "kan jelas pesan haikalfwz saya sudah baca,
  // tapi ga ada infonya saya telah membaca" — viewer SAAT INI TIDAK lagi
  // di-exclude dari ringkasan (dulu sempat begitu, dikira redundan).
  it("ringkasan bawah TETAP menampilkan viewer saat ini kalau dia BUKAN penulis komentar terakhir", () => {
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      // current user = admin@deera.id (lihat mock useAuth di atas); komentar
      // terakhir (c2) ditulis Budi, bukan Admin — jadi Admin tetap tampil.
      reads: [{ user_email: "admin@deera.id", user_name: "Admin", last_read_at: "2026-09-01T11:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByTestId("thread-read-summary")).toHaveTextContent(/Dibaca oleh Admin/);
  });

  it("ringkasan bawah tidak menyertakan penulis komentar TERAKHIR itu sendiri", () => {
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      // Budi menulis c2 (komentar terakhir) — percuma bilang dia "sudah membaca" pesannya sendiri.
      reads: [{ user_email: "budi@deera.id", user_name: "Budi", last_read_at: "2026-09-01T11:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.queryByTestId("thread-read-summary")).not.toBeInTheDocument();
  });
});

describe("CommentThread — info terkirim/dibaca per-pesan, RINGKAS + klik utk lihat nama (permintaan Denny 2026-09: '...begitupun semua chat yang lain', lalu 'saya mau ada info aja yang baca dan yang sudah terkirim, bukan ceklis aja', lalu 'kalau sudah baca semua, bakal numpuk dong, lebih panjang info yang membacanya dari pada pesannya itu sendiri ... saya ingin tetap bisa mengetahui siapa saja yang sudah membaca pesannya')", () => {
  const twoComments = [
    { id: "c1", user_name: "Admin", user_email: "admin@deera.id", text: "pertama", created_at: "2026-09-01T09:00:00Z" },
    { id: "c2", user_name: "Budi", user_email: "budi@deera.id", text: "kedua", created_at: "2026-09-01T10:00:00Z" },
  ];

  it("menampilkan teks '✓ Terkirim' (bukan cuma ceklis) saat belum ada org lain yang baca pesan itu", () => {
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({ reads: [], loading: false });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByTestId("msg-read-c1")).toHaveTextContent("✓ Terkirim");
  });

  it("default RINGKAS: cuma '✓✓' tanpa nama saat sudah dibaca satu orang — nama TIDAK otomatis tampil", () => {
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      // Budi baru baca sampai 09:30 — sudah lewat c1 (09:00) tapi belum c2 (10:00)
      reads: [{ user_email: "budi@deera.id", user_name: "Budi", last_read_at: "2026-09-01T09:30:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByTestId("msg-read-c1")).toHaveTextContent("✓✓");
    expect(screen.queryByText(/Dibaca oleh Budi/)).not.toBeInTheDocument();
    expect(screen.getByTestId("msg-read-c2")).toHaveTextContent("✓ Terkirim");
    // Ringkasan bawah tetap tidak tampil karena belum sampai komentar terakhir.
    expect(screen.queryByTestId("thread-read-summary")).not.toBeInTheDocument();
  });

  it("klik indikator '✓✓' menampilkan nama pembaca — 'saya ingin tetap bisa mengetahui siapa saja yang sudah membaca'", async () => {
    const user = userEvent.setup();
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      reads: [{ user_email: "budi@deera.id", user_name: "Budi", last_read_at: "2026-09-01T09:30:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    await user.click(screen.getByTestId("msg-read-c1"));
    expect(screen.getByText(/Dibaca oleh Budi/)).toBeInTheDocument();
  });

  it("klik indikator sekali lagi menyembunyikan nama lagi (toggle)", async () => {
    const user = userEvent.setup();
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      reads: [{ user_email: "budi@deera.id", user_name: "Budi", last_read_at: "2026-09-01T09:30:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    const indicator = screen.getByTestId("msg-read-c1");
    await user.click(indicator);
    expect(screen.getByText(/Dibaca oleh Budi/)).toBeInTheDocument();
    await user.click(indicator);
    expect(screen.queryByText(/Dibaca oleh Budi/)).not.toBeInTheDocument();
  });

  it("klik indikator '✓ Terkirim' (belum ada yg baca) tidak melakukan apapun — tidak ada nama utk ditampilkan", async () => {
    const user = userEvent.setup();
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({ reads: [], loading: false });
    render(<CommentThread sampel={sampel} />);
    await user.click(screen.getByTestId("msg-read-c1"));
    expect(screen.getByTestId("msg-read-c1")).toHaveTextContent("✓ Terkirim");
  });

  it("menampilkan JUMLAH pembaca (bukan cuma centang polos) begitu lebih dari satu orang membaca — cegah numpuk", () => {
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      // c1 ditulis Admin — Budi & Citra (bukan penulis, bukan viewer) sama-sama berhak tampil.
      reads: [
        { user_email: "budi@deera.id", user_name: "Budi", last_read_at: "2026-09-01T09:30:00Z" },
        { user_email: "citra@deera.id", user_name: "Citra", last_read_at: "2026-09-01T09:30:00Z" },
      ],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByTestId("msg-read-c1")).toHaveTextContent("✓✓ 2");
  });

  it("klik pada indikator dgn banyak pembaca menampilkan SEMUA nama sekaligus", async () => {
    const user = userEvent.setup();
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      reads: [
        { user_email: "budi@deera.id", user_name: "Budi", last_read_at: "2026-09-01T09:30:00Z" },
        { user_email: "citra@deera.id", user_name: "Citra", last_read_at: "2026-09-01T09:30:00Z" },
      ],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    await user.click(screen.getByTestId("msg-read-c1"));
    const expanded = screen.getByText(/Dibaca oleh/);
    expect(expanded).toHaveTextContent(/Budi/);
    expect(expanded).toHaveTextContent(/Citra/);
  });

  it("info pesan sendiri tidak ikut 'terbaca' oleh penulisnya sendiri", () => {
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      // Budi (penulis c2) 'membaca' semuanya termasuk pesannya sendiri — jangan hitung di c2.
      reads: [{ user_email: "budi@deera.id", user_name: "Budi", last_read_at: "2026-09-01T10:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByTestId("msg-read-c1")).toHaveTextContent("✓✓");
    expect(screen.getByTestId("msg-read-c2")).toHaveTextContent("✓ Terkirim");
  });

  // Permintaan Denny 2026-09: "kan jelas pesan haikalfwz saya sudah baca,
  // tapi ga ada infonya saya telah membaca" — viewer SAAT INI TIDAK lagi
  // di-exclude dari info pesan org LAIN (dulu sempat begitu, dikira
  // redundan; ternyata Denny justru mau lihat konfirmasi ini).
  it("menampilkan viewer saat ini sbg pembaca di pesan ORANG LAIN, tapi tetap tidak di pesannya SENDIRI", async () => {
    const user = userEvent.setup();
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      // current user = admin@deera.id (lihat mock useAuth di atas), penulis c1.
      reads: [{ user_email: "admin@deera.id", user_name: "Admin", last_read_at: "2026-09-01T11:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    // c1 ditulis Admin sendiri — tetap "Terkirim" (percuma bilang Admin
    // "sudah membaca" pesannya sendiri).
    expect(screen.getByTestId("msg-read-c1")).toHaveTextContent("✓ Terkirim");
    // c2 ditulis Budi (org lain) — Admin (viewer) sudah baca → tampil (klik utk lihat nama).
    const c2Indicator = screen.getByTestId("msg-read-c2");
    expect(c2Indicator).toHaveTextContent("✓✓");
    await user.click(c2Indicator);
    // Scoped ke baris expand tepat di bawah indikator c2 (bukan ringkasan
    // bawah thread yang kebetulan juga menyebut "Admin").
    expect(c2Indicator.closest("div").nextElementSibling).toHaveTextContent(/Dibaca oleh Admin/);
  });

  it("info per-pesan (klik utk expand) tetap tampil bersamaan dengan ringkasan bawah saat sudah dibaca sampai pesan terakhir", () => {
    mockComments.mockReturnValue({ comments: twoComments, loading: false });
    mockUseReadsBySampel.mockReturnValue({
      // Citra (bukan penulis c1/c2) supaya juga lolos exclude di ringkasan bawah.
      reads: [{ user_email: "citra@deera.id", user_name: "Citra", last_read_at: "2026-09-01T11:00:00Z" }],
      loading: false,
    });
    render(<CommentThread sampel={sampel} />);
    expect(screen.getByTestId("msg-read-c1")).toHaveTextContent("✓✓");
    expect(screen.getByTestId("thread-read-summary")).toBeInTheDocument();
  });
});
