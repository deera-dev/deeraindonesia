import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PhotoLightbox from "./PhotoLightbox";

const media = [
  { type: "image", src: "a.jpg" },
  { type: "image", src: "b.jpg" },
  { type: "image", src: "c.jpg" },
];

describe("PhotoLightbox", () => {
  it("tidak render apa pun saat index null", () => {
    const { container } = render(
      <PhotoLightbox media={media} index={null} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("render foto sesuai index", () => {
    const { container } = render(
      <PhotoLightbox media={media} index={1} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "b.jpg");
  });

  it("tap foto men-toggle zoom (scale 1 -> 2.2 -> 1)", () => {
    const { container } = render(
      <PhotoLightbox media={media} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    const img = container.querySelector("img");
    expect(img.style.transform).toBe("scale(1)");

    fireEvent.click(img);
    expect(img.style.transform).toBe("scale(2.2)");

    fireEvent.click(img);
    expect(img.style.transform).toBe("scale(1)");
  });

  it("tombol tutup memanggil onClose", () => {
    const onClose = vi.fn();
    render(<PhotoLightbox media={media} index={0} onClose={onClose} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Tutup galeri" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("klik area backdrop (bukan foto) juga memanggil onClose", () => {
    const onClose = vi.fn();
    const { container } = render(
      <PhotoLightbox media={media} index={0} onClose={onClose} onNavigate={vi.fn()} />
    );
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("tombol sebelumnya/berikutnya muncul di tengah, hilang di ujung, & memanggil onNavigate", () => {
    const onNavigate = vi.fn();
    const { rerender } = render(
      <PhotoLightbox media={media} index={1} onClose={vi.fn()} onNavigate={onNavigate} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Sebelumnya" }));
    expect(onNavigate).toHaveBeenCalledWith(-1);
    fireEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(onNavigate).toHaveBeenCalledWith(1);

    rerender(<PhotoLightbox media={media} index={0} onClose={vi.fn()} onNavigate={onNavigate} />);
    expect(screen.queryByRole("button", { name: "Sebelumnya" })).toBeNull();

    rerender(<PhotoLightbox media={media} index={2} onClose={vi.fn()} onNavigate={onNavigate} />);
    expect(screen.queryByRole("button", { name: "Berikutnya" })).toBeNull();
  });

  it("menampilkan indikator posisi X / Y hanya saat item lebih dari satu", () => {
    const { rerender } = render(
      <PhotoLightbox media={media} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    rerender(
      <PhotoLightbox
        media={[{ type: "image", src: "a.jpg" }]}
        index={0}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.queryByText("1 / 1")).toBeNull();
  });

  it("reset zoom saat index berubah", () => {
    const { container, rerender } = render(
      <PhotoLightbox media={media} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    const img0 = container.querySelector("img");
    fireEvent.click(img0);
    expect(img0.style.transform).toBe("scale(2.2)");

    rerender(<PhotoLightbox media={media} index={1} onClose={vi.fn()} onNavigate={vi.fn()} />);
    const img1 = container.querySelector("img");
    expect(img1.style.transform).toBe("scale(1)");
  });
});

describe("PhotoLightbox — slide video", () => {
  const mixedMedia = [
    { type: "image", src: "a.jpg" },
    { type: "video", src: "produk.mp4", poster: "produk-poster.jpg" },
  ];

  it("render <video> dengan poster & controls saat item type video, bukan <img>", () => {
    const { container } = render(
      <PhotoLightbox media={mixedMedia} index={1} onClose={vi.fn()} onNavigate={vi.fn()} />
    );
    const video = container.querySelector("video");
    expect(video).toHaveAttribute("src", "produk.mp4");
    expect(video).toHaveAttribute("poster", "produk-poster.jpg");
    expect(video).toHaveAttribute("controls");
    expect(container.querySelector("img")).toBeNull();
  });

  it("klik video tidak memicu onClose (stopPropagation)", () => {
    const onClose = vi.fn();
    const { container } = render(
      <PhotoLightbox media={mixedMedia} index={1} onClose={onClose} onNavigate={vi.fn()} />
    );
    fireEvent.click(container.querySelector("video"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("navigasi Sebelumnya dari slide video ke slide foto tetap berfungsi", () => {
    const onNavigate = vi.fn();
    render(
      <PhotoLightbox media={mixedMedia} index={1} onClose={vi.fn()} onNavigate={onNavigate} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Sebelumnya" }));
    expect(onNavigate).toHaveBeenCalledWith(-1);
  });
});
