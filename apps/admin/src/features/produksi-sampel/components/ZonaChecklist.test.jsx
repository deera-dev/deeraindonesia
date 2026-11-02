import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ZonaChecklist from "./ZonaChecklist";
import { WO_ZONA, emptyZonaCatatan } from "../utils";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => url ?? "",
}));

function setup(overrides = {}) {
  const onChange = vi.fn();
  const zona = { ...emptyZonaCatatan(), ...overrides.zona };
  const utils = render(
    <ZonaChecklist
      zona={zona}
      onChange={onChange}
      photos={overrides.photos ?? ["https://cloud/a.jpg"]}
      disabled={overrides.disabled}
    />,
  );
  return { onChange, zona, ...utils };
}

describe("ZonaChecklist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menampilkan 7 baris sesuai WO_ZONA dengan label yang benar", () => {
    setup();
    for (const z of WO_ZONA) {
      expect(screen.getByTestId(`zona-row-${z.key}`)).toBeInTheDocument();
      expect(screen.getByText(z.label)).toBeInTheDocument();
    }
  });

  it("textarea tiap zona kosong punya placeholder 'Sama seperti foto patokan'", () => {
    setup();
    const placeholders = screen.getAllByPlaceholderText("Sama seperti foto patokan");
    expect(placeholders).toHaveLength(WO_ZONA.length);
  });

  it("ketik di textarea zona memanggil onChange(key, {...entry, catatan})", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    const row = screen.getByTestId("zona-row-dada");
    await user.type(row.querySelector("textarea"), "X");
    expect(onChange).toHaveBeenCalledWith("dada", { catatan: "X", crop: null, motif: null, aktif: true });
  });

  it("tanpa foto kandidat, tombol '+ Foto' tidak muncul untuk zona kosong", () => {
    setup({ photos: [] });
    expect(screen.queryByText("+ Foto")).not.toBeInTheDocument();
  });

  it("ada foto kandidat, tombol '+ Foto' muncul untuk zona tanpa crop", () => {
    setup();
    expect(screen.getAllByText("+ Foto")).toHaveLength(WO_ZONA.length);
  });

  it("klik '+ Foto' membuka ZonaCropModal dengan label zona yang benar", async () => {
    const user = userEvent.setup();
    setup();
    const row = screen.getByTestId("zona-row-lengan");
    await user.click(row.querySelector("button"));
    expect(screen.getByText(/Potongan Foto — Lengan/)).toBeInTheDocument();
  });

  it("zona dengan crop menampilkan thumbnail (bukan tombol '+ Foto') dan tombol hapus", () => {
    setup({
      zona: {
        pundak: { catatan: "", crop: { url: "https://cloud/a.jpg", x: 0.1, y: 0.1, width: 0.2, height: 0.2 } },
      },
    });
    const row = screen.getByTestId("zona-row-pundak");
    expect(row.querySelector("img")).toBeInTheDocument();
    expect(screen.getByLabelText("Hapus potongan foto Pundak")).toBeInTheDocument();
  });

  it("klik tombol hapus crop memanggil onChange dgn crop: null, tidak membuka modal crop", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({
      zona: {
        pundak: { catatan: "catatan pundak", crop: { url: "https://cloud/a.jpg", x: 0.1, y: 0.1, width: 0.2, height: 0.2 } },
      },
    });
    await user.click(screen.getByLabelText("Hapus potongan foto Pundak"));
    expect(onChange).toHaveBeenCalledWith("pundak", { catatan: "catatan pundak", crop: null });
    expect(screen.queryByText(/Potongan Foto/)).not.toBeInTheDocument();
  });

  it("konfirmasi di ZonaCropModal memanggil onChange dgn crop baru dan menutup modal", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ photos: ["https://cloud/a.jpg"] });
    const row = screen.getByTestId("zona-row-dada");
    await user.click(row.querySelector("button"));
    expect(screen.getByText(/Potongan Foto — Dada/)).toBeInTheDocument();

    const stage = screen.getByTestId("zona-crop-stage");
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => {},
    });
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.pointerDown(stage, { clientX: 20, clientY: 10 });
    fireEvent.pointerMove(stage, { clientX: 100, clientY: 60 });
    fireEvent.pointerUp(stage, { clientX: 100, clientY: 60 });
    await user.click(screen.getByText("Pakai Potongan Ini"));

    expect(onChange).toHaveBeenCalledWith("dada", {
      catatan: "",
      crop: { url: "https://cloud/a.jpg", x: 0.1, y: 0.1, width: 0.4, height: 0.5 },
      motif: null,
      aktif: true,
    });
    expect(screen.queryByText(/Potongan Foto — Dada/)).not.toBeInTheDocument();
  });

  it("tiap zona menampilkan capsule Motif/Polos, keduanya tidak aktif secara default", () => {
    setup();
    const capsule = screen.getByTestId("zona-motif-dada");
    const [motifBtn, polosBtn] = capsule.querySelectorAll("button");
    expect(motifBtn).toHaveTextContent("Motif");
    expect(polosBtn).toHaveTextContent("Polos");
    expect(motifBtn.className).not.toContain("bg-amber-500");
    expect(polosBtn.className).not.toContain("bg-slate-600");
  });

  it("klik capsule Motif -> onChange dgn motif: 'motif', capsule Motif jadi aktif", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    const capsule = screen.getByTestId("zona-motif-lengan");
    await user.click(capsule.querySelectorAll("button")[0]);
    expect(onChange).toHaveBeenCalledWith("lengan", { catatan: "", crop: null, motif: "motif", aktif: true });
  });

  it("klik capsule Polos lalu klik Polos lagi -> toggle balik ke null (batal pilih)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const zona = { ...emptyZonaCatatan(), bawah: { catatan: "", crop: null, motif: "polos" } };
    render(<ZonaChecklist zona={zona} onChange={onChange} photos={["https://cloud/a.jpg"]} />);
    const capsule = screen.getByTestId("zona-motif-bawah");
    await user.click(capsule.querySelectorAll("button")[1]);
    expect(onChange).toHaveBeenCalledWith("bawah", { catatan: "", crop: null, motif: null });
  });

  it("klik capsule Polos saat Motif aktif -> ganti ke polos (bukan toggle gabungan)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const zona = { ...emptyZonaCatatan(), samping: { catatan: "", crop: null, motif: "motif" } };
    render(<ZonaChecklist zona={zona} onChange={onChange} photos={["https://cloud/a.jpg"]} />);
    const capsule = screen.getByTestId("zona-motif-samping");
    await user.click(capsule.querySelectorAll("button")[1]);
    expect(onChange).toHaveBeenCalledWith("samping", { catatan: "", crop: null, motif: "polos" });
  });

  it("disabled=true menonaktifkan capsule Motif/Polos juga", () => {
    setup({ disabled: true });
    const capsule = screen.getByTestId("zona-motif-dada");
    for (const btn of capsule.querySelectorAll("button")) expect(btn).toBeDisabled();
  });

  it("disabled=true menonaktifkan semua textarea dan tombol '+ Foto'", () => {
    setup({ disabled: true });
    const row = screen.getByTestId("zona-row-dada");
    expect(row.querySelector("textarea")).toBeDisabled();
    expect(row.querySelector("button")).toBeDisabled();
  });

  describe("toggle on/off per zona (Denny 2026-11-02: 'kalau off tidak muncul di print A4')", () => {
    it("semua zona default aktif (switch checked)", () => {
      setup();
      for (const z of WO_ZONA) {
        const row = screen.getByTestId(`zona-row-${z.key}`);
        expect(row.querySelector('[role="switch"]')).toHaveAttribute("aria-checked", "true");
      }
    });

    it("klik switch -> onChange dgn aktif: false", async () => {
      const user = userEvent.setup();
      const { onChange } = setup();
      const row = screen.getByTestId("zona-row-dada");
      await user.click(row.querySelector('[role="switch"]'));
      expect(onChange).toHaveBeenCalledWith("dada", {
        catatan: "",
        crop: null,
        motif: null,
        aktif: false,
      });
    });

    it("zona dengan aktif: false tampil redup (opacity-50) dan switch unchecked", () => {
      setup({ zona: { bawah: { catatan: "ini malay", crop: null, motif: null, aktif: false } } });
      const row = screen.getByTestId("zona-row-bawah");
      expect(row.className).toContain("opacity-50");
      expect(row.querySelector('[role="switch"]')).toHaveAttribute("aria-checked", "false");
    });

    it("klik switch pada zona yang off -> onChange dgn aktif: true (toggle balik)", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const zona = { ...emptyZonaCatatan(), pundak: { catatan: "", crop: null, motif: null, aktif: false } };
      render(<ZonaChecklist zona={zona} onChange={onChange} photos={["https://cloud/a.jpg"]} />);
      const row = screen.getByTestId("zona-row-pundak");
      await user.click(row.querySelector('[role="switch"]'));
      expect(onChange).toHaveBeenCalledWith("pundak", { catatan: "", crop: null, motif: null, aktif: true });
    });

    it("disabled=true menonaktifkan switch juga", () => {
      setup({ disabled: true });
      const row = screen.getByTestId("zona-row-dada");
      expect(row.querySelector('[role="switch"]')).toBeDisabled();
    });
  });
});
