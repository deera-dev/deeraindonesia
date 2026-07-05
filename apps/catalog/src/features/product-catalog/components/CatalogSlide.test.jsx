import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CatalogSlide from "./CatalogSlide";

let ioCallback;
let ioInstances;

class FakeIntersectionObserver {
  constructor(cb) {
    ioCallback = cb;
    ioInstances.push(this);
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  ioInstances = [];
  window.IntersectionObserver = FakeIntersectionObserver;
});

function renderSlide(props) {
  return render(
    <MemoryRouter>
      <CatalogSlide {...props} />
    </MemoryRouter>
  );
}

const baseModel = { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi" };

describe("CatalogSlide", () => {
  it("render kode & nama produk, img loading lazy saat bukan slide pertama", () => {
    renderSlide({ model: baseModel, isLast: false });
    expect(screen.getAllByText("D-07-OSK").length).toBeGreaterThan(0);
    const img = screen.getByAltText("Gamis Dewi");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("fetchpriority", "auto");
  });

  it("img loading eager saat model.index === 0 (slide pertama)", () => {
    renderSlide({ model: { ...baseModel, index: 0 }, isLast: false });
    const img = screen.getByAltText("Gamis Dewi");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("tidak render badge SOLD OUT saat soldOut=false", () => {
    renderSlide({ model: baseModel, isLast: false, soldOut: false });
    expect(screen.queryByText("SOLD OUT")).toBeNull();
  });

  it("render badge SOLD OUT (desktop+mobile) saat soldOut=true", () => {
    renderSlide({ model: baseModel, isLast: false, soldOut: true });
    expect(screen.getAllByText("SOLD OUT").length).toBe(2);
  });

  it("tidak render badge ukuran saat model.variants kosong/tidak ada", () => {
    const { container } = renderSlide({ model: baseModel, isLast: false });
    expect(container.querySelector(".flex-wrap.gap-2")).toBeNull();
  });

  it("render badge ukuran (desktop+mobile) saat model.variants ada", () => {
    renderSlide({
      model: { ...baseModel, variants: [{ size: "Midi" }, { size: "Gamis Jumbo" }] },
      isLast: false,
    });
    expect(screen.getAllByText("Midi").length).toBe(2);
    expect(screen.getAllByText("Gamis Jumbo").length).toBe(2);
  });

  it("render dot indicator mobile saat isLast=false, sembunyi saat isLast=true", () => {
    const { container: c1 } = renderSlide({ model: baseModel, isLast: false });
    expect(c1.querySelector(".animate-pulse")).toBeTruthy();

    const { container: c2 } = renderSlide({ model: { ...baseModel, kode: "D-08-OSK" }, isLast: true });
    expect(c2.querySelector(".animate-pulse")).toBeNull();
  });

  it("Link mengarah ke /code/:kode dengan aria-label berisi nama produk", () => {
    renderSlide({ model: baseModel, isLast: false });
    const link = screen.getByRole("link", { name: "Lihat detail Gamis Dewi" });
    expect(link).toHaveAttribute("href", "/code/D-07-OSK");
  });

  it("opacity img berubah dari intersection observer callback (active state)", () => {
    const { container } = renderSlide({ model: baseModel, isLast: false });
    // awalnya bukan slide pertama -> active=false -> opacity 0
    const img = screen.getByAltText("Gamis Dewi");
    expect(img.style.opacity).toBe("0");

    act(() => {
      ioCallback([{ isIntersecting: true }]);
    });
    expect(img.style.opacity).toBe("1");

    act(() => {
      ioCallback([{ isIntersecting: false }]);
    });
    expect(img.style.opacity).toBe("0");

    expect(ioInstances[0].observe).toHaveBeenCalled();
  });

  it("disconnect observer saat unmount", () => {
    const { unmount } = renderSlide({ model: baseModel, isLast: false });
    const instance = ioInstances[0];
    unmount();
    expect(instance.disconnect).toHaveBeenCalledTimes(1);
  });
});
