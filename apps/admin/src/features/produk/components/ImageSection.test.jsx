import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImageSection from "./ImageSection";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url, opts) => `cld:${url}:${opts?.width ?? ""}`,
}));

global.URL.createObjectURL = vi.fn(() => "blob://preview");

function renderSection(overrides = {}) {
  return render(
    <ImageSection
      mainImage={null}
      setMainImage={vi.fn()}
      seriWarnaImage={null}
      setSeriWarnaImage={vi.fn()}
      detailImages={[]}
      setDetailImages={vi.fn()}
      saving={false}
      {...overrides}
    />,
  );
}

describe("ImageSection", () => {
  describe("mainImage", () => {
    it("menampilkan upload label saat mainImage null", () => {
      renderSection();
      expect(screen.getAllByText("Upload").length).toBeGreaterThanOrEqual(1);
    });

    it("menampilkan preview saat mainImage bertipe url, pakai cldUrl", () => {
      renderSection({ mainImage: { type: "url", url: "main.jpg" } });
      const img = screen.getByAltText("Preview");
      expect(img).toHaveAttribute("src", "cld:main.jpg:400");
    });

    it("menampilkan preview saat mainImage bertipe file, pakai mainImage.preview", () => {
      renderSection({ mainImage: { type: "file", file: {}, preview: "blob://test" } });
      const img = screen.getByAltText("Preview");
      expect(img).toHaveAttribute("src", "blob://test");
    });

    it("tombol hapus foto utama memanggil setMainImage(null)", () => {
      const setMainImage = vi.fn();
      renderSection({
        mainImage: { type: "url", url: "main.jpg" },
        setMainImage,
      });
      fireEvent.click(screen.getByRole("button", { name: "×" }));
      expect(setMainImage).toHaveBeenCalledWith(null);
    });

    it("tombol hapus foto utama disabled saat saving=true", () => {
      renderSection({
        mainImage: { type: "url", url: "main.jpg" },
        saving: true,
      });
      expect(screen.getByRole("button", { name: "×" })).toBeDisabled();
    });

    it("handleMainChange: no-op jika tidak ada file dipilih", () => {
      const setMainImage = vi.fn();
      renderSection({ setMainImage });
      const fileInput = document.querySelector('input[type="file"]:not([multiple])');
      fireEvent.change(fileInput, { target: { files: [] } });
      expect(setMainImage).not.toHaveBeenCalled();
    });

    it("handleMainChange: setMainImage dengan {type:file, file, preview} saat file dipilih (async, di bawah limit -> tanpa kompresi)", async () => {
      const setMainImage = vi.fn();
      renderSection({ setMainImage });
      const file = new File([""], "main.png", { type: "image/png" });
      const fileInput = document.querySelector('input[type="file"]:not([multiple])');
      fireEvent.change(fileInput, { target: { files: [file] } });
      await waitFor(() =>
        expect(setMainImage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "file",
            file,
            preview: "blob://preview",
            status: "done",
            compressed: false,
          }),
        ),
      );
    });
  });

  describe("seriWarnaImage", () => {
    it("menampilkan upload label saat seriWarnaImage null", () => {
      renderSection();
      expect(screen.getAllByText("Upload").length).toBe(2);
    });

    it("menampilkan preview saat seriWarnaImage bertipe url, pakai cldUrl", () => {
      renderSection({ seriWarnaImage: { type: "url", url: "seri.jpg" } });
      const imgs = screen.getAllByAltText("Preview");
      const seriImg = imgs.find((img) => img.getAttribute("src") === "cld:seri.jpg:400");
      expect(seriImg).toBeTruthy();
    });

    it("menampilkan preview saat seriWarnaImage bertipe file, pakai seriWarnaImage.preview", () => {
      renderSection({ seriWarnaImage: { type: "file", file: {}, preview: "blob://seri-test" } });
      const imgs = screen.getAllByAltText("Preview");
      const seriImg = imgs.find((img) => img.getAttribute("src") === "blob://seri-test");
      expect(seriImg).toBeTruthy();
    });

    it("tombol hapus foto seri warna memanggil setSeriWarnaImage(null)", () => {
      const setSeriWarnaImage = vi.fn();
      renderSection({
        seriWarnaImage: { type: "url", url: "seri.jpg" },
        setSeriWarnaImage,
      });
      fireEvent.click(screen.getByRole("button", { name: "×" }));
      expect(setSeriWarnaImage).toHaveBeenCalledWith(null);
    });

    it("tombol hapus foto seri warna disabled saat saving=true", () => {
      renderSection({
        seriWarnaImage: { type: "url", url: "seri.jpg" },
        saving: true,
      });
      expect(screen.getByRole("button", { name: "×" })).toBeDisabled();
    });

    it("handleSeriWarnaChange: no-op jika tidak ada file dipilih", () => {
      const setSeriWarnaImage = vi.fn();
      renderSection({ setSeriWarnaImage });
      const fileInputs = document.querySelectorAll('input[type="file"]:not([multiple])');
      fireEvent.change(fileInputs[1], { target: { files: [] } });
      expect(setSeriWarnaImage).not.toHaveBeenCalled();
    });

    it("handleSeriWarnaChange: setSeriWarnaImage dengan {type:file, file, preview} saat file dipilih (async, di bawah limit -> tanpa kompresi)", async () => {
      const setSeriWarnaImage = vi.fn();
      renderSection({ setSeriWarnaImage });
      const file = new File([""], "seri.png", { type: "image/png" });
      const fileInputs = document.querySelectorAll('input[type="file"]:not([multiple])');
      fireEvent.change(fileInputs[1], { target: { files: [file] } });
      await waitFor(() =>
        expect(setSeriWarnaImage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "file",
            file,
            preview: "blob://preview",
            status: "done",
            compressed: false,
          }),
        ),
      );
    });
  });

  describe("detailImages", () => {
    it("menampilkan jumlah foto detail di label", () => {
      const details = [
        { type: "url", url: "d1.jpg" },
        { type: "url", url: "d2.jpg" },
      ];
      renderSection({ detailImages: details });
      expect(screen.getByText(/\(2 foto\)/)).toBeInTheDocument();
    });

    it("menampilkan preview detail bertipe url via cldUrl", () => {
      renderSection({
        detailImages: [{ type: "url", url: "d1.jpg" }],
      });
      const imgs = screen.getAllByAltText(/Detail/);
      expect(imgs[0]).toHaveAttribute("src", "cld:d1.jpg:300");
    });

    it("menampilkan preview detail bertipe file via preview url", () => {
      renderSection({
        detailImages: [{ type: "file", file: {}, preview: "blob://d1" }],
      });
      const imgs = screen.getAllByAltText(/Detail/);
      expect(imgs[0]).toHaveAttribute("src", "blob://d1");
    });

    it("handleDetailAdd: no-op jika tidak ada file dipilih", () => {
      const setDetailImages = vi.fn();
      renderSection({ setDetailImages });
      const multiInput = document.querySelector('input[type="file"][multiple]');
      fireEvent.change(multiInput, { target: { files: [] } });
      expect(setDetailImages).not.toHaveBeenCalled();
    });

    it("handleDetailAdd: appends file objects ke detailImages & reset value (async, di bawah limit -> tanpa placeholder)", async () => {
      const setDetailImages = vi.fn();
      const existingDetails = [{ type: "url", url: "existing.jpg" }];
      renderSection({ detailImages: existingDetails, setDetailImages });
      const file = new File([""], "new.jpg", { type: "image/jpeg" });
      const multiInput = document.querySelector('input[type="file"][multiple]');
      fireEvent.change(multiInput, { target: { files: [file] } });

      await waitFor(() => expect(setDetailImages).toHaveBeenCalled());
      const updater = setDetailImages.mock.calls[0][0];
      const result = updater(existingDetails);
      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({
        type: "file",
        file,
        preview: "blob://preview",
        status: "done",
      });
    });

    it("removeDetail: memanggil setDetailImages untuk filter index yang dihapus", () => {
      const setDetailImages = vi.fn();
      const details = [
        { type: "url", url: "d1.jpg" },
        { type: "url", url: "d2.jpg" },
      ];
      renderSection({ detailImages: details, setDetailImages });
      const hapusButtons = screen.getAllByRole("button", { name: "×" });
      fireEvent.click(hapusButtons[0]);
      const updater = setDetailImages.mock.calls[0][0];
      const result = updater(details);
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("d2.jpg");
    });

    it("tombol hapus detail disabled saat saving=true", () => {
      renderSection({
        detailImages: [{ type: "url", url: "d1.jpg" }],
        saving: true,
      });
      const hapusBtn = screen.getAllByRole("button", { name: "×" })[0];
      expect(hapusBtn).toBeDisabled();
    });

    it("moveDetail: swap posisi via setDetailImages (dir=1 & dir=-1)", () => {
      const setDetailImages = vi.fn();
      const details = [
        { type: "url", url: "d1.jpg" },
        { type: "url", url: "d2.jpg" },
        { type: "url", url: "d3.jpg" },
      ];
      renderSection({ detailImages: details, setDetailImages });

      const rightButtons = screen.getAllByRole("button", { name: "→" });
      fireEvent.click(rightButtons[1]);

      const updater1 = setDetailImages.mock.calls[0][0];
      const result1 = updater1(details);
      expect(result1[1].url).toBe("d3.jpg");
      expect(result1[2].url).toBe("d2.jpg");

      setDetailImages.mockClear();

      const leftButtons = screen.getAllByRole("button", { name: "←" });
      fireEvent.click(leftButtons[1]);
      const updater2 = setDetailImages.mock.calls[0][0];
      const result2 = updater2(details);
      expect(result2[0].url).toBe("d2.jpg");
      expect(result2[1].url).toBe("d1.jpg");
    });

    it("moveDetail: tombol ← disabled pada item pertama, → disabled pada item terakhir", () => {
      renderSection({
        detailImages: [
          { type: "url", url: "d1.jpg" },
          { type: "url", url: "d2.jpg" },
        ],
      });
      const leftButtons = screen.getAllByRole("button", { name: "←" });
      const rightButtons = screen.getAllByRole("button", { name: "→" });
      expect(leftButtons[0]).toBeDisabled();
      expect(leftButtons[1]).not.toBeDisabled();
      expect(rightButtons[0]).not.toBeDisabled();
      expect(rightButtons[1]).toBeDisabled();
    });

    it("moveDetail: no-op (return arr unchanged) saat target index out of bounds", () => {
      const setDetailImages = vi.fn();
      const details = [{ type: "url", url: "only.jpg" }];
      renderSection({ detailImages: details, setDetailImages });

      expect(setDetailImages).not.toHaveBeenCalled();
    });

    it("semua tombol navigasi detail disabled saat saving=true", () => {
      renderSection({
        detailImages: [
          { type: "url", url: "d1.jpg" },
          { type: "url", url: "d2.jpg" },
        ],
        saving: true,
      });
      screen.getAllByRole("button", { name: "←" }).forEach((btn) => expect(btn).toBeDisabled());
      screen.getAllByRole("button", { name: "→" }).forEach((btn) => expect(btn).toBeDisabled());
    });
  });
});
