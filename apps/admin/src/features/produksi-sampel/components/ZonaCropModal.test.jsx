import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ZonaCropModal from "./ZonaCropModal";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url, opts) => `${url}?${JSON.stringify(opts ?? {})}`,
}));

function mockStageRect(el, rect = { left: 0, top: 0, width: 200, height: 100 }) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => {},
  });
}

function drag(stage, from, to) {
  fireEvent.pointerDown(stage, { clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(stage, { clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(stage, { clientX: to.x, clientY: to.y });
}

describe("ZonaCropModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dengan 1 foto kandidat, langsung ke tahap crop (tidak ada picker foto)", () => {
    render(
      <ZonaCropModal zonaLabel="Dada" photos={["https://cloud/a.jpg"]} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByTestId("zona-crop-foto-picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("zona-crop-stage")).toBeInTheDocument();
  });

  it("dengan >1 foto kandidat, tampil picker dulu; pilih salah satu -> lanjut ke tahap crop", async () => {
    const user = userEvent.setup();
    render(
      <ZonaCropModal
        zonaLabel="Lengan"
        photos={["https://cloud/a.jpg", "https://cloud/b.jpg"]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const picker = screen.getByTestId("zona-crop-foto-picker");
    expect(picker.querySelectorAll("button")).toHaveLength(2);
    await user.click(picker.querySelectorAll("button")[1]);
    expect(screen.getByTestId("zona-crop-stage")).toBeInTheDocument();
  });

  it("tombol Pakai Potongan Ini disabled sebelum ada rect digambar", () => {
    render(
      <ZonaCropModal zonaLabel="Dada" photos={["https://cloud/a.jpg"]} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText("Pakai Potongan Ini")).toBeDisabled();
  });

  it("drag di stage menggambar rect & menghitung fraksi 0-1 relatif terhadap bounding box", () => {
    render(
      <ZonaCropModal zonaLabel="Dada" photos={["https://cloud/a.jpg"]} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const stage = screen.getByTestId("zona-crop-stage");
    mockStageRect(stage, { left: 0, top: 0, width: 200, height: 100 });

    drag(stage, { x: 20, y: 10 }, { x: 100, y: 60 });

    const rect = screen.getByTestId("zona-crop-rect");
    expect(rect).toHaveStyle({ left: "10%", top: "10%", width: "40%", height: "50%" });
    expect(screen.getByText("Pakai Potongan Ini")).not.toBeDisabled();
  });

  it("rect terlalu kecil (di bawah MIN_RECT) dianggap batal, tombol Pakai tetap disabled", () => {
    render(
      <ZonaCropModal zonaLabel="Dada" photos={["https://cloud/a.jpg"]} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const stage = screen.getByTestId("zona-crop-stage");
    mockStageRect(stage, { left: 0, top: 0, width: 200, height: 100 });

    drag(stage, { x: 10, y: 10 }, { x: 11, y: 11 });

    expect(screen.queryByTestId("zona-crop-rect")).not.toBeInTheDocument();
    expect(screen.getByText("Pakai Potongan Ini")).toBeDisabled();
  });

  it("klik Pakai Potongan Ini memanggil onConfirm dengan {url, x, y, width, height}", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ZonaCropModal zonaLabel="Dada" photos={["https://cloud/a.jpg"]} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );
    const stage = screen.getByTestId("zona-crop-stage");
    mockStageRect(stage, { left: 0, top: 0, width: 200, height: 100 });
    drag(stage, { x: 20, y: 10 }, { x: 100, y: 60 });

    await user.click(screen.getByText("Pakai Potongan Ini"));

    expect(onConfirm).toHaveBeenCalledWith({
      url: "https://cloud/a.jpg",
      x: 0.1,
      y: 0.1,
      width: 0.4,
      height: 0.5,
    });
  });

  it("klik Batal atau backdrop memanggil onCancel", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <ZonaCropModal zonaLabel="Dada" photos={["https://cloud/a.jpg"]} onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    await user.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("initialUrl & initialCrop melewati tahap picker dan prefill rect", () => {
    render(
      <ZonaCropModal
        zonaLabel="Dada"
        photos={["https://cloud/a.jpg", "https://cloud/b.jpg"]}
        initialUrl="https://cloud/b.jpg"
        initialCrop={{ x: 0.2, y: 0.2, width: 0.3, height: 0.3 }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("zona-crop-foto-picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("zona-crop-rect")).toBeInTheDocument();
    expect(screen.getByText("Pakai Potongan Ini")).not.toBeDisabled();
  });

  it("tombol Ganti foto (kalau >1 kandidat) kembali ke tahap picker & reset rect", async () => {
    const user = userEvent.setup();
    render(
      <ZonaCropModal
        zonaLabel="Dada"
        photos={["https://cloud/a.jpg", "https://cloud/b.jpg"]}
        initialUrl="https://cloud/a.jpg"
        initialCrop={{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByText("Ganti foto"));
    expect(screen.getByTestId("zona-crop-foto-picker")).toBeInTheDocument();
  });
});
