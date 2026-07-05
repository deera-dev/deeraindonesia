import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import BackToTop from "./BackToTop";

describe("BackToTop (mode window)", () => {
  beforeEach(() => {
    window.scrollY = 0;
    window.scrollTo.mockClear?.();
  });

  it("tidak render tombol saat scroll masih di bawah threshold", () => {
    render(<BackToTop />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("muncul setelah window scroll melewati threshold default (300)", () => {
    render(<BackToTop />);
    window.scrollY = 400;
    fireEvent.scroll(window);
    expect(screen.getByRole("button", { name: "Kembali ke atas" })).toBeInTheDocument();
  });

  it("klik tombol memanggil window.scrollTo({ top: 0, behavior: 'smooth' })", () => {
    render(<BackToTop />);
    window.scrollY = 400;
    fireEvent.scroll(window);

    fireEvent.click(screen.getByRole("button"));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("memakai threshold custom", () => {
    render(<BackToTop threshold={50} />);
    window.scrollY = 60;
    fireEvent.scroll(window);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("sembunyi lagi saat scroll kembali ke bawah threshold", () => {
    render(<BackToTop />);
    window.scrollY = 400;
    fireEvent.scroll(window);
    expect(screen.getByRole("button")).toBeInTheDocument();

    window.scrollY = 0;
    fireEvent.scroll(window);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("memakai className kustom jika diberikan (override default right-4)", () => {
    render(<BackToTop className="left-4" />);
    window.scrollY = 400;
    fireEvent.scroll(window);
    expect(screen.getByRole("button").className).toContain("left-4");
    expect(screen.getByRole("button").className).not.toContain("right-4");
  });

  it("memakai bottomClass kustom", () => {
    render(<BackToTop bottomClass="bottom-20" />);
    window.scrollY = 400;
    fireEvent.scroll(window);
    expect(screen.getByRole("button").className).toContain("bottom-20");
  });

  it("listener scroll dilepas saat unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BackToTop />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    removeSpy.mockRestore();
  });
});

describe("BackToTop (mode scrollEl)", () => {
  function Wrapper({ threshold }) {
    const ref = createRef();
    return (
      <div>
        <div data-testid="scroll-box" ref={ref} style={{ overflow: "auto" }}>
          inner
        </div>
        <BackToTop scrollEl={ref} threshold={threshold} />
      </div>
    );
  }

  it("memakai el.scrollTop, bukan window.scrollY, saat scrollEl diberikan", () => {
    render(<Wrapper />);
    const box = screen.getByTestId("scroll-box");
    Object.defineProperty(box, "scrollTop", { value: 500, configurable: true });

    fireEvent.scroll(box);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("klik tombol memanggil el.scrollTo saat scrollEl diberikan", () => {
    render(<Wrapper />);
    const box = screen.getByTestId("scroll-box");
    Object.defineProperty(box, "scrollTop", { value: 500, configurable: true });
    box.scrollTo = vi.fn();
    fireEvent.scroll(box);

    fireEvent.click(screen.getByRole("button"));

    expect(box.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("cek awal saat mount: visible true jika scrollTop sudah > threshold sebelum event apa pun", () => {
    function PreScrolled() {
      const ref = createRef();
      return (
        <div>
          <div
            data-testid="scroll-box2"
            ref={(node) => {
              if (node) Object.defineProperty(node, "scrollTop", { value: 999, configurable: true });
              ref.current = node;
            }}
          />
          <BackToTop scrollEl={ref} />
        </div>
      );
    }
    render(<PreScrolled />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
